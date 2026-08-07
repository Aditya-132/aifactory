from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class RepData(BaseModel):
    rep: int
    tempo: float
    concentricTime: float
    eccentricTime: float
    peakAngle: float
    velocity: float
    formScore: float
    effort: float
    cue: str
    severity: Literal["good", "warn", "crit"]
    flaws: list[str] = []


class EndSessionPayload(BaseModel):
    exerciseId: str
    exerciseName: str
    cameraAngle: str
    durationSeconds: float
    totalReps: int
    avgFormScore: float
    peakEffort: float
    reps: list[RepData]


class SessionCreated(BaseModel):
    id: str
    createdAt: datetime


class WorkoutSummary(BaseModel):
    id: str
    exerciseId: str
    exerciseName: str
    cameraAngle: str
    durationSeconds: float
    totalReps: int
    avgFormScore: float
    peakEffort: float
    reps: list[RepData]
    createdAt: datetime


class SignupPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    displayName: str = Field(min_length=1, max_length=120)


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class PublicUser(BaseModel):
    id: str
    email: EmailStr
    displayName: str
    createdAt: datetime


class AuthToken(BaseModel):
    accessToken: str
    tokenType: Literal["bearer"] = "bearer"
    expiresInMinutes: int
    user: PublicUser


class ProfilePayload(BaseModel):
    fitnessGoal: str | None = Field(default=None, max_length=80)
    experienceLevel: Literal["Beginner", "Intermediate", "Advanced"] | None = None
    age: int | None = Field(default=None, ge=13, le=120)
    heightCm: float | None = Field(default=None, gt=0, le=280)
    weightKg: float | None = Field(default=None, gt=0, le=500)
    trainingDaysPerWeek: int | None = Field(default=None, ge=0, le=7)
    primaryExercises: list[str] = []
    injuries: list[str] = []
    equipment: list[str] = []
    onboardingAnswers: dict[str, Any] = {}
    onboardingCompleted: bool = False


class UserProfile(ProfilePayload):
    userId: str
    updatedAt: datetime


class HistoryItem(BaseModel):
    id: str
    exerciseId: str
    exerciseName: str
    cameraAngle: str
    durationSeconds: float
    totalReps: int
    avgFormScore: float
    peakEffort: float
    createdAt: datetime


class HistoryPage(BaseModel):
    items: list[HistoryItem]
    total: int
    limit: int
    offset: int


class TelemetryLog(BaseModel):
    sessionId: str
    exerciseId: str
    exerciseName: str
    recordedAt: datetime
    reps: list[RepData]
    flawCounts: dict[str, int]


class ExerciseBreakdown(BaseModel):
    exerciseId: str
    exerciseName: str
    sessions: int
    totalReps: int
    avgFormScore: float
    bestFormScore: float


class HistoryStats(BaseModel):
    totalSessions: int
    totalReps: int
    totalDurationSeconds: float
    avgFormScore: float
    peakEffort: float
    topFlaws: list[tuple[str, int]]
    byExercise: list[ExerciseBreakdown]
    lastSessionAt: datetime | None


class GenerateSummaryPayload(BaseModel):
    sessionId: str


class CoachSummary(BaseModel):
    jobId: str
    sessionId: str
    status: Literal["pending", "running", "complete", "failed"]
    model: str | None = None
    headline: str | None = None
    summary: str | None = None
    focusAreas: list[str] = []
    nextSession: str | None = None
    error: str | None = None
    createdAt: datetime
    completedAt: datetime | None = None
