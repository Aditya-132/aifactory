import { computeJointAngle, type Vector2D } from '@/lib/biomechanics_v2'
import { MIN_POSE_VISIBILITY } from './config'
import type { PoseLandmark } from './types'

/** The joint each exercise is scored against, as spelled in `ExerciseDef.keyJoint`. */
export type KeyJoint = 'Knee' | 'Hip' | 'Elbow' | 'Shoulder'

export type BodySide = 'left' | 'right'

export interface FrameAngles {
  /** Angle at the knee between hip and ankle. Extended leg ≈ 180°. */
  knee: number
  /** Angle at the hip between shoulder and knee. Standing tall ≈ 180°. */
  hip: number
  /** Torso lean away from vertical. Upright ≈ 0°. */
  back: number
  /** Angle at the elbow between shoulder and wrist. Straight arm ≈ 180°. */
  elbow: number
  /** Angle at the shoulder between elbow and hip. Arm at side ≈ 0°. */
  shoulder: number
  /** Which side of the body these angles were measured on. */
  side: BodySide
  /** Mean landmark visibility for the chain that was used, 0-1. */
  confidence: number
}

/** BlazePose's 33-landmark topology, limited to the joints we score. */
const SIDE_CHAIN: Record<BodySide, Record<'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle', number>> = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
}

/**
 * Landmarks are normalized to a unit square, so a 16:9 frame arrives horizontally
 * squashed. Scaling x back by the aspect ratio keeps measured angles honest.
 */
function toVector(landmark: PoseLandmark, aspectRatio: number): Vector2D {
  return { x: landmark.x * aspectRatio, y: landmark.y }
}

function chainVisibility(landmarks: PoseLandmark[], indices: number[]): number {
  let total = 0
  for (const index of indices) {
    const landmark = landmarks[index]
    if (!landmark) return 0
    total += landmark.visibility ?? 1
  }
  return total / indices.length
}

/** Picks whichever side of the body the camera can actually see. */
function pickSide(landmarks: PoseLandmark[]): { side: BodySide; confidence: number } | null {
  const left = chainVisibility(landmarks, Object.values(SIDE_CHAIN.left))
  const right = chainVisibility(landmarks, Object.values(SIDE_CHAIN.right))
  const side: BodySide = right > left ? 'right' : 'left'
  const confidence = Math.max(left, right)
  return confidence >= MIN_POSE_VISIBILITY ? { side, confidence } : null
}

/**
 * Converts one detected pose into the joint angles the rep detector scores.
 * Returns null when the visible side is too occluded to trust.
 */
export function extractFrameAngles(
  landmarks: PoseLandmark[],
  aspectRatio: number,
): FrameAngles | null {
  const picked = pickSide(landmarks)
  if (!picked) return null

  const chain = SIDE_CHAIN[picked.side]
  const shoulder = toVector(landmarks[chain.shoulder], aspectRatio)
  const elbow = toVector(landmarks[chain.elbow], aspectRatio)
  const wrist = toVector(landmarks[chain.wrist], aspectRatio)
  const hip = toVector(landmarks[chain.hip], aspectRatio)
  const knee = toVector(landmarks[chain.knee], aspectRatio)
  const ankle = toVector(landmarks[chain.ankle], aspectRatio)

  // Straight up from the hip in image space, where y grows downward.
  const overhead: Vector2D = { x: hip.x, y: hip.y - 1 }

  return {
    knee: computeJointAngle(hip, knee, ankle),
    hip: computeJointAngle(shoulder, hip, knee),
    back: computeJointAngle(shoulder, hip, overhead),
    elbow: computeJointAngle(shoulder, elbow, wrist),
    shoulder: computeJointAngle(elbow, shoulder, hip),
    side: picked.side,
    confidence: picked.confidence,
  }
}

export function keyAngleFor(joint: KeyJoint, angles: FrameAngles): number {
  switch (joint) {
    case 'Knee':
      return angles.knee
    case 'Hip':
      return angles.hip
    case 'Elbow':
      return angles.elbow
    case 'Shoulder':
      return angles.shoulder
  }
}

/** Falls back to the knee for any `keyJoint` string we do not model. */
export function resolveKeyJoint(keyJoint: string): KeyJoint {
  return keyJoint === 'Hip' || keyJoint === 'Elbow' || keyJoint === 'Shoulder' ? keyJoint : 'Knee'
}
