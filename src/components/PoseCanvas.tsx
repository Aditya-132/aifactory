import { useEffect, useRef } from 'react'
import type { ExerciseDef } from '@/lib/simulation'

interface PoseCanvasProps {
  exercise: ExerciseDef | null
  severity: 'good' | 'warn' | 'crit'
  active: boolean
}

const COLORS = {
  good: '#a3e635',
  warn: '#fbbf24',
  crit: '#f87171',
}

/**
 * Stylized animated pose-estimation overlay. Stands in for the real
 * pose model output (keypoints + joint angles) while the backend is built.
 */
export default function PoseCanvas({ exercise, severity, active }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ exercise, severity, active })
  stateRef.current = { exercise, severity, active }

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
      const { exercise: ex, severity: sev, active: isActive } = stateRef.current
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)
      if (!ex || !isActive) {
        raf = requestAnimationFrame(draw)
        return
      }

      const tempo = ex.baseTempo * 1000
      const t = ((now - start) % tempo) / tempo
      // rep depth 0 (top) -> 1 (bottom) -> 0
      const s = (1 - Math.cos(t * Math.PI * 2)) / 2

      const color = COLORS[sev]
      const cx = W * 0.5
      const ground = H * 0.9
      const u = H / 100 // unit

      // Side-view keypoints, exaggerated per exercise type
      const hipDrop = 14 * s * u
      const lean = (ex.id === 'deadlift' ? 10 : ex.id === 'squat' ? 5 : 2) * s * u

      const ankle = { x: cx - 4 * u, y: ground }
      const knee = { x: cx + (3 + 7 * s) * u, y: ground - 22 * u }
      const hip = { x: cx - 2 * u + 2 * s * u, y: ground - 40 * u + hipDrop }
      const shoulder = { x: cx + lean, y: hip.y - 26 * u }
      const head = { x: shoulder.x + 1.5 * u, y: shoulder.y - 8 * u }

      let elbow = { x: shoulder.x + 6 * u, y: shoulder.y + 10 * u }
      let wrist = { x: shoulder.x + 4 * u, y: shoulder.y + 18 * u }
      if (ex.id === 'ohp') {
        wrist = { x: shoulder.x + 1 * u, y: shoulder.y + 14 * u - 22 * (1 - s) * u }
        elbow = { x: shoulder.x + 5 * u, y: (shoulder.y + wrist.y) / 2 + 3 * u }
      } else if (ex.id === 'bench') {
        wrist = { x: shoulder.x + 10 * u, y: shoulder.y + 12 * u - 12 * (1 - s) * u }
        elbow = { x: shoulder.x + 9 * u, y: shoulder.y + 12 * u }
      } else if (ex.id === 'curl') {
        wrist = { x: shoulder.x + 7 * u, y: shoulder.y + 20 * u - 11 * (1 - s) * u }
        elbow = { x: shoulder.x + 5 * u, y: shoulder.y + 11 * u }
      } else if (ex.id === 'squat' || ex.id === 'deadlift') {
        wrist = { x: shoulder.x + 8 * u, y: shoulder.y + 2 * u }
        elbow = { x: shoulder.x + 6 * u, y: shoulder.y + 6 * u }
      }

      const bones: [typeof ankle, typeof ankle][] = [
        [ankle, knee],
        [knee, hip],
        [hip, shoulder],
        [shoulder, elbow],
        [elbow, wrist],
      ]

      ctx.lineCap = 'round'
      // bones
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

      // head
      ctx.beginPath()
      ctx.arc(head.x, head.y, 5.5 * u, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.stroke()

      // joints
      for (const p of [ankle, knee, hip, shoulder, elbow, wrist]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = '#0a0a0a'
        ctx.fill()
        ctx.lineWidth = 2.5
        ctx.strokeStyle = color
        ctx.stroke()
      }

      // key-joint angle readout
      const joints: Record<string, [typeof ankle, typeof ankle, typeof ankle]> = {
        Knee: [hip, knee, ankle],
        Hip: [shoulder, hip, knee],
        Elbow: [shoulder, elbow, wrist],
        Shoulder: [hip, shoulder, elbow],
      }
      const [a, v, b] = joints[ex.keyJoint] ?? joints.Knee
      const ang =
        (Math.atan2(a.y - v.y, a.x - v.x) - Math.atan2(b.y - v.y, b.x - v.x)) * (180 / Math.PI)
      const deg = Math.abs(((ang + 540) % 360) - 180)
      ctx.beginPath()
      ctx.arc(v.x, v.y, 14, Math.atan2(b.y - v.y, b.x - v.x), Math.atan2(a.y - v.y, a.x - v.x))
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.7
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.font = '600 13px ui-monospace, monospace'
      ctx.fillStyle = color
      ctx.fillText(`${ex.keyJoint} ${Math.round(deg)}°`, v.x + 18, v.y - 10)

      // ground line
      ctx.beginPath()
      ctx.moveTo(W * 0.2, ground + 2)
      ctx.lineTo(W * 0.8, ground + 2)
      ctx.strokeStyle = 'rgba(163,230,53,0.25)'
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
