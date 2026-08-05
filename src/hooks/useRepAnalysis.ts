import { useEffect, useRef, useState } from 'react'
import { RepDetector } from '@/lib/pose/repDetector'
import type { PoseFrame } from '@/lib/pose/types'
import type { ExerciseDef, RepData } from '@/lib/simulation'
import type { VideoDimensions } from './useMediaSource'

interface RepAnalysisOptions {
  active: boolean
  exercise: ExerciseDef | null
  /** Changes whenever the media source is replaced, which restarts calibration. */
  lifecycleKey: string
  frame: PoseFrame | null
  videoSize: VideoDimensions | null
  onRep: (rep: RepData) => void
}

interface RepAnalysisController {
  /** True once the lifter has moved through enough range for rep counting to arm. */
  isCalibrated: boolean
}

/**
 * Drives a {@link RepDetector} from the live pose stream and reports finished reps
 * through `onRep`. The detector is rebuilt whenever the source or exercise changes
 * so range-of-motion calibration never leaks across sets.
 */
export function useRepAnalysis({
  active,
  exercise,
  lifecycleKey,
  frame,
  videoSize,
  onRep,
}: RepAnalysisOptions): RepAnalysisController {
  const detectorRef = useRef<RepDetector | null>(null)
  const signatureRef = useRef<string | null>(null)
  const calibratedRef = useRef(false)
  const onRepRef = useRef(onRep)
  const [isCalibrated, setIsCalibrated] = useState(false)

  useEffect(() => {
    onRepRef.current = onRep
  }, [onRep])

  useEffect(() => {
    const signature = active && exercise ? `${lifecycleKey}:${exercise.id}` : null
    if (signatureRef.current !== signature) {
      signatureRef.current = signature
      detectorRef.current = signature && exercise ? new RepDetector(exercise) : null
    }

    const detector = detectorRef.current
    const calibrated =
      detector && frame && videoSize?.height
        ? (() => {
            const rep = detector.push(frame, videoSize.width / videoSize.height)
            if (rep) onRepRef.current(rep)
            return detector.snapshot.isCalibrated
          })()
        : (detector?.snapshot.isCalibrated ?? false)

    if (calibrated !== calibratedRef.current) {
      calibratedRef.current = calibrated
      setIsCalibrated(calibrated)
    }
  }, [active, exercise, lifecycleKey, frame, videoSize])

  return { isCalibrated }
}
