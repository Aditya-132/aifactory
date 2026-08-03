export type CameraAngle = 'Front' | 'Side' | 'Three-quarter' | 'Rear'

export interface ExerciseDef {
  id: string
  name: string
  primaryMuscles: string[]
  bestAngle: CameraAngle
  keyJoint: string
  cues: { good: string[]; warn: string[]; crit: string[] }
  baseTempo: number // seconds per rep
}

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'squat',
    name: 'Back Squat',
    primaryMuscles: ['Quads', 'Glutes', 'Core'],
    bestAngle: 'Side',
    keyJoint: 'Knee',
    cues: {
      good: ['Depth looks great — hips below parallel', 'Nice upright torso through the drive', 'Controlled eccentric, strong lockout'],
      warn: ['Knees drifting slightly inward', 'Chest tipping forward at the bottom', 'Heels getting light — stay mid-foot'],
      crit: ['Knee valgus detected — push knees out', 'Lumbar rounding at depth — brace harder', 'Shallow rep — hit full depth'],
    },
    baseTempo: 2.6,
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    primaryMuscles: ['Hamstrings', 'Glutes', 'Back'],
    bestAngle: 'Side',
    keyJoint: 'Hip',
    cues: {
      good: ['Bar path is vertical — clean pull', 'Hips and shoulders rising together', 'Solid brace off the floor'],
      warn: ['Hips shooting up early', 'Bar drifting away from shins', 'Shoulders slightly ahead of the bar'],
      crit: ['Spinal flexion under load — reset your brace', 'Jerking the bar — create slack tension first', 'Lockout soft — squeeze glutes at the top'],
    },
    baseTempo: 3.1,
  },
  {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscles: ['Chest', 'Triceps', 'Front Delts'],
    bestAngle: 'Three-quarter',
    keyJoint: 'Elbow',
    cues: {
      good: ['Bar path touching low chest — textbook', 'Wrists stacked over elbows', 'Leg drive is helping your press'],
      warn: ['Elbows flaring past 70°', 'Bar drifting toward your chin', 'Hips lifting — keep glutes on the bench'],
      crit: ['Bouncing the bar off the chest — pause it', 'Wrists bent back — stack them', 'Uneven press — left side lagging'],
    },
    baseTempo: 2.4,
  },
  {
    id: 'ohp',
    name: 'Overhead Press',
    primaryMuscles: ['Shoulders', 'Triceps', 'Core'],
    bestAngle: 'Front',
    keyJoint: 'Shoulder',
    cues: {
      good: ['Straight bar path over mid-foot', 'Head through at lockout — great finish', 'Glutes tight, no lean-back'],
      warn: ['Slight lumbar arch at the top', 'Bar looping forward off the shoulders', 'Elbows dropping in the bottom position'],
      crit: ['Excessive lean-back — reduce the load', 'Pressing around your head — tuck chin first', 'One arm locking out early'],
    },
    baseTempo: 2.8,
  },
  {
    id: 'curl',
    name: 'Bicep Curl',
    primaryMuscles: ['Biceps', 'Forearms'],
    bestAngle: 'Front',
    keyJoint: 'Elbow',
    cues: {
      good: ['Elbows pinned — strict curl', 'Full range, no half reps', 'Slow negative — great time under tension'],
      warn: ['Elbows drifting forward at the top', 'Slight torso sway building', 'Range shortening as you fatigue'],
      crit: ['Swinging the weight — drop the ego', 'Shoulders doing the work — isolate', 'Momentum rep detected'],
    },
    baseTempo: 2.0,
  },
  {
    id: 'lunge',
    name: 'Walking Lunge',
    primaryMuscles: ['Quads', 'Glutes', 'Calves'],
    bestAngle: 'Side',
    keyJoint: 'Knee',
    cues: {
      good: ['90° both knees — perfect split', 'Torso tall through the step', 'Knee tracking over toes nicely'],
      warn: ['Front knee passing the toes a bit', 'Torso leaning forward', 'Step length shortening'],
      crit: ['Knee collapsing inward on the step', 'Losing balance — slow the cadence', 'Back knee slamming the floor'],
    },
    baseTempo: 2.2,
  },
]

export interface RepData {
  rep: number
  tempo: number // seconds
  formScore: number // 0-100
  effort: number // 0-100
  cue: string
  severity: 'good' | 'warn' | 'crit'
}

export interface FeedItem {
  id: number
  time: string
  message: string
  severity: 'good' | 'warn' | 'crit' | 'info'
}

export type SessionPhase = 'setup' | 'analyzing' | 'live' | 'ended'

/** Deterministic-ish simulated rep generator. */
export function simulateRep(repIndex: number, exercise: ExerciseDef): RepData {
  const fatigue = Math.min(repIndex * 0.028, 0.5)
  const tempoNoise = (Math.random() - 0.5) * 0.5
  const tempo = +(exercise.baseTempo * (1 + fatigue) + tempoNoise).toFixed(2)

  // Form score: mostly high, occasional dips, degrades slightly with fatigue
  const roll = Math.random()
  let severity: RepData['severity'] = 'good'
  if (roll < 0.12 + repIndex * 0.008) severity = 'crit'
  else if (roll < 0.34 + repIndex * 0.012) severity = 'warn'

  const base = severity === 'good' ? 88 : severity === 'warn' ? 72 : 52
  const formScore = Math.max(
    35,
    Math.min(99, Math.round(base + (Math.random() - 0.5) * 10 - fatigue * 14)),
  )

  // Effort: grows with reps, tempo slowdown and low form (grinding)
  const grind = tempo / exercise.baseTempo - 1
  const strain = (100 - formScore) / 100
  const effort = Math.max(
    8,
    Math.min(
      99,
      Math.round(22 + repIndex * 5.2 + grind * 90 + strain * 22 + (Math.random() - 0.5) * 8),
    ),
  )

  const pool = exercise.cues[severity]
  const cue = pool[Math.floor(Math.random() * pool.length)]

  return { rep: repIndex, tempo, formScore, effort, cue, severity }
}

export function angleForExercise(exercise: ExerciseDef): CameraAngle {
  const angles: CameraAngle[] = ['Front', 'Side', 'Three-quarter', 'Rear']
  // bias toward the best angle so the demo feels smart
  return Math.random() < 0.62
    ? exercise.bestAngle
    : angles[Math.floor(Math.random() * angles.length)]
}
