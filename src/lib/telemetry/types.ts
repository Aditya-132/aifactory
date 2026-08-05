import type { ExerciseClassification } from '../pose/exerciseClassifier'
import type { RepPhase } from '../pose/repDetector'
import type { PoseLandmark } from '../pose/types'
import type { PoseSampleSource } from '../pose/poseSampleTimeline'

export interface CompletedRepTelemetry {
  index: number
  totalDurationSeconds: number
  eccentricDurationSeconds: number
  concentricDurationSeconds: number
  peakAngleDegrees: number
  angularVelocityDegreesPerSecond: number
}

export interface PoseTelemetryInput {
  sessionId: string
  timestampMs: number
  source: PoseSampleSource
  exercise: ExerciseClassification
  phase: RepPhase
  repCount: number
  completedRep: CompletedRepTelemetry | null
  landmarks: PoseLandmark[]
}

export interface PoseTelemetryEnvelope {
  type: 'pose_telemetry'
  version: 1
  sessionId: string
  timestampMs: number
  source: PoseSampleSource
  exercise: {
    label: ExerciseClassification['label']
    confidence: number
  }
  rep: {
    phase: RepPhase
    count: number
    completed: CompletedRepTelemetry | null
  }
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>
}
