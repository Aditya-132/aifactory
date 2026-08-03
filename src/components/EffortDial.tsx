import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

const ZONES = [
  { max: 35, label: 'WARM-UP', color: '#0284C7' },
  { max: 60, label: 'WORKING', color: '#14110E' },
  { max: 80, label: 'PUSHING', color: '#D97706' },
  { max: 101, label: 'MAX EFFORT', color: '#DC2626' },
] as const

export function zoneFor(v: number) {
  return ZONES.find((z) => v < z.max) ?? ZONES[ZONES.length - 1]
}

interface EffortDialProps {
  value: number // 0–100
  size?: number
}

/** Spring-animated radial gauge for the fused effort score. */
export default function EffortDial({ value, size = 180 }: EffortDialProps) {
  const spring = useSpring(0, { stiffness: 55, damping: 14 })
  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  const dash = useTransform(spring, (v) => 100 - Math.max(0, Math.min(100, v)))
  const display = useTransform(spring, (v) => String(Math.round(v)).padStart(2, '0'))
  const zone = zoneFor(value)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {/* tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2
          const x1 = 50 + Math.cos(a) * 48.5
          const y1 = 50 + Math.sin(a) * 48.5
          const x2 = 50 + Math.cos(a) * 45.5
          const y2 = 50 + Math.sin(a) * 45.5
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(30 8% 7% / 0.25)"
              strokeWidth="1"
            />
          )
        })}
        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(40 12% 88%)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={zone.color}
          strokeWidth="8"
          pathLength={100}
          strokeDasharray="100"
          style={{ strokeDashoffset: dash }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.p className="mono-data text-4xl font-semibold leading-none">{display}</motion.p>
        <p className="mono-data mt-1 text-[9px] tracking-[0.25em] text-muted-foreground">/ 100</p>
      </div>
    </div>
  )
}
