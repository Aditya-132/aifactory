import { useEffect, useRef } from 'react'
import type { CameraAngle, ExerciseDef } from '@/lib/simulation'

interface PoseCanvasProps {
  exercise: ExerciseDef | null
  severity: 'good' | 'warn' | 'crit'
  active: boolean
  /** detected camera viewpoint — the skeleton re-rigs to match */
  angle?: CameraAngle | null
}

const COLORS = {
  good: '#FF4D00',
  warn: '#D97706',
  crit: '#DC2626',
}

const INK = '#14110E'

type Pt = { x: number; y: number }

/* ── 17-keypoint skeleton (MediaPipe-style) ──────────────── */
const KPS = [
  'nose',
  'eye_l',
  'eye_r',
  'ear_l',
  'ear_r',
  'shoulder_l',
  'shoulder_r',
  'elbow_l',
  'elbow_r',
  'wrist_l',
  'wrist_r',
  'hip_l',
  'hip_r',
  'knee_l',
  'knee_r',
  'ankle_l',
  'ankle_r',
] as const
type KpName = (typeof KPS)[number]
type Pose = Record<KpName, Pt>

const BONES: [KpName, KpName][] = [
  ['nose', 'eye_l'],
  ['nose', 'eye_r'],
  ['eye_l', 'ear_l'],
  ['eye_r', 'ear_r'],
  ['shoulder_l', 'shoulder_r'],
  ['shoulder_l', 'elbow_l'],
  ['elbow_l', 'wrist_l'],
  ['shoulder_r', 'elbow_r'],
  ['elbow_r', 'wrist_r'],
  ['shoulder_l', 'hip_l'],
  ['shoulder_r', 'hip_r'],
  ['hip_l', 'hip_r'],
  ['hip_l', 'knee_l'],
  ['knee_l', 'ankle_l'],
  ['hip_r', 'knee_r'],
  ['knee_r', 'ankle_r'],
]

const KEY_JOINT_MAP: Record<string, [KpName, KpName, KpName]> = {
  Knee: ['hip_l', 'knee_l', 'ankle_l'],
  Hip: ['shoulder_l', 'hip_l', 'knee_l'],
  Elbow: ['shoulder_l', 'elbow_l', 'wrist_l'],
  Shoulder: ['hip_l', 'shoulder_l', 'elbow_l'],
}

/* ── rig builder ─────────────────────────────────────────── */
interface RigOpts {
  W: number
  H: number
  s: number // eased rep depth 0..1
  lean: number // forward torso lean 0..1
  id: string
  angle: CameraAngle
}

