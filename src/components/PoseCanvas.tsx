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

const ANGLE_YAW: Record<CameraAngle, number> = {
  Front: 0,
  'Three-quarter': Math.PI / 4, // 45°
  Side: Math.PI / 2, // 90°
  Rear: Math.PI, // 180°
}

interface Point3D {
  x: number
  y: number
  z: number
}

function project(
  pt: Point3D,
  yaw: number,
  cx: number,
  cy: number,
  u: number,
): { x: number; y: number; z: number } {
  // Rotate around Y-axis (Yaw)
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)

  const rx = pt.x * cosY + pt.z * sinY
  const ry = pt.y
  const rz = -pt.x * sinY + pt.z * cosY

  // Simple orthographic / weak perspective projection
  const scale = 1 / (1 + rz * 0.002)
  return {
    x: cx + rx * u * scale,
    y: cy + ry * u * scale,
    z: rz,
  }
}

export default function PoseCanvas({ exercise, angle = 'Side', severity, active }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ exercise, angle, severity, active })
  const currentYawRef = useRef<number>(ANGLE_YAW[angle || 'Side'] || Math.PI / 2)
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

      const targetAngle = viewAngle || ex.bestAngle || 'Side'
      const targetYaw = ANGLE_YAW[targetAngle] ?? Math.PI / 2

      // Smooth lerp transition for camera rotation (~300ms)
      currentYawRef.current += (targetYaw - currentYawRef.current) * 0.12

      const tempo = ex.baseTempo * 1000
      const t = ((now - start) % tempo) / tempo
      // Rep motion cycle 0 (top/start) -> 1 (inflection/bottom) -> 0
      const s = (1 - Math.cos(t * Math.PI * 2)) / 2

      const color = COLORS[sev]
      const cx = W * 0.5
      const cy = H * 0.55
      const u = H / 100 // proportional unit

      // Standard anatomical 3D keypoints (centered around origin x=0, y=0, z=0)
      let head: Point3D = { x: 0, y: -34, z: 0 }
      let shoulderL: Point3D = { x: -9, y: -24, z: 0 }
      let shoulderR: Point3D = { x: 9, y: -24, z: 0 }
      let hipL: Point3D = { x: -6, y: 4, z: 0 }
      let hipR: Point3D = { x: 6, y: 4, z: 0 }
      let kneeL: Point3D = { x: -6, y: 22, z: 0 }
      let kneeR: Point3D = { x: 6, y: 22, z: 0 }
      let ankleL: Point3D = { x: -6, y: 38, z: 0 }
      let ankleR: Point3D = { x: 6, y: 38, z: 0 }

      let elbowL: Point3D = { x: -13, y: -10, z: 0 }
      let elbowR: Point3D = { x: 13, y: -10, z: 0 }
      let wristL: Point3D = { x: -14, y: 2, z: 0 }
      let wristR: Point3D = { x: 14, y: 2, z: 0 }

      // Apply exercise-specific motion vectors in local 3D space
      if (ex.id === 'squat' || ex.id === 'lunge') {
        const drop = 16 * s
        hipL.y += drop; hipR.y += drop
        shoulderL.y += drop; shoulderR.y += drop
        head.y += drop
        kneeL.z += 8 * s; kneeR.z += 8 * s // knees push forward
        kneeL.x -= (sev === 'crit' ? -3 : 2) * s
        kneeR.x += (sev === 'crit' ? -3 : 2) * s
      } else if (ex.id === 'deadlift') {
        const drop = 12 * s
        const hingeZ = 12 * s
        hipL.y += drop; hipR.y += drop
        shoulderL.y += drop; shoulderR.y += drop
        shoulderL.z += hingeZ; shoulderR.z += hingeZ // torso hinges forward
        head.y += drop; head.z += hingeZ
        wristL.y += drop; wristR.y += drop
        wristL.z += hingeZ; wristR.z += hingeZ
      } else if (ex.id === 'bench') {
        // Lay down horizontal along Z axis
        head = { x: 0, y: 20, z: -25 }
        shoulderL = { x: -10, y: 20, z: -16 }; shoulderR = { x: 10, y: 20, z: -16 }
        hipL = { x: -7, y: 20, z: 8 }; hipR = { x: 7, y: 20, z: 8 }
        kneeL = { x: -9, y: 32, z: 18 }; kneeR = { x: 9, y: 32, z: 18 }
        ankleL = { x: -11, y: 38, z: 18 }; ankleR = { x: 11, y: 38, z: 18 }

        const barPress = 16 * (1 - s)
        wristL = { x: -10, y: 20 - barPress, z: -16 }
        wristR = { x: 10, y: 20 - barPress, z: -16 }
        elbowL = { x: -15, y: 20 - barPress * 0.5, z: -16 }
        elbowR = { x: 15, y: 20 - barPress * 0.5, z: -16 }
      } else if (ex.id === 'ohp') {
        const pressHeight = 22 * (1 - s)
        wristL = { x: -8, y: -24 - pressHeight, z: 0 }
        wristR = { x: 8, y: -24 - pressHeight, z: 0 }
        elbowL = { x: -12, y: -14 - pressHeight * 0.5, z: 2 }
        elbowR = { x: 12, y: -14 - pressHeight * 0.5, z: 2 }
      } else if (ex.id === 'curl') {
        const curlArcY = 16 * s
        const curlArcZ = 12 * s
        wristL = { x: -9, y: 2 - curlArcY, z: curlArcZ }
        wristR = { x: 9, y: 2 - curlArcY, z: curlArcZ }
        elbowL = { x: -11, y: 2, z: 2 }; elbowR = { x: 11, y: 2, z: 2 }
      }

      // Project all 3D points through viewpoint rotation matrix
      const yaw = currentYawRef.current
      const pHead = project(head, yaw, cx, cy, u)
      const pS_L = project(shoulderL, yaw, cx, cy, u)
      const pS_R = project(shoulderR, yaw, cx, cy, u)
      const pH_L = project(hipL, yaw, cx, cy, u)
      const pH_R = project(hipR, yaw, cx, cy, u)
      const pK_L = project(kneeL, yaw, cx, cy, u)
      const pK_R = project(kneeR, yaw, cx, cy, u)
      const pA_L = project(ankleL, yaw, cx, cy, u)
      const pA_R = project(ankleR, yaw, cx, cy, u)
      const pE_L = project(elbowL, yaw, cx, cy, u)
      const pE_R = project(elbowR, yaw, cx, cy, u)
      const pW_L = project(wristL, yaw, cx, cy, u)
      const pW_R = project(wristR, yaw, cx, cy, u)

      const bones = [
        [pA_L, pK_L], [pK_L, pH_L], [pH_L, pS_L], [pS_L, pE_L], [pE_L, pW_L],
        [pA_R, pK_R], [pK_R, pH_R], [pH_R, pS_R], [pS_R, pE_R], [pE_R, pW_R],
        [pH_L, pH_R], [pS_L, pS_R],
      ]

      ctx.lineCap = 'round'
      // Draw skeleton bones
      for (const [a, b] of bones) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.85
        ctx.lineWidth = 4
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Draw head
      ctx.beginPath()
      ctx.arc(pHead.x, pHead.y, 5.5 * u, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.stroke()

      // Draw joint markers
      const joints = [pA_L, pA_R, pK_L, pK_R, pH_L, pH_R, pS_L, pS_R, pE_L, pE_R, pW_L, pW_R]
      for (const p of joints) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = '#14110E'
        ctx.fill()
        ctx.lineWidth = 2.5
        ctx.strokeStyle = color
        ctx.stroke()
      }

      // Viewport HUD indicator
      ctx.font = '600 10px ui-monospace, monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(`VIEWPORT YAW: ${targetAngle.toUpperCase()} (${Math.round((yaw * 180) / Math.PI)}°)`, 12, 22)

      // Ground plane grid line
      const groundY = cy + 40 * u
      ctx.beginPath()
      ctx.moveTo(W * 0.15, groundY)
      ctx.lineTo(W * 0.85, groundY)
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


