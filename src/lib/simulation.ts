export type CameraAngle = 'Front' | 'Three-quarter' | 'Side' | 'Rear three-quarter' | 'Rear'

export interface CameraRecommendation {
  recommendedCamera: CameraAngle
  recommendedDistance: string
  framingGuidance: string
  setupNotes: string
}

export interface ExerciseDef {
  id: string
  name: string
  primaryMuscles: string[]
  bestAngle: CameraAngle
  /** every angle this lift can realistically be filmed & tracked from */
  angles: CameraAngle[]
  keyJoint: string
  cues: { good: string[]; warn: string[]; crit: string[] }
  baseTempo: number // seconds per rep
  recommendation: CameraRecommendation
}

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'squat',
    name: 'Back Squat',
    primaryMuscles: ['Quads', 'Glutes', 'Core'],
    bestAngle: 'Side',
    angles: ['Side', 'Three-quarter', 'Front', 'Rear three-quarter'],
    keyJoint: 'Knee',
    cues: {
      good: ['Depth looks great — hips below parallel', 'Nice upright torso through the drive', 'Controlled eccentric, strong lockout'],
      warn: ['Knees drifting slightly inward', 'Chest tipping forward at the bottom', 'Heels getting light — stay mid-foot'],
      crit: ['Knee valgus detected — push knees out', 'Lumbar rounding at depth — brace harder', 'Shallow rep — hit full depth'],
    },
    baseTempo: 2.6,
    recommendation: {
      recommendedCamera: 'Side',
      recommendedDistance: '2.5–3.0 meters',
      framingGuidance: 'Keep full body & bar path visible in portrait frame.',
      setupNotes: 'Position camera at waist height to accurately capture knee depth and hip hinge.',
    },
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    primaryMuscles: ['Hamstrings', 'Glutes', 'Back'],
    bestAngle: 'Side',
    angles: ['Side', 'Three-quarter', 'Rear three-quarter', 'Front'],
    keyJoint: 'Hip',
    cues: {
      good: ['Bar path is vertical — clean pull', 'Hips and shoulders rising together', 'Solid brace off the floor'],
      warn: ['Hips shooting up early', 'Bar drifting away from shins', 'Shoulders slightly ahead of the bar'],
      crit: ['Spinal flexion under load — reset your brace', 'Jerking the bar — create slack tension first', 'Lockout soft — squeeze glutes at the top'],
    },
    baseTempo: 3.1,
    recommendation: {
      recommendedCamera: 'Side',
      recommendedDistance: '2.5–3.0 meters',
      framingGuidance: 'Ensure head-to-toe coverage & shin path.',
      setupNotes: 'Side profile is essential to detect spine curvature and bar drift off the shins.',
    },
  },
  {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscles: ['Chest', 'Triceps', 'Front Delts'],
    bestAngle: 'Three-quarter',
    angles: ['Three-quarter', 'Side', 'Rear three-quarter'],
    keyJoint: 'Elbow',
    cues: {
      good: ['Bar path touching low chest — textbook', 'Wrists stacked over elbows', 'Leg drive is helping your press'],
      warn: ['Elbows flaring past 70°', 'Bar drifting toward your chin', 'Hips lifting — keep glutes on the bench'],
      crit: ['Bouncing the bar off the chest — pause it', 'Wrists bent back — stack them', 'Uneven press — left side lagging'],
    },
    baseTempo: 2.4,
    recommendation: {
      recommendedCamera: 'Three-quarter',
      recommendedDistance: '2.0–2.5 meters',
      framingGuidance: 'Frame bench from head to hip angle.',
      setupNotes: '45° diagonal perspective captures both bar touchpoint and elbow flare angles.',
    },
  },
  {
    id: 'ohp',
    name: 'Overhead Press',
    primaryMuscles: ['Shoulders', 'Triceps', 'Core'],
    bestAngle: 'Front',
    angles: ['Front', 'Three-quarter', 'Side', 'Rear'],
    keyJoint: 'Shoulder',
    cues: {
      good: ['Straight bar path over mid-foot', 'Head through at lockout — great finish', 'Glutes tight, no lean-back'],
      warn: ['Slight lumbar arch at the top', 'Bar looping forward off the shoulders', 'Elbows dropping in the bottom position'],
      crit: ['Excessive lean-back — reduce the load', 'Pressing around your head — tuck chin first', 'One arm locking out early'],
    },
    baseTempo: 2.8,
    recommendation: {
      recommendedCamera: 'Front',
      recommendedDistance: '2.0–2.5 meters',
      framingGuidance: 'Ensure full lockout clearance overhead.',
      setupNotes: 'Front view tracks shoulder symmetry, elbow stack, and head position at lockout.',
    },
  },
  {
    id: 'curl',
    name: 'Bicep Curl',
    primaryMuscles: ['Biceps', 'Forearms'],
    bestAngle: 'Front',
    angles: ['Front', 'Three-quarter', 'Side', 'Rear'],
    keyJoint: 'Elbow',
    cues: {
      good: ['Elbows pinned — strict curl', 'Full range, no half reps', 'Slow negative — great time under tension'],
      warn: ['Elbows drifting forward at the top', 'Slight torso sway building', 'Range shortening as you fatigue'],
      crit: ['Swinging the weight — drop the ego', 'Shoulders doing the work — isolate', 'Momentum rep detected'],
    },
    baseTempo: 2.0,
    recommendation: {
      recommendedCamera: 'Front',
      recommendedDistance: '1.8–2.2 meters',
      framingGuidance: 'Keep chest & arms centered in frame.',
      setupNotes: 'Front view detects elbow flare, shoulder compensation, and torso sway.',
    },
  },
  {
    id: 'lunge',
    name: 'Walking Lunge',
    primaryMuscles: ['Quads', 'Glutes', 'Calves'],
    bestAngle: 'Side',
    angles: ['Side', 'Three-quarter', 'Front', 'Rear three-quarter'],
    keyJoint: 'Knee',
    cues: {
      good: ['90° both knees — perfect split', 'Torso tall through the step', 'Knee tracking over toes nicely'],
      warn: ['Front knee passing the toes a bit', 'Torso leaning forward', 'Step length shortening'],
      crit: ['Knee collapsing inward on the step', 'Losing balance — slow the cadence', 'Back knee slamming the floor'],
    },
    baseTempo: 2.2,
    recommendation: {
      recommendedCamera: 'Side',
      recommendedDistance: '2.5–3.2 meters',
      framingGuidance: 'Frame stride path from side profile.',
      setupNotes: 'Side profile tracks 90° knee split angle and torso posture through step progression.',
    },
  },
]

