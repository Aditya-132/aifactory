import { useEffect, useMemo, useState } from 'react'
import { motion, useMotionTemplate, useSpring } from 'framer-motion'
import type { ExerciseDef } from '@/lib/simulation'

/* ── palette ─────────────────────────────────────────────── */
const INK = '#14110E'
const BONE = '#E4DCC9'
const ORANGE = '#FF4D00'
const RED = '#DC2626'
const MUTED = '#7A7263'

/* ── geometry ────────────────────────────────────────────── */
type Shape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }

interface Part {
  id: string
  shape: Shape
  /** highlightable muscle/joint part */
  muscle: boolean
  /** draw as ink-filled decor (shorts) or stroke-only line */
  decor?: 'fill' | 'line'
}

const p = (id: string, d: string, muscle = true): Part => ({ id, shape: { kind: 'path', d }, muscle })
const c = (id: string, cx: number, cy: number, r: number, muscle = true): Part => ({
  id,
  shape: { kind: 'circle', cx, cy, r },
  muscle,
})
const e = (id: string, cx: number, cy: number, rx: number, ry: number): Part => ({
  id,
  shape: { kind: 'ellipse', cx, cy, rx, ry },
  muscle: true,
})

const PARTS: Part[] = [
  /* FRONT figure (centered x≈55) */
  { id: 'head_f', shape: { kind: 'circle', cx: 55, cy: 30, r: 13 }, muscle: false },
  p('neck_f', 'M49,42 L61,42 L61,54 L49,54 Z', false),
  p('traps', 'M40,54 L70,54 L64,68 L46,68 Z'),
  c('delt_l', 33, 72, 11),
  c('delt_r', 77, 72, 11),
  p('pec_l', 'M34,70 Q44,66 54,70 L54,98 Q44,103 34,98 Z'),
  p('pec_r', 'M76,70 Q66,66 56,70 L56,98 Q66,103 76,98 Z'),
  e('bi_l', 32, 100, 6.5, 13),
  e('bi_r', 78, 100, 6.5, 13),
  p('fore_l', 'M26,116 L38,116 L36,158 L28,158 Z'),
  p('fore_r', 'M72,116 L84,116 L82,158 L74,158 Z'),
  { id: 'hand_l', shape: { kind: 'circle', cx: 32, cy: 165, r: 5 }, muscle: false },
  { id: 'hand_r', shape: { kind: 'circle', cx: 78, cy: 165, r: 5 }, muscle: false },
  p('abs', 'M43,104 L67,104 L66,158 L44,158 Z'),
  { id: 'abs_grid', shape: { kind: 'path', d: 'M55,106 L55,156 M44,122 L66,122 M44,140 L66,140' }, muscle: false, decor: 'line' },
  p('obl_l', 'M34,104 L42,104 L41,152 L35,146 Z'),
  p('obl_r', 'M76,104 L68,104 L69,152 L75,146 Z'),
  { id: 'shorts', shape: { kind: 'path', d: 'M36,160 L74,160 L70,188 L55,180 L40,188 Z' }, muscle: false, decor: 'fill' },
  p('quad_l', 'M39,190 Q33,232 41,266 L53,266 Q57,228 53,190 Z'),
  p('quad_r', 'M71,190 Q77,232 69,266 L57,266 Q53,228 57,190 Z'),
  c('knee_l', 47, 272, 4.5),
  c('knee_r', 63, 272, 4.5),
  p('calf_l', 'M41,280 L52,280 L50,328 L43,328 Z'),
  p('calf_r', 'M58,280 L69,280 L67,328 L60,328 Z'),
  { id: 'foot_l', shape: { kind: 'path', d: 'M40,334 L52,334 L52,342 L38,342 Z' }, muscle: false },
  { id: 'foot_r', shape: { kind: 'path', d: 'M58,334 L70,334 L72,342 L58,342 Z' }, muscle: false },

  /* BACK figure (centered x≈165) */
  { id: 'head_b', shape: { kind: 'circle', cx: 165, cy: 30, r: 13 }, muscle: false },
  p('neck_b', 'M159,42 L171,42 L171,52 L159,52 Z', false),
  p('traps_b', 'M165,50 L183,64 L173,102 L157,102 L147,64 Z'),
  c('delt_b_l', 143, 72, 11),
  c('delt_b_r', 187, 72, 11),
  e('tri_l', 138, 102, 6, 13),
  e('tri_r', 192, 102, 6, 13),
  p('fore_b_l', 'M132,118 L144,118 L142,158 L134,158 Z'),
  p('fore_b_r', 'M186,118 L198,118 L196,158 L188,158 Z'),
  { id: 'hand_b_l', shape: { kind: 'circle', cx: 138, cy: 165, r: 5 }, muscle: false },
  { id: 'hand_b_r', shape: { kind: 'circle', cx: 192, cy: 165, r: 5 }, muscle: false },
  p('lat_l', 'M147,104 L162,104 L161,148 L151,166 L144,136 Z'),
  p('lat_r', 'M183,104 L168,104 L169,148 L179,166 L186,136 Z'),
  p('lowerback', 'M152,148 L178,148 L177,182 L153,182 Z'),
  { id: 'lb_line', shape: { kind: 'path', d: 'M165,150 L165,180' }, muscle: false, decor: 'line' },
  c('glute_l', 156, 196, 12),
  c('glute_r', 174, 196, 12),
  p('ham_l', 'M146,212 L162,212 L159,266 L149,266 Z'),
  p('ham_r', 'M168,212 L184,212 L181,266 L171,266 Z'),
  p('calf_b_l', 'M146,278 L158,278 L156,330 L148,330 Z'),
  p('calf_b_r', 'M172,278 L184,278 L182,330 L174,330 Z'),
  { id: 'foot_b_l', shape: { kind: 'path', d: 'M144,336 L158,336 L158,344 L142,344 Z' }, muscle: false },
  { id: 'foot_b_r', shape: { kind: 'path', d: 'M172,336 L186,336 L188,344 L172,344 Z' }, muscle: false },
]

