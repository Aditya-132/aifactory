export type FormToleranceMode = 'Strict' | 'Moderate' | 'Lenient'

export interface Vector2D {
  x: number
  y: number
}

export interface JointAngles {
  knee_angle: number
  hip_angle: number
  back_angle: number
}

export interface FormToleranceResult {
  status: string
  severity: 'good' | 'warn' | 'crit'
  details: {
    knee: string
    hip: string
    back: string
  }
}

const TOLERANCE_TABLE: Record<FormToleranceMode, { knee: number; hip: number; back: number }> = {
  Strict: { knee: 8, hip: 10, back: 8 },
  Moderate: { knee: 12, hip: 15, back: 12 },
  Lenient: { knee: 16, hip: 20, back: 16 },
}

export function computeJointAngle(a: Vector2D, vertex: Vector2D, b: Vector2D): number {
  const v1x = a.x - vertex.x
  const v1y = a.y - vertex.y
  const v2x = b.x - vertex.x
  const v2y = b.y - vertex.y

  const dot = v1x * v2x + v1y * v2y
  const magnitude1 = Math.hypot(v1x, v1y)
  const magnitude2 = Math.hypot(v2x, v2y)

  if (magnitude1 === 0 || magnitude2 === 0) return 0

  const cosine = Math.max(-1, Math.min(1, dot / (magnitude1 * magnitude2)))
  return (Math.acos(cosine) * 180) / Math.PI
}

export function evaluateFormTolerance({
  mode,
  knee_angle,
  hip_angle,
  back_angle,
}: { mode: FormToleranceMode } & JointAngles): FormToleranceResult {
  const thresholds = TOLERANCE_TABLE[mode]
  const statusParts: string[] = []
  const details = { knee: '', hip: '', back: '' }

  if (Math.abs(knee_angle - 90) <= thresholds.knee) {
    statusParts.push('PERFECT DEPTH')
    details.knee = `Knee depth within ±${thresholds.knee}° of target`
  } else if (knee_angle < 90 - thresholds.knee) {
    details.knee = 'Knee angle too shallow — increase depth'
  } else {
    details.knee = 'Knee angle too deep — reduce depth'
  }

  if (Math.abs(hip_angle - 100) <= thresholds.hip) {
    statusParts.push('HIP STACKED')
    details.hip = `Hip angle within ±${thresholds.hip}° of target`
  } else if (hip_angle < 100 - thresholds.hip) {
    details.hip = 'Hip angle collapsing — drive hips back'
  } else {
    details.hip = 'Hip angle too extended — stay balanced'
  }

  if (Math.abs(back_angle - 35) <= thresholds.back) {
    statusParts.push('BACK NEUTRAL')
    details.back = `Back angle within ±${thresholds.back}° of target`
  } else if (back_angle > 35 + thresholds.back) {
    details.back = 'Back angle too extended — keep torso neutral'
  } else {
    details.back = 'Back angle too flexed — brace and lift'
  }

  let severity: FormToleranceResult['severity'] = 'good'
  if (statusParts.length < 2) severity = 'warn'
  if (statusParts.length === 0) severity = 'crit'

  return {
    status: statusParts.length ? statusParts.join(' • ') : 'FORM ALERT',
    severity,
    details,
  }
}

export function computeSpeedDecay(velocities: number[]): number {
  if (velocities.length < 2) return 0

  const first = velocities[0]
  const last = velocities[velocities.length - 1]
  if (first <= 0) return 0

  return Math.max(0, Math.min(100, ((first - last) / first) * 100))
}

export function computeFacialColorShift(
  before: { r: number; g: number; b: number },
  after: { r: number; g: number; b: number },
): number {
  const deltaR = Math.abs(after.r - before.r)
  const deltaG = Math.abs(after.g - before.g)
  const deltaB = Math.abs(after.b - before.b)

  const rgbDistance = Math.sqrt(deltaR ** 2 + deltaG ** 2 + deltaB ** 2)
  const maxDistance = Math.sqrt(255 ** 2 * 3)

  return Math.max(0, Math.min(100, (rgbDistance / maxDistance) * 100))
}

export function computeEffortIndex({
  speedDecayPct,
  facialColorShiftPct,
  formScore,
}: {
  speedDecayPct: number
  facialColorShiftPct: number
  formScore: number
}): { value: number; level: 'LOW' | 'MODERATE' | 'HIGH'; confidence: number } {
  const weighted =
    0.45 * Math.max(0, Math.min(100, speedDecayPct)) +
    0.35 * Math.max(0, Math.min(100, facialColorShiftPct)) +
    0.2 * Math.max(0, Math.min(100, 100 - formScore))

  const value = Math.max(0, Math.min(100, Math.round(weighted)))

  let level: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW'
  if (value >= 60) level = 'HIGH'
  else if (value >= 35) level = 'MODERATE'

  const confidence = Math.max(0, Math.min(100, Math.round((value + (100 - formScore)) / 2)))

  return { value, level, confidence }
}
