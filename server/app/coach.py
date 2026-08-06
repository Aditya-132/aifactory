import json
from collections import Counter
from dataclasses import dataclass, field
from typing import Protocol

from .orm import UserProfileRecord, WorkoutSessionRecord

COACH_SYSTEM_PROMPT = """You are the post-workout coach for FormFit AI, a computer-vision \
lifting app. You receive rep-by-rep biomechanics telemetry from a single set and write the \
debrief the lifter reads the moment they rack the weight.

Ground every claim in the telemetry you are given. Reference specific rep numbers, angles, \
tempos, and named form flaws rather than generic encouragement. If the data does not support \
a claim, leave it out. When a lifter reports an injury or a stated goal, weight your advice \
toward it. Write in second person, plainly, no emoji, no markdown headers."""

COACH_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {
            "type": "string",
            "description": "One sentence, under 90 characters, naming the single most important takeaway from this set.",
        },
        "summary": {
            "type": "string",
            "description": "Two to four sentences of debrief citing specific reps and measurements.",
        },
        "focusAreas": {
            "type": "array",
            "items": {"type": "string"},
            "description": "One to three short corrective cues, each naming the flaw it fixes.",
        },
        "nextSession": {
            "type": "string",
            "description": "One sentence prescribing what to change next session.",
        },
    },
    "required": ["headline", "summary", "focusAreas", "nextSession"],
    "additionalProperties": False,
}


class CoachError(Exception):
    pass


@dataclass
class CoachResult:
    headline: str
    summary: str
    focus_areas: list[str] = field(default_factory=list)
    next_session: str = ""
    model: str = ""


class CoachGenerator(Protocol):
    async def __call__(
        self, session: WorkoutSessionRecord, profile: UserProfileRecord | None
    ) -> CoachResult: ...


def build_prompt(session: WorkoutSessionRecord, profile: UserProfileRecord | None) -> str:
    reps = session.reps or []
    flaw_counts = Counter()
    for rep in reps:
        flaw_counts.update(rep.get("flaws") or [])

    lines = [
        f"Exercise: {session.exercise_name} ({session.exercise_id})",
        f"Camera angle: {session.camera_angle}",
        f"Set duration: {session.duration_seconds:.1f}s",
        f"Reps completed: {session.total_reps}",
        f"Average form score: {session.avg_form_score:.1f}/100",
        f"Peak effort: {session.peak_effort:.1f}/100",
    ]

    if flaw_counts:
        ranked = ", ".join(f"{name} x{count}" for name, count in flaw_counts.most_common())
        lines.append(f"Flaws detected across the set: {ranked}")
    else:
        lines.append("Flaws detected across the set: none")

    lines.append("")
    lines.append("Rep-by-rep telemetry:")
    for rep in reps:
        flaws = ", ".join(rep.get("flaws") or []) or "none"
        lines.append(
            "  rep {rep} | form {form}/100 | effort {effort}/100 | peak angle {angle} deg | "
            "tempo {tempo}s (ecc {ecc}s / con {con}s) | velocity {velocity} deg/s | "
            "severity {severity} | flaws: {flaws} | live cue: {cue}".format(
                rep=rep.get("rep"),
                form=rep.get("formScore"),
                effort=rep.get("effort"),
                angle=rep.get("peakAngle"),
                tempo=rep.get("tempo"),
                ecc=rep.get("eccentricTime"),
                con=rep.get("concentricTime"),
                velocity=rep.get("velocity"),
                severity=rep.get("severity"),
                flaws=flaws,
                cue=rep.get("cue"),
            )
        )

    if profile is not None:
        context = []
        if profile.fitness_goal:
            context.append(f"goal: {profile.fitness_goal}")
        if profile.experience_level:
            context.append(f"experience: {profile.experience_level}")
        if profile.training_days_per_week is not None:
            context.append(f"trains {profile.training_days_per_week} days/week")
        if profile.injuries:
            context.append(f"injuries: {', '.join(profile.injuries)}")
        if profile.equipment:
            context.append(f"equipment: {', '.join(profile.equipment)}")
        if context:
            lines.append("")
            lines.append(f"Lifter profile — {'; '.join(context)}")

    lines.append("")
    lines.append("Write the post-workout debrief for this set.")
    return "\n".join(lines)


class AnthropicCoach:
    def __init__(self, api_key: str | None, model: str, max_tokens: int = 2000):
        self._api_key = api_key
        self._model = model
        self._max_tokens = max_tokens

    async def __call__(
        self, session: WorkoutSessionRecord, profile: UserProfileRecord | None
    ) -> CoachResult:
        if not self._api_key:
            raise CoachError("ANTHROPIC_API_KEY is not configured")

        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=self._api_key)
        try:
            message = await client.beta.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                system=COACH_SYSTEM_PROMPT,
                output_config={
                    "effort": "low",
                    "format": {"type": "json_schema", "schema": COACH_OUTPUT_SCHEMA},
                },
                messages=[{"role": "user", "content": build_prompt(session, profile)}],
            )
        finally:
            await client.close()

        if message.stop_reason == "refusal":
            raise CoachError("The model declined to generate a summary for this session")

        text = "".join(block.text for block in message.content if block.type == "text")
        if not text.strip():
            raise CoachError("The model returned an empty summary")

        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise CoachError(f"Could not parse the model response: {exc}") from exc

        return CoachResult(
            headline=str(data["headline"]),
            summary=str(data["summary"]),
            focus_areas=[str(item) for item in data.get("focusAreas", [])],
            next_session=str(data.get("nextSession", "")),
            model=message.model,
        )