/* ── zoom regions (viewBox rects) ────────────────────────── */
interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const Z: Record<string, Rect> = {
  full: { x: 0, y: 0, w: 220, h: 360 },
  chest: { x: 6, y: 50, w: 98, h: 64 },
  shoulders: { x: 6, y: 38, w: 98, h: 60 },
  shouldersAll: { x: 0, y: 38, w: 220, h: 60 },
  arms: { x: 8, y: 80, w: 94, h: 100 },
  elbows: { x: 0, y: 80, w: 220, h: 100 },
  core: { x: 22, y: 94, w: 66, h: 104 },
  quads: { x: 16, y: 176, w: 78, h: 108 },
  knees: { x: 16, y: 200, w: 78, h: 86 },
  calvesAll: { x: 0, y: 262, w: 220, h: 88 },
  backUpper: { x: 116, y: 38, w: 98, h: 134 },
  back: { x: 116, y: 88, w: 98, h: 104 },
  lowerback: { x: 126, y: 136, w: 78, h: 58 },
  glutes: { x: 126, y: 174, w: 78, h: 48 },
  hams: { x: 120, y: 198, w: 90, h: 88 },
  neck: { x: 36, y: 8, w: 148, h: 56 },
}

/* exercise muscle name → svg parts + zoom */
const MUSCLES: Record<string, { ids: string[]; zoom: Rect }> = {
  Quads: { ids: ['quad_l', 'quad_r'], zoom: Z.quads },
  Glutes: { ids: ['glute_l', 'glute_r'], zoom: Z.glutes },
  Core: { ids: ['abs', 'obl_l', 'obl_r'], zoom: Z.core },
  Hamstrings: { ids: ['ham_l', 'ham_r'], zoom: Z.hams },
  Back: { ids: ['lat_l', 'lat_r', 'lowerback'], zoom: Z.back },
  Chest: { ids: ['pec_l', 'pec_r'], zoom: Z.chest },
  Triceps: { ids: ['tri_l', 'tri_r'], zoom: Z.backUpper },
  'Front Delts': { ids: ['delt_l', 'delt_r'], zoom: Z.shoulders },
  Shoulders: { ids: ['delt_l', 'delt_r', 'delt_b_l', 'delt_b_r', 'traps', 'traps_b'], zoom: Z.shouldersAll },
  Biceps: { ids: ['bi_l', 'bi_r'], zoom: Z.arms },
  Forearms: { ids: ['fore_l', 'fore_r'], zoom: Z.arms },
  Calves: { ids: ['calf_l', 'calf_r', 'calf_b_l', 'calf_b_r'], zoom: Z.calvesAll },
}

