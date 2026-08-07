import { describe, expect, it } from 'vitest'
import { SubjectTracker, scoreSubjectProminence, computeIoU, computePoseBoundingBox } from './subjectTracker'
import type { DetectedPose } from './types'

describe('SubjectTracker Torso Centroid & Skeleton Signature Engine', () => {
  it('correctly scores candidate prominence favoring central, larger subjects', () => {
    const backgroundPerson: DetectedPose = {
      landmarks: [
        { x: 0.05, y: 0.05, visibility: 0.7 },
        { x: 0.15, y: 0.25, visibility: 0.7 },
      ],
    }

    const primaryAthlete: DetectedPose = {
      landmarks: [
        { x: 0.3, y: 0.1, visibility: 0.95 },
        { x: 0.7, y: 0.9, visibility: 0.95 },
      ],
    }

    const bgScore = scoreSubjectProminence(backgroundPerson)
    const athleteScore = scoreSubjectProminence(primaryAthlete)

    expect(athleteScore).toBeGreaterThan(bgScore)
  })

  it('computes Intersection over Union (IoU) correctly', () => {
    const boxA = computePoseBoundingBox([
      { x: 0.0, y: 0.0 },
      { x: 0.5, y: 0.5 },
    ])!
    const boxB = computePoseBoundingBox([
      { x: 0.25, y: 0.0 },
      { x: 0.75, y: 0.5 },
    ])!

    const iou = computeIoU(boxA, boxB)
    expect(iou).toBeGreaterThan(0.3)
    expect(iou).toBeLessThan(0.4)
  })

  it('selects the primary athlete when multiple poses are detected', () => {
    const tracker = new SubjectTracker()

    const backgroundPerson: DetectedPose = {
      landmarks: [
        { x: 0.01, y: 0.01, visibility: 0.5 },
        { x: 0.1, y: 0.1, visibility: 0.5 },
      ],
    }

    const primaryAthlete: DetectedPose = {
      landmarks: [
        { x: 0.35, y: 0.2, visibility: 0.9 },
        { x: 0.65, y: 0.8, visibility: 0.9 },
      ],
    }

    const poses = [backgroundPerson, primaryAthlete]
    const { selectedPose } = tracker.selectPrimarySubject(poses, 1000)

    expect(selectedPose).toBe(primaryAthlete)
  })

  it('retains lock on athlete during deep squat when height shrinks and bystander is standing', () => {
    const tracker = new SubjectTracker()

    const standingAthlete: DetectedPose = {
      landmarks: [
        { x: 0.5, y: 0.2 },
        { x: 0.5, y: 0.8 },
      ],
    }

    const standingBystander: DetectedPose = {
      landmarks: [
        { x: 0.8, y: 0.2 },
        { x: 0.8, y: 0.8 },
      ],
    }

    // Frame 1: Locked on standing athlete at x=0.5
    const { selectedPose: f1 } = tracker.selectPrimarySubject([standingAthlete, standingBystander], 1000)
    expect(f1).toBe(standingAthlete)

    // Frame 2: Athlete does a deep squat (height drops down to y=0.5..0.9, x remains 0.5)
    const squattingAthlete: DetectedPose = {
      landmarks: [
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.9 },
      ],
    }

    const { selectedPose: f2 } = tracker.selectPrimarySubject([standingBystander, squattingAthlete], 1050)
    expect(f2).toBe(squattingAthlete)
  })

  it('allows tap point selection to explicitly lock onto targeted person', () => {
    const tracker = new SubjectTracker()

    const personLeft: DetectedPose = {
      landmarks: [{ x: 0.2, y: 0.5 }],
    }
    const personRight: DetectedPose = {
      landmarks: [{ x: 0.8, y: 0.5 }],
    }

    const selected = tracker.selectPoseByTapPoint({ x: 0.8, y: 0.5 }, [personLeft, personRight], 1000)
    expect(selected).toBe(personRight)
  })
})