function buildPose(o: RigOpts): Pose {
  const { W, H, s, lean, id, angle } = o
  const side = angle === 'Side'
  const front = angle === 'Front'
  const cx = W / 2
  const ground = H * 0.9
  const u = H / 100

  // shared vertical travel — on a front view the whole body bobs at depth
  // so the squat still reads without a visible knee track
  const hipDrop = (id === 'bench' ? 0 : front ? 10 : 15) * s * u
  const armDip = 4 * s * u

  // perspective per viewpoint: 1 = full bilateral, 0 = collapsed to profile
  let sSep = 0
  let hSep = 0
  if (angle === 'Front') {
    sSep = 12 * u
    hSep = 9 * u
  } else if (angle === 'Three-quarter') {
    sSep = 6.5 * u
    hSep = 4.5 * u
  }
  const shoulderX = cx + (side ? 0 : 0) // keep centered
  const hipX = cx

  // ── legs (bench = lying, handled below) ──
  let kneeDrive = 0 // how far knees travel forward at depth (side-ish views)
  if (id === 'squat') kneeDrive = 9 * s
  else if (id === 'lunge') kneeDrive = 7 * s
  else if (id === 'deadlift') kneeDrive = 4 * s

  const kneeY = ground - 22 * u - 2 * s * u
  const hipY = ground - 42 * u + hipDrop
  const shoulderY = hipY - (26 - lean * 9) * u
  const headY = shoulderY - 9 * u

  let ankleL: Pt, kneeL: Pt, hipL: Pt, shoulderL: Pt
  let ankleR: Pt, kneeR: Pt, hipR: Pt, shoulderR: Pt

  if (front) {
    // front view: bilateral stance, knees track OUTWARD at depth (valgus territory)
    const stance = 11 * u
    const kneeOut = (id === 'squat' || id === 'lunge' ? 3.2 : 0.8) * s * u
    const kneeOutR = (id === 'squat' || id === 'lunge' ? 1.6 : 0.4) * s * u
    ankleL = { x: cx - stance, y: ground }
    ankleR = { x: cx + stance, y: ground }
    kneeL = { x: cx - stance * 0.85 - kneeOut, y: kneeY }
    kneeR = { x: cx + stance * 0.85 + kneeOutR, y: kneeY }
    hipL = { x: cx - 7.5 * u, y: hipY }
    hipR = { x: cx + 7.5 * u, y: hipY }
    shoulderL = { x: cx - 11 * u, y: shoulderY }
    shoulderR = { x: cx + 11 * u, y: shoulderY }
  } else {
    // near side (L) anchors — profile / three-quarter
    ankleL = { x: hipX - hSep - 3 * u + kneeDrive * 0.4 * u, y: ground }
    kneeL = { x: hipX - hSep * 0.6 + (3 + kneeDrive) * u, y: kneeY }
    hipL = { x: hipX - hSep, y: hipY }
    shoulderL = { x: shoulderX - sSep + lean * 8 * u, y: shoulderY }

    // far side (R): on a true side view, sit slightly behind & offset (two-leg silhouette)
    const depthOff = side ? -2.2 * u : 0
    const depthDrop = side ? 1.2 * u : 0
    ankleR = { x: hipX + hSep - 3 * u + kneeDrive * 0.4 * u + depthOff, y: ground - depthDrop }
    kneeR = { x: hipX + hSep * 0.6 + (3 + kneeDrive) * u + depthOff, y: kneeY - depthDrop }
    hipR = { x: hipX + hSep + depthOff, y: hipY - depthDrop }
    shoulderR = { x: shoulderX + sSep + lean * 8 * u + depthOff, y: shoulderY - depthDrop }
  }

  // ── arms per lift ──
  let elbowL: Pt, wristL: Pt, elbowR: Pt, wristR: Pt
  if (id === 'ohp') {
    if (front) {
      // front view: elbows flare out, bar travels straight up overhead
      const flare = 7 - 2.5 * (1 - s)
      elbowL = { x: shoulderL.x - flare * u, y: shoulderL.y + 8 * u - 9 * (1 - s) * u }
      wristL = { x: shoulderL.x + 1 * u, y: shoulderL.y + 9 * u - 22 * (1 - s) * u }
      elbowR = { x: shoulderR.x + flare * u, y: shoulderR.y + 8 * u - 9 * (1 - s) * u }
      wristR = { x: shoulderR.x - 1 * u, y: shoulderR.y + 9 * u - 22 * (1 - s) * u }
    } else {
      wristL = { x: shoulderL.x + (side ? 1 : 0.5) * u, y: shoulderL.y + 16 * u - 24 * (1 - s) * u }
      elbowL = { x: shoulderL.x + (side ? 4 : 5.5) * u, y: (shoulderL.y + wristL.y) / 2 + 3 * u }
      const m = (p: Pt): Pt => ({
        x: p.x - shoulderL.x + shoulderR.x,
        y: p.y - shoulderL.y + shoulderR.y + (side ? 0 : 1 * u),
      })
      elbowR = m(elbowL)
      wristR = m(wristL)
    }
  } else if (id === 'bench') {
    // lying on back: torso horizontal
    wristL = { x: shoulderL.x + 2 * u, y: shoulderL.y - 10 * u + 13 * s * u }
    elbowL = { x: shoulderL.x + 7 * u, y: shoulderL.y - 2 * u + 6 * s * u }
    const m = (p: Pt): Pt => ({
      x: p.x - shoulderL.x + shoulderR.x,
      y: p.y - shoulderL.y + shoulderR.y + (side ? 0 : 1 * u),
    })
    elbowR = m(elbowL)
    wristR = m(wristL)
  } else if (id === 'curl') {
    wristL = { x: shoulderL.x + 7 * u, y: shoulderL.y + 22 * u - 13 * (1 - s) * u }
    elbowL = { x: shoulderL.x + 5 * u, y: shoulderL.y + 12 * u }
    if (front) {
      // alternate arms like a real front-view curl set
      wristR = { x: shoulderR.x - 7 * u, y: shoulderR.y + 22 * u - 13 * s * u }
      elbowR = { x: shoulderR.x - 5 * u, y: shoulderR.y + 12 * u }
    } else {
      const m = (p: Pt): Pt => ({
        x: p.x - shoulderL.x + shoulderR.x,
        y: p.y - shoulderL.y + shoulderR.y + (side ? 0 : 1 * u),
      })
      elbowR = m(elbowL)
      wristR = m(wristL)
    }
  } else if (id === 'squat' || id === 'deadlift') {
    if (front) {
      // front view: arms angled in to the bar in front of the torso
      wristL = { x: shoulderL.x + 4 * u, y: shoulderL.y + 11 * u + armDip }
      elbowL = { x: shoulderL.x - 1.5 * u, y: shoulderL.y + 6 * u + armDip }
      wristR = { x: shoulderR.x - 4 * u, y: shoulderR.y + 11 * u + armDip }
      elbowR = { x: shoulderR.x + 1.5 * u, y: shoulderR.y + 6 * u + armDip }
    } else {
      wristL = { x: shoulderL.x + 9 * u, y: shoulderL.y + 4 * u + armDip }
      elbowL = { x: shoulderL.x + 6.5 * u, y: shoulderL.y + 8 * u + armDip }
      const m = (p: Pt): Pt => ({
        x: p.x - shoulderL.x + shoulderR.x,
        y: p.y - shoulderL.y + shoulderR.y + (side ? 0 : 1 * u),
      })
      elbowR = m(elbowL)
      wristR = m(wristL)
    }
  } else {
    // lunge + default: arms at sides
    wristL = { x: shoulderL.x + (front ? -3 : 4) * u, y: shoulderL.y + 24 * u }
    elbowL = { x: shoulderL.x + (front ? -1.5 : 3) * u, y: shoulderL.y + 12 * u }
    const m = (p: Pt): Pt => ({
      x: p.x - shoulderL.x + shoulderR.x,
      y: p.y - shoulderL.y + shoulderR.y + (side ? 0 : 1 * u),
    })
    elbowR = m(elbowL)
    wristR = m(wristL)
  }

  // ── head cluster ──
  const headX = side ? shoulderL.x + 2 * u : shoulderX + lean * 6 * u
  const eyeSep = side ? 1.2 * u : angle === 'Three-quarter' ? 2.2 * u : 3.2 * u
  const nose = { x: headX, y: headY }
  const eyeL = { x: headX - eyeSep, y: headY - 1.2 * u }
  const eyeR = { x: headX + eyeSep, y: headY - 1.2 * u }
  const earL = { x: headX - eyeSep - 1.6 * u, y: headY + 0.4 * u }
  const earR = { x: headX + eyeSep + 1.6 * u, y: headY + 0.4 * u }

  let pose: Pose = {
    nose,
    eye_l: eyeL,
    eye_r: eyeR,
    ear_l: earL,
    ear_r: earR,
    shoulder_l: shoulderL,
    shoulder_r: shoulderR,
    elbow_l: elbowL,
    elbow_r: elbowR,
    wrist_l: wristL,
    wrist_r: wristR,
    hip_l: hipL,
    hip_r: hipR,
    knee_l: kneeL,
    knee_r: kneeR,
    ankle_l: ankleL,
    ankle_r: ankleR,
  }

  // bench: lying flat — rotate the rig: hips/shoulders/head share a line, knees bent up
  if (id === 'bench') {
    const benchY = ground - 16 * u
    const headXb = cx - 24 * u
    const shX = cx - 14 * u
    const hipXb = cx + 8 * u
    pose = {
      nose: { x: headXb, y: benchY - 3 * u },
      eye_l: { x: headXb - 1 * u, y: benchY - 4 * u },
      eye_r: { x: headXb + 2 * u, y: benchY - 4 * u },
      ear_l: { x: headXb - 2 * u, y: benchY - 2 * u },
      ear_r: { x: headXb + 3 * u, y: benchY - 2 * u },
      shoulder_l: { x: shX, y: benchY },
      shoulder_r: { x: shX + (side ? 0 : 2.5 * u), y: benchY + (side ? 0 : 1.5 * u) },
      elbow_l: { x: shX + 5 * u, y: benchY + 2 * u + 4 * s * u },
      elbow_r: { x: shX + 5.5 * u, y: benchY + 3 * u + 4 * s * u },
      wrist_l: { x: shX + 4 * u, y: benchY - 11 * u + 12 * s * u },
      wrist_r: { x: shX + 4.5 * u, y: benchY - 10 * u + 12 * s * u },
      hip_l: { x: hipXb, y: benchY },
      hip_r: { x: hipXb + (side ? 0 : 2.5 * u), y: benchY + (side ? 0 : 1.5 * u) },
      knee_l: { x: hipXb + 9 * u, y: ground - 20 * u },
      knee_r: { x: hipXb + 9.5 * u, y: ground - 19 * u },
      ankle_l: { x: hipXb + 12 * u, y: ground },
      ankle_r: { x: hipXb + 13 * u, y: ground },
    }
  }

  return pose
}

