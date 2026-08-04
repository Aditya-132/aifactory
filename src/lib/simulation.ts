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
  concentricTime: number // concentric push/drive phase (s)
  eccentricTime: number // eccentric lowering phase (s)
  peakAngle: number // degrees (e.g. knee/elbow/hip angle)
  velocity: number // angular velocity (deg/s)
  formScore: number // 0-100
  effort: number // 0-100
  cue: string
  severity: 'good' | 'warn' | 'crit'
  flaws: string[]
}

export interface FeedItem {
  id: number
  time: string
  message: string
  severity: 'good' | 'warn' | 'crit' | 'info'
}

export type SessionPhase = 'setup' | 'analyzing' | 'live' | 'ended'

const FLAW_MAP: Record<string, string[]> = {
  squat: ['Knee Valgus', 'Shallow Depth', 'Chest Dip', 'Heel Lift', 'Lumbar Flexion'],
  deadlift: ['Spinal Flexion', 'Hips Early', 'Bar Drift', 'Soft Lockout', 'Slack Pull'],
  bench: ['Elbow Flare', 'Bar Bounce', 'Hips Lifting', 'Unstable Path', 'Wrists Bent'],
  ohp: ['Excessive Leanback', 'Forward Loop', 'Asymmetric Press', 'Core Flaccid'],
  curl: ['Torso Swing', 'Elbow Drift', 'Momentum Rep', 'Short ROM'],
  lunge: ['Knee Inward Collapse', 'Short Stride', 'Forward Torso Tilt', 'Loss of Balance'],
}

/** Deterministic-ish simulated rep generator. */
export function simulateRep(repIndex: number, exercise: ExerciseDef): RepData {
  const fatigue = Math.min(repIndex * 0.028, 0.5)
  const tempoNoise = (Math.random() - 0.5) * 0.5
  const tempo = +(exercise.baseTempo * (1 + fatigue) + tempoNoise).toFixed(2)

  // Split concentric vs eccentric
  const concRatio = 0.4 + (Math.random() - 0.5) * 0.08
  const concentricTime = +(tempo * concRatio).toFixed(2)
  const eccentricTime = +(tempo - concentricTime).toFixed(2)

  // Peak joint angle simulation based on exercise
  const baseAngle = exercise.id === 'squat' ? 115 : exercise.id === 'bench' ? 88 : exercise.id === 'deadlift' ? 125 : 95
  const peakAngle = Math.max(50, Math.min(160, Math.round(baseAngle + (Math.random() - 0.5) * 16 - fatigue * 8)))

  // Rep velocity (deg/s) inversely related to tempo
  const velocity = +(peakAngle / (tempo || 1) * 1.1).toFixed(1)

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

  // Flaws array mapping
  const possibleFlaws = FLAW_MAP[exercise.id] || FLAW_MAP['squat']
  const flaws: string[] = []
  if (severity === 'crit') {
    flaws.push(possibleFlaws[Math.floor(Math.random() * possibleFlaws.length)])
    if (Math.random() > 0.5) flaws.push(possibleFlaws[(Math.floor(Math.random() * possibleFlaws.length) + 1) % possibleFlaws.length])
  } else if (severity === 'warn') {
    flaws.push(possibleFlaws[Math.floor(Math.random() * possibleFlaws.length)])
  }

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

  return {
    rep: repIndex,
    tempo,
    concentricTime,
    eccentricTime,
    peakAngle,
    velocity,
    formScore,
    effort,
    cue,
    severity,
    flaws,
  }
}

export function angleForExercise(exercise: ExerciseDef): CameraAngle {
  const angles: CameraAngle[] = ['Front', 'Side', 'Three-quarter', 'Rear']
  // bias toward the best angle so the demo feels smart
  return Math.random() < 0.62
    ? exercise.bestAngle
    : angles[Math.floor(Math.random() * angles.length)]
}