/* ── form-cue → what's getting damaged ───────────────────── */
export interface MuscleRisk {
  label: string
  ids: string[]
  zoom: Rect
}

export function riskForCue(cue: string, exercise: ExerciseDef | null): MuscleRisk {
  const t = cue.toLowerCase()
  const r = (label: string, ids: string[], zoom: Rect): MuscleRisk => ({ label, ids, zoom })
  if (/knee/.test(t)) return r('KNEE JOINT', ['quad_l', 'quad_r', 'knee_l', 'knee_r'], Z.knees)
  if (/lumbar|spinal|spine|lean-back|arch/.test(t)) return r('LUMBAR SPINE', ['lowerback'], Z.lowerback)
  if (/wrist/.test(t)) return r('WRISTS', ['fore_l', 'fore_r'], Z.arms)
  if (/shoulder/.test(t)) return r('SHOULDERS', ['delt_l', 'delt_r', 'delt_b_l', 'delt_b_r'], Z.shouldersAll)
  if (/elbow/.test(t)) return r('ELBOWS', ['bi_l', 'bi_r', 'tri_l', 'tri_r', 'fore_l', 'fore_r'], Z.elbows)
  if (/chest|bounc/.test(t)) return r('CHEST / RIBCAGE', ['pec_l', 'pec_r'], Z.chest)
  if (/head|chin|neck/.test(t)) return r('CERVICAL SPINE', ['traps', 'traps_b'], Z.neck)
  if (/glute|lockout|hip/.test(t)) return r('HIPS / GLUTES', ['glute_l', 'glute_r'], Z.glutes)
  if (/swing|sway|momentum/.test(t)) return r('LOWER BACK', ['lowerback'], Z.lowerback)
  if (/heel|foot|feet|ankle|balance/.test(t))
    return r('ANKLES / FEET', ['calf_l', 'calf_r', 'calf_b_l', 'calf_b_r'], Z.calvesAll)
  const name = exercise?.primaryMuscles[0]
  const m = name ? MUSCLES[name] : null
  return m ? r(name!.toUpperCase(), m.ids, m.zoom) : r('FULL BODY', [], Z.full)
}