export interface RepData {
  rep: number
  tempo: number // seconds
  concentricTime: number
  eccentricTime: number
  peakAngle: number
  velocity: number // deg/s
  formScore: number // 0-100
  effort: number // 0-100
  cue: string
  severity: 'good' | 'warn' | 'crit'
  flaws?: string[]
}

export interface FeedItem {
  id: number
  time: string
  message: string
  severity: 'good' | 'warn' | 'crit' | 'info'
}

export type SessionPhase = 'setup' | 'analyzing' | 'countdown' | 'live' | 'ended'

const FLAW_MAP: Record<string, string[]> = {
  squat: ['Knee Valgus', 'Shallow Depth', 'Chest Dip', 'Heel Lift', 'Lumbar Flexion'],
  deadlift: ['Spinal Flexion', 'Hips Early', 'Bar Drift', 'Soft Lockout', 'Slack Pull'],
  bench: ['Elbow Flare', 'Bar Bounce', 'Hips Lifting', 'Unstable Path', 'Wrists Bent'],
  ohp: ['Excessive Leanback', 'Forward Loop', 'Asymmetric Press', 'Core Flaccid'],
  curl: ['Torso Swing', 'Elbow Drift', 'Momentum Rep', 'Short ROM'],
  lunge: ['Knee Inward Collapse', 'Short Stride', 'Forward Torso Tilt', 'Loss of Balance'],
}

export interface ExerciseBenchmark {
  minAngle: number
  maxAngle: number
  targetAngle: number
  eccentricRatio: number
}

