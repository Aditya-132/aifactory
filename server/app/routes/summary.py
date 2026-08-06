from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..coach import CoachGenerator
from ..database import get_db
from ..deps import get_optional_user
from ..orm import CoachSummaryRecord, UserProfileRecord, UserRecord, WorkoutSessionRecord
from ..schemas import CoachSummary, GenerateSummaryPayload

router = APIRouter(prefix="/api/workout", tags=["coach"])


def _to_schema(record: CoachSummaryRecord) -> CoachSummary:
    return CoachSummary(
        jobId=record.id,
        sessionId=record.session_id,
        status=record.status,
        model=record.model,
        headline=record.headline,
        summary=record.summary,
        focusAreas=record.focus_areas or [],
        nextSession=record.next_session,
        error=record.error,
        createdAt=record.created_at,
        completedAt=record.completed_at,
    )


async def run_coach_job(
    job_id: str,
    session_factory: async_sessionmaker[AsyncSession],
    generator: CoachGenerator,
) -> None:
    async with session_factory() as db:
        job = await db.get(CoachSummaryRecord, job_id)
        if job is None:
            return
        job.status = "running"
        await db.commit()

        session = await db.get(WorkoutSessionRecord, job.session_id)
        profile = (
            await db.get(UserProfileRecord, job.user_id) if job.user_id is not None else None
        )

        if session is None:
            job.status = "failed"
            job.error = "Session no longer exists"
        else:
            try:
                result = await generator(session, profile)
            except Exception as exc:
                job.status = "failed"
                job.error = str(exc)
            else:
                job.status = "complete"
                job.model = result.model
                job.headline = result.headline
                job.summary = result.summary
                job.focus_areas = result.focus_areas
                job.next_session = result.next_session

        job.completed_at = datetime.now(timezone.utc)
        await db.commit()


@router.post(
    "/generate-summary",
    response_model=CoachSummary,
    status_code=202,
    summary="Queue an LLM coach summary for a finished session",
)
async def generate_summary(
    payload: GenerateSummaryPayload,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: UserRecord | None = Depends(get_optional_user),
):
    session = await db.get(WorkoutSessionRecord, payload.sessionId)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id is not None and (user is None or user.id != session.user_id):
        raise HTTPException(status_code=404, detail="Session not found")

    job = CoachSummaryRecord(session_id=session.id, user_id=session.user_id, status="pending")
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(
        run_coach_job,
        job.id,
        request.app.state.session_factory,
        request.app.state.coach_generator,
    )
    return _to_schema(job)


@router.get(
    "/generate-summary/{job_id}",
    response_model=CoachSummary,
    summary="Poll a queued coach summary job",
)
async def read_summary_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    user: UserRecord | None = Depends(get_optional_user),
):
    job = await db.get(CoachSummaryRecord, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Summary job not found")
    if job.user_id is not None and (user is None or user.id != job.user_id):
        raise HTTPException(status_code=404, detail="Summary job not found")
    return _to_schema(job)


@router.get(
    "/{session_id}/coach-summary",
    response_model=CoachSummary,
    summary="Latest coach summary for a session",
)
async def read_latest_summary(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user: UserRecord | None = Depends(get_optional_user),
):
    job = await db.scalar(
        select(CoachSummaryRecord)
        .where(CoachSummaryRecord.session_id == session_id)
        .order_by(CoachSummaryRecord.created_at.desc())
        .limit(1)
    )
    if job is None:
        raise HTTPException(status_code=404, detail="No summary generated for this session")
    if job.user_id is not None and (user is None or user.id != job.user_id):
        raise HTTPException(status_code=404, detail="No summary generated for this session")
    return _to_schema(job)