function union(rects: Rect[]): Rect {
  const x1 = Math.min(...rects.map((r) => r.x))
  const y1 = Math.min(...rects.map((r) => r.y))
  const x2 = Math.max(...rects.map((r) => r.x + r.w))
  const y2 = Math.max(...rects.map((r) => r.y + r.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

function renderShape(part: Part, extra: Record<string, unknown>) {
  const s = part.shape
  if (s.kind === 'circle') return <circle key={part.id} cx={s.cx} cy={s.cy} r={s.r} {...extra} />
  if (s.kind === 'ellipse')
    return <ellipse key={part.id} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...extra} />
  return <path key={part.id} d={s.d} {...extra} />
}

/* ── component ───────────────────────────────────────────── */
interface MuscleMapProps {
  exercise: ExerciseDef | null
  /** when set, the map locks onto the at-risk structure in red */
  risk?: MuscleRisk | null
  /** static overview (no cycling, no caption) — used in the summary */
  compact?: boolean
  className?: string
}

export default function MuscleMap({ exercise, risk = null, compact = false, className = '' }: MuscleMapProps) {
  const primaries = exercise?.primaryMuscles ?? []

  const [focusIdx, setFocusIdx] = useState(0)
  useEffect(() => setFocusIdx(0), [exercise?.id])

  // auto-tour: zoom through each trained muscle while the set is clean
  useEffect(() => {
    if (!exercise || risk || compact || primaries.length < 2) return
    const i = window.setInterval(() => setFocusIdx((f) => f + 1), 2600)
    return () => window.clearInterval(i)
  }, [exercise, risk, compact, primaries.length])

  const focusName = primaries.length ? primaries[focusIdx % primaries.length] : null
  const focusMuscle = focusName ? MUSCLES[focusName] : null

  const trainedIds = useMemo(
    () => new Set(primaries.flatMap((m) => MUSCLES[m]?.ids ?? [])),
    [primaries],
  )
  const riskIds = useMemo(() => new Set(risk?.ids ?? []), [risk])

  const target: Rect = risk
    ? risk.zoom
    : exercise
      ? compact
        ? union(primaries.map((m) => MUSCLES[m]?.zoom ?? Z.full))
        : (focusMuscle?.zoom ?? Z.full)
      : Z.full

  const sx = useSpring(Z.full.x, { stiffness: 85, damping: 20 })
  const sy = useSpring(Z.full.y, { stiffness: 85, damping: 20 })
  const sw = useSpring(Z.full.w, { stiffness: 85, damping: 20 })
  const sh = useSpring(Z.full.h, { stiffness: 85, damping: 20 })
  useEffect(() => {
    sx.set(target.x)
    sy.set(target.y)
    sw.set(target.w)
    sh.set(target.h)
  }, [target.x, target.y, target.w, target.h, sx, sy, sw, sh])
  const viewBox = useMotionTemplate`${sx} ${sy} ${sw} ${sh}`

  return (
    <div className={className}>
      <motion.svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className={compact ? 'h-36 w-full' : 'h-64 w-full'}
      >
        {PARTS.map((part) => {
          if (part.decor === 'line')
            return renderShape(part, { fill: 'none', stroke: INK, strokeWidth: 1.4 })
          if (part.decor === 'fill') return renderShape(part, { fill: INK, stroke: INK, strokeWidth: 2 })
          if (!part.muscle) return renderShape(part, { fill: BONE, stroke: INK, strokeWidth: 2 })

          const isRisk = riskIds.has(part.id)
          const isTrained = trainedIds.has(part.id)
          const isFocus = !compact && !risk && focusMuscle?.ids.includes(part.id)
          const fill = isRisk ? RED : isTrained ? ORANGE : BONE
          const cls = isRisk ? 'muscle-risk' : isFocus ? 'muscle-focus' : undefined
          return renderShape(part, {
            fill,
            stroke: INK,
            strokeWidth: 2,
            className: cls,
            opacity: risk && !isRisk && isTrained ? 0.45 : 1,
          })
        })}
        <text x={55} y={357} textAnchor="middle" fill={MUTED} fontSize={8} fontFamily="JetBrains Mono" letterSpacing={2}>
          FRONT
        </text>
        <text x={165} y={357} textAnchor="middle" fill={MUTED} fontSize={8} fontFamily="JetBrains Mono" letterSpacing={2}>
          BACK
        </text>
      </motion.svg>

      {!compact && (
        <div className="mono-data flex items-center justify-between gap-2 border-t-2 border-foreground px-3 py-2 text-[9px] font-semibold tracking-[0.2em]">
          {risk ? (
            <motion.span
              key={`r-${risk.label}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-red-600"
            >
              <span className="blink-rec inline-block h-2 w-2 bg-red-600" />
              STRAIN RISK — {risk.label}
            </motion.span>
          ) : exercise && focusName ? (
            <motion.span
              key={focusName}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-foreground"
            >
              TARGETING — {focusName.toUpperCase()}
            </motion.span>
          ) : (
            <span className="text-muted-foreground">AWAITING DETECTION</span>
          )}
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block h-2 w-2" style={{ background: ORANGE }} /> WORK
            <span className="inline-block h-2 w-2" style={{ background: RED }} /> RISK
          </span>
        </div>
      )}
    </div>
  )
}