export const EXERCISE_BENCHMARKS: Record<string, ExerciseBenchmark> = {
  squat: { minAngle: 65, maxAngle: 110, targetAngle: 90, eccentricRatio: 0.62 },
  deadlift: { minAngle: 75, maxAngle: 125, targetAngle: 100, eccentricRatio: 0.45 },
  bench: { minAngle: 60, maxAngle: 105, targetAngle: 75, eccentricRatio: 0.58 },
  ohp: { minAngle: 65, maxAngle: 115, targetAngle: 80, eccentricRatio: 0.55 },
  curl: { minAngle: 40, maxAngle: 145, targetAngle: 135, eccentricRatio: 0.52 },
  lunge: { minAngle: 70, maxAngle: 115, targetAngle: 90, eccentricRatio: 0.60 },
}

/** Deterministic-ish simulated rep generator. */
export function simulateRep(repIndex: number, exercise: ExerciseDef): RepData {
  const benchmark = EXERCISE_BENCHMARKS[exercise.id] || EXERCISE_BENCHMARKS['squat']
  const fatigue = Math.min(repIndex * 0.038, 0.45)
  const tempoNoise = (Math.random() - 0.5) * 0.4
  const tempo = +(exercise.baseTempo * (1 + fatigue * 0.6) + tempoNoise).toFixed(2)

  const eccentricRatio = Math.max(0.45, Math.min(0.70, benchmark.eccentricRatio + (Math.random() - 0.5) * 0.06))
  const eccentricTime = +(tempo * eccentricRatio).toFixed(2)
  const concentricTime = +(tempo - eccentricTime).toFixed(2)

  const roll = Math.random()
  let severity: RepData['severity'] = 'good'
  if (roll < 0.08 + repIndex * 0.015) severity = 'crit'
  else if (roll < 0.28 + repIndex * 0.02) severity = 'warn'

  const baseForm = severity === 'good' ? 92 : severity === 'warn' ? 74 : 54
  const formScore = Math.max(
    35,
    Math.min(99, Math.round(baseForm + (Math.random() - 0.5) * 8 - fatigue * 18)),
  )

  let peakAngle = benchmark.targetAngle
  if (severity === 'good') {
    peakAngle = Math.round(benchmark.targetAngle + (Math.random() - 0.5) * 6)
  } else if (severity === 'warn') {
    peakAngle = Math.round(benchmark.targetAngle + (Math.random() > 0.5 ? 12 : -12))
  } else {
    peakAngle = Math.round(benchmark.targetAngle + (Math.random() > 0.5 ? 22 : -20))
  }
  peakAngle = Math.max(benchmark.minAngle, Math.min(benchmark.maxAngle, peakAngle))

  const romDelta = Math.abs(180 - peakAngle)
  const velocity = +((romDelta / Math.max(0.6, concentricTime)) * (1 - fatigue * 0.35)).toFixed(1)

  const possibleFlaws = FLAW_MAP[exercise.id] || FLAW_MAP['squat']
  const flaws: string[] = []
  if (severity === 'crit') {
    flaws.push(possibleFlaws[Math.floor(Math.random() * possibleFlaws.length)])
    if (Math.random() > 0.4 && possibleFlaws.length > 1) {
      const secondFlaw = possibleFlaws[(Math.floor(Math.random() * possibleFlaws.length) + 1) % possibleFlaws.length]
      if (!flaws.includes(secondFlaw)) flaws.push(secondFlaw)
    }
  } else if (severity === 'warn') {
    flaws.push(possibleFlaws[Math.floor(Math.random() * possibleFlaws.length)])
  }

  const grind = concentricTime / (exercise.baseTempo * 0.4) - 1
  const strain = (100 - formScore) / 100
  const effort = Math.max(
    12,
    Math.min(
      99,
      Math.round(25 + repIndex * 6.5 + grind * 45 + strain * 25 + (Math.random() - 0.5) * 6),
    ),
  )

  const pool = exercise.cues[severity]
  const cue = pool[Math.floor(Math.random() * pool.length)]

  return { rep: repIndex, tempo, concentricTime, eccentricTime, peakAngle, velocity, formScore, effort, cue, severity, flaws }
}

export function angleForExercise(exercise: ExerciseDef): CameraAngle {
  return exercise.recommendation?.recommendedCamera || exercise.bestAngle || 'Side'
}

export function nextAngle(exercise: ExerciseDef, current: CameraAngle | null): CameraAngle {
  const list = exercise.angles
  const i = current ? list.indexOf(current) : -1
  return list[(i + 1) % list.length]
}
