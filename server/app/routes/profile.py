from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user
from ..orm import UserProfileRecord, UserRecord
from ..schemas import ProfilePayload, UserProfile

router = APIRouter(prefix="/api/users/me", tags=["profile"])


def _to_schema(record: UserProfileRecord) -> UserProfile:
    return UserProfile(
        userId=record.user_id,
        fitnessGoal=record.fitness_goal,
        experienceLevel=record.experience_level,
        age=record.age,
        heightCm=record.height_cm,
        weightKg=record.weight_kg,
        trainingDaysPerWeek=record.training_days_per_week,
        primaryExercises=record.primary_exercises or [],
        injuries=record.injuries or [],
        equipment=record.equipment or [],
        onboardingAnswers=record.onboarding_answers or {},
        onboardingCompleted=bool(record.onboarding_completed),
        updatedAt=record.updated_at,
    )


async def _load_or_create(db: AsyncSession, user_id: str) -> UserProfileRecord:
    record = await db.get(UserProfileRecord, user_id)
    if record is None:
        record = UserProfileRecord(user_id=user_id)
        db.add(record)
        await db.commit()
        await db.refresh(record)
    return record


@router.get("/profile", response_model=UserProfile, summary="Read the stored onboarding profile")
async def read_profile(
    user: UserRecord = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return _to_schema(await _load_or_create(db, user.id))


@router.put("/profile", response_model=UserProfile, summary="Persist onboarding Q&A responses")
async def upsert_profile(
    payload: ProfilePayload,
    user: UserRecord = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await _load_or_create(db, user.id)
    record.fitness_goal = payload.fitnessGoal
    record.experience_level = payload.experienceLevel
    record.age = payload.age
    record.height_cm = payload.heightCm
    record.weight_kg = payload.weightKg
    record.training_days_per_week = payload.trainingDaysPerWeek
    record.primary_exercises = payload.primaryExercises
    record.injuries = payload.injuries
    record.equipment = payload.equipment
    record.onboarding_answers = payload.onboardingAnswers
    record.onboarding_completed = payload.onboardingCompleted
    await db.commit()
    await db.refresh(record)
    return _to_schema(record)
