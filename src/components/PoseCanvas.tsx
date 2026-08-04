import { useEffect, useRef } from 'react'
import type { ExerciseDef, CameraAngle } from '@/lib/simulation'

interface PoseCanvasProps {
  exercise: ExerciseDef | null
  angle?: CameraAngle | null
  severity: 'good' | 'warn' | 'crit'
  active: boolean
}

const COLORS = {
  good: '#FF4D00',
  warn: '#D97706',
  crit: '#DC2626',
}

export default function PoseCanvas({ exercise, angle = 'Side', severity, active }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ exercise, angle, severity, active })
  stateRef.current = { exercise, angle, severity, active }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const start = performance.now()

    const draw = (now: number) => {
      const { exercise: ex, angle: viewAngle, severity: sev, active: isActive } = stateRef.current
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)
      if (!ex || !isActive) {
        raf = requestAnimationFrame(draw)
        return
      }

      const currentAngle = viewAngle || ex.bestAngle || 'Side'
      const tempo = ex.baseTempo * 1000
      const t = ((now - start) % tempo) / tempo
      // rep cycle 0 (start/top) -> 1 (inflection/bottom) -> 0
      const s = (1 - Math.cos(t * Math.PI * 2)) / 2

      const color = COLORS[sev]
      const cx = W * 0.5
      const ground = H * 0.88
      const u = H / 100 // proportional unit

      // Joint coordinates setup per exercise & perspective angle
      let ankleL = { x: cx - 5 * u, y: ground }
      let ankleR = { x: cx + 5 * u, y: ground }
      let kneeL = { x: cx - 4 * u, y: ground - 22 * u }
      let kneeR = { x: cx + 4 * u, y: ground - 22 * u }
      let hipL = { x: cx - 3 * u, y: ground - 42 * u }
      let hipR = { x: cx + 3 * u, y: ground - 42 * u }
      let shoulderL = { x: cx - 7 * u, y: hipL.y - 24 * u }
      let shoulderR = { x: cx + 7 * u, y: hipR.y - 24 * u }
      let head = { x: cx, y: shoulderL.y - 9 * u }
      let elbowL = { x: cx - 11 * u, y: shoulderL.y + 12 * u }
      let elbowR = { x: cx + 11 * u, y: shoulderR.y + 12 * u }
      let wristL = { x: cx - 12 * u, y: shoulderL.y + 22 * u }
      let wristR = { x: cx + 12 * u, y: shoulderR.y + 22 * u }

      if (currentAngle === 'Side') {
        // Single line profile view
        const hipDrop = (ex.id === 'squat' ? 16 : ex.id === 'lunge' ? 14 : ex.id === 'deadlift' ? 10 : 2) * s * u
        const lean = (ex.id === 'deadlift' ? 14 : ex.id === 'squat' ? 6 : 2) * s * u

        const ankle = { x: cx - 4 * u, y: ground }
        const knee = { x: cx + (3 + 9 * s) * u, y: ground - 22 * u }
        const hip = { x: cx - 3 * u + 2 * s * u, y: ground - 42 * u + hipDrop }
        const shoulder = { x: cx + lean, y: hip.y - 26 * u }
        head = { x: shoulder.x + 2 * u, y: shoulder.y - 8 * u }

        let elbow = { x: shoulder.x + 6 * u, y: shoulder.y + 10 * u }
        let wrist = { x: shoulder.x + 5 * u, y: shoulder.y + 18 * u }

        if (ex.id === 'bench') {
          // Horizontal bench setup
          hip.y = ground - 14 * u
          shoulder.y = ground - 14 * u
          shoulder.x = cx - 18 * u
          head.x = shoulder.x - 8 * u
          head.y = shoulder.y
          const barDrop = 12 * (1 - s) * u
          wrist = { x: shoulder.x + 12 * u, y: shoulder.y - 18 * u + barDrop }
          elbow = { x: shoulder.x + 8 * u, y: shoulder.y - 4 * u + barDrop * 0.6 }
        } else if (ex.id === 'ohp') {
          wrist = { x: shoulder.x + 2 * u, y: shoulder.y + 12 * u - 26 * (1 - s) * u }
          elbow = { x: shoulder.x + 6 * u, y: (shoulder.y + wrist.y) / 2 + 4 * u }
        } else if (ex.id === 'curl') {
          wrist = { x: shoulder.x + 8 * u - 10 * s * u, y: shoulder.y + 20 * u - 14 * s * u }
          elbow = { x: shoulder.x + 5 * u, y: shoulder.y + 11 * u }
        }

        ankleL = ankle; ankleR = ankle
        kneeL = knee; kneeR = knee
        hipL = hip; hipR = hip
        shoulderL = shoulder; shoulderR = shoulder
        elbowL = elbow; elbowR = elbow
        wristL = wrist; wristR = wrist
      } else {
        // Front / Rear / Three-quarter 3D-like Perspective
        const offset3D = currentAngle === 'Three-quarter' ? 4 * u : 0
        head.x += offset3D

        if (ex.id === 'squat') {
          const drop = 15 * s * u
          const kneeFlare = (sev === 'crit' ? -2 : 4) * s * u
          hipL.y += drop; hipR.y += drop
          shoulderL.y += drop; shoulderR.y += drop
          head.y += drop
          kneeL.x -= kneeFlare; kneeR.x += kneeFlare
        } else if (ex.id === 'ohp') {
          const pressHeight = 24 * (1 - s) * u
          wristL.y = shoulderL.y + 8 * u - pressHeight
          wristR.y = shoulderR.y + 8 * u - pressHeight
          elbowL.y = (shoulderL.y + wristL.y) / 2 + 2 * u
          elbowR.y = (shoulderR.y + wristR.y) / 2 + 2 * u
        } else if (ex.id === 'curl') {
          const curlHeight = 15 * s * u
          wristL.y -= curlHeight; wristR.y -= curlHeight
          wristL.x += 3 * s * u; wristR.x -= 3 * s * u
        } else if (ex.id === 'bench') {
          const barHeight = 14 * s * u
          wristL.y += barHeight; wristR.y += barHeight
          elbowL.y += barHeight * 0.8; elbowR.y += barHeight * 0.8
        }
      }

      const bones = [
        [ankleL, kneeL], [kneeL, hipL], [hipL, shoulderL], [shoulderL, elbowL], [elbowL, wristL],
        [ankleR, kneeR], [kneeR, hipR], [hipR, shoulderR], [shoulderR, elbowR], [elbowR, wristR],
        [hipL, hipR], [shoulderL, shoulderR],
      ]

      ctx.lineCap = 'round'
      // Draw skeleton bones
      for (const [a, b] of bones) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = color
        ctx.globalAlpha = currentAngle === 'Rear' ? 0.6 : 0.85
        ctx.lineWidth = 4
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Draw head
      ctx.beginPath()
      ctx.arc(head.x, head.y, 5.5 * u, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.stroke()

      // Draw joint markers
      const allJoints = currentAngle === 'Side' 
        ? [ankleL, kneeL, hipL, shoulderL, elbowL, wristL]
        : [ankleL, ankleR, kneeL, kneeR, hipL, hipR, shoulderL, shoulderR, elbowL, elbowR, wristL, wristR]

      for (const p of allJoints) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = '#14110E'
        ctx.fill()
        ctx.lineWidth = 2.5
        ctx.strokeStyle = color
        ctx.stroke()
      }

      // Key joint angle readout label
      const targetJoint = ex.keyJoint === 'Elbow' ? elbowR : ex.keyJoint === 'Hip' ? hipR : kneeR
      const ang = (Math.atan2(shoulderR.y - targetJoint.y, shoulderR.x - targetJoint.x) - Math.atan2(wristR.y - targetJoint.y, wristR.x - targetJoint.x)) * (180 / Math.PI)
      const deg = Math.abs(((ang + 540) % 360) - 180)

      ctx.font = '600 12px ui-monospace, monospace'
      ctx.fillStyle = color
      ctx.fillText(`${ex.keyJoint} ${Math.round(deg || 90)}°`, targetJoint.x + 14, targetJoint.y - 8)

      // Perspective camera badge overlay
      ctx.font = '600 10px ui-monospace, monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(`VIEWPORT: ${currentAngle.toUpperCase()}`, 12, 22)

      // Ground plane reference
      ctx.beginPath()
      ctx.moveTo(W * 0.15, ground + 2)
      ctx.lineTo(W * 0.85, ground + 2)
      ctx.strokeStyle = 'rgba(255,77,0,0.3)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.stroke()
      ctx.setLineDash([])

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
}