/* ── smoothing (one-euro-ish): kill jitter, keep it floaty ── */
function smoothPose(prev: Pose | null, next: Pose, k: number): Pose {
  if (!prev) return next
  const out = { ...next }
  for (const name of KPS) {
    out[name] = {
      x: prev[name].x + (next[name].x - prev[name].x) * k,
      y: prev[name].y + (next[name].y - prev[name].y) * k,
    }
  }
  return out
}

function jointDeg(a: Pt, v: Pt, b: Pt): number {
  const ang =
    (Math.atan2(a.y - v.y, a.x - v.x) - Math.atan2(b.y - v.y, b.x - v.x)) * (180 / Math.PI)
  return Math.abs(((ang + 540) % 360) - 180)
}

/**
 * Stylized animated pose-estimation overlay — 17 keypoints, perspective
 * rigs for each camera angle, buttery one-euro smoothed motion.
 * Stands in for the real model output while the backend is built.
 */
export default function PoseCanvas({ exercise, severity, active, angle = null }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ exercise, severity, active, angle })
  stateRef.current = { exercise, severity, active, angle }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = parent.clientWidth * dpr
      canvas.height = parent.clientHeight * dpr
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const start = performance.now()
    let smooth: Pose | null = null
    let smoothS = 0
    let lastId: string | null = null

    const draw = (now: number) => {
      const { exercise: ex, severity: sev, active: isActive, angle: ang } = stateRef.current
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)
      if (!ex || !isActive) {
        smooth = null
        lastId = null
        raf = requestAnimationFrame(draw)
        return
      }
      if (lastId !== ex.id) {
        smooth = null
        lastId = ex.id
      }

      const viewpoint: CameraAngle = ang ?? 'Side'
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      /* rep phase with eased in/out + tiny hand-tremor noise (no jitter) */
      const tempo = ex.baseTempo * 1000
      const t = ((now - start) % tempo) / tempo
      const raw = (1 - Math.cos(t * Math.PI * 2)) / 2
      const eased = raw * raw * (3 - 2 * raw) // smoothstep
      smoothS += (eased - smoothS) * 0.08
      const wob = (n: number) => Math.sin(now / 640 + n * 1.7) * 0.35 + Math.sin(now / 291 + n) * 0.2
      const leanTarget =
        ex.id === 'deadlift' ? 0.55 + 0.35 * smoothS : ex.id === 'squat' ? 0.18 + 0.22 * smoothS : 0.08
      const lean = leanTarget + wob(1) * 0.012

      const target = buildPose({ W, H, s: smoothS, lean, id: ex.id, angle: viewpoint })
      const pose = smoothPose(smooth, target, 0.16)
      smooth = pose

      const color = COLORS[sev]
      const u = H / 100
      const lw = Math.max(3, H * 0.011)
      const jr = Math.max(3.2, H * 0.011)
      const headR = 5.2 * u

      /* reference depth line at the hips */
      if (ex.id !== 'bench') {
        ctx.beginPath()
        ctx.moveTo(W * 0.3, pose.hip_l.y)
        ctx.lineTo(W * 0.7, pose.hip_l.y)
        ctx.strokeStyle = 'rgba(20,17,14,0.28)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 5])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      /* halo pass for legibility over video */
      for (const [a, b] of BONES) {
        ctx.beginPath()
        ctx.moveTo(pose[a].x, pose[a].y)
        ctx.lineTo(pose[b].x, pose[b].y)
        ctx.strokeStyle = INK
        ctx.globalAlpha = 0.25
        ctx.lineWidth = lw + 5
        ctx.stroke()
      }

      /* far side dimmer when the view is bilateral */
      const bilateral = viewpoint !== 'Side'
      for (const [a, b] of BONES) {
        const far = bilateral && a.endsWith('_r')
        ctx.beginPath()
        ctx.moveTo(pose[a].x, pose[a].y)
        ctx.lineTo(pose[b].x, pose[b].y)
        ctx.strokeStyle = color
        ctx.globalAlpha = far ? 0.4 : 0.92
        ctx.lineWidth = lw
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      /* head ring */
      ctx.beginPath()
      ctx.arc(pose.nose.x, pose.nose.y, headR, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.globalAlpha = 0.92
      ctx.stroke()
      ctx.globalAlpha = 1

      /* keypoint dots */
      for (const name of KPS) {
        // nose → head ring; eyes/ears → implied by the ring
        if (name === 'nose' || name === 'eye_l' || name === 'eye_r') continue
        const p = pose[name]
        const far = bilateral && name.endsWith('_r')
        ctx.beginPath()
        ctx.arc(p.x, p.y, jr, 0, Math.PI * 2)
        ctx.fillStyle = INK
        ctx.globalAlpha = far ? 0.55 : 1
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.globalAlpha = far ? 0.45 : 0.95
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      /* key-joint angle arc + readout (rounded to kill digit flicker) */
      const [na, nv, nb] = KEY_JOINT_MAP[ex.keyJoint] ?? KEY_JOINT_MAP.Knee
      const deg = jointDeg(pose[na], pose[nv], pose[nb])
      const v = pose[nv]
      const arcR = 16 * (H / 360)
      ctx.beginPath()
      ctx.arc(
        v.x,
        v.y,
        arcR,
        Math.atan2(pose[nb].y - v.y, pose[nb].x - v.x),
        Math.atan2(pose[na].y - v.y, pose[na].x - v.x),
      )
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.75
      ctx.stroke()
      ctx.globalAlpha = 1
      const label = `${ex.keyJoint.toUpperCase()} ${Math.round(deg / 2) * 2}°`
      ctx.font = `600 ${Math.max(11, H * 0.034)}px "JetBrains Mono", ui-monospace, monospace`
      const tw = ctx.measureText(label).width
      const lx = Math.min(Math.max(v.x + arcR + 8, 8), W - tw - 16)
      const ly = v.y - arcR - 6
      ctx.fillStyle = 'rgba(244,241,234,0.9)'
      ctx.fillRect(lx - 5, ly - 13, tw + 10, 19)
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.5
      ctx.strokeRect(lx - 5, ly - 13, tw + 10, 19)
      ctx.fillStyle = color
      ctx.fillText(label, lx, ly)

      /* bench line when benching */
      if (ex.id === 'bench') {
        const ground = H * 0.9
        ctx.beginPath()
        ctx.moveTo(W * 0.18, ground - 16 * u)
        ctx.lineTo(W * 0.62, ground - 16 * u)
        ctx.strokeStyle = 'rgba(20,17,14,0.5)'
        ctx.lineWidth = 4
        ctx.stroke()
      }

      /* ground line */
      ctx.beginPath()
      ctx.moveTo(W * 0.16, H * 0.9 + 2)
      ctx.lineTo(W * 0.84, H * 0.9 + 2)
      ctx.strokeStyle = 'rgba(255,77,0,0.3)'
      ctx.lineWidth = 2 * dpr * 0.5 + 1
      ctx.setLineDash([7, 7])
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
