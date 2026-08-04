import { useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts'
import { Gauge, Zap, Activity } from 'lucide-react'
import type { RepData } from '@/lib/simulation'

interface VelocityAngleChartProps {
  reps: RepData[]
  targetAngle?: number
}

export default function VelocityAngleChart({ reps, targetAngle = 90 }: VelocityAngleChartProps) {
  const [activeTab, setActiveTab] = useState<'velocity' | 'angle'>('velocity')

  if (!reps || reps.length === 0) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center border-2 border-dashed border-foreground/20 bg-background/50 p-4 text-center">
        <Activity className="h-6 w-6 text-muted-foreground/50" />
        <p className="mono-data mt-2 text-[10px] tracking-[0.2em] text-muted-foreground">
          NO TELEMETRY DATA YET — START SET TO STREAM METRICS
        </p>
      </div>
    )
  }

  const chartData = reps.map((r) => ({
    repLabel: `R${r.rep}`,
    concentric: r.concentricTime,
    eccentric: r.eccentricTime,
    totalTempo: r.tempo,
    velocity: r.velocity,
    peakAngle: r.peakAngle,
    formScore: r.formScore,
    effort: r.effort,
  }))

  return (
    <div className="flex flex-col gap-3">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b-2 border-foreground pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('velocity')}
            className={`mono-data flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold tracking-[0.15em] transition-colors ${
              activeTab === 'velocity'
                ? 'border-2 border-foreground bg-primary text-primary-foreground hard-shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Zap className="h-3.5 w-3.5" /> VELOCITY & TEMPO DECAY
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('angle')}
            className={`mono-data flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold tracking-[0.15em] transition-colors ${
              activeTab === 'angle'
                ? 'border-2 border-foreground bg-primary text-primary-foreground hard-shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Gauge className="h-3.5 w-3.5" /> PEAK JOINT ANGLE
          </button>
        </div>
        <span className="mono-data hidden text-[9px] tracking-[0.2em] text-muted-foreground sm:inline-block">
          RECHARTS TELEMETRY FEED
        </span>
      </div>

      {/* Chart View */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'velocity' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="repLabel" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fontFamily: 'monospace' }} unit="s" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontFamily: 'monospace' }} unit="°/s" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#14110E',
                  borderColor: '#FF4D00',
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
              <Bar yAxisId="left" dataKey="concentric" name="Concentric (s)" stackId="a" fill="#FF4D00" />
              <Bar yAxisId="left" dataKey="eccentric" name="Eccentric (s)" stackId="a" fill="#2563EB" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="velocity"
                name="Rep Speed (°/s)"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="repLabel" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} unit="°" domain={[40, 180]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#14110E',
                  borderColor: '#FF4D00',
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
              <ReferenceLine y={targetAngle} stroke="#EF4444" strokeDasharray="4 4" label={{ value: `Target (${targetAngle}°)`, fill: '#EF4444', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="peakAngle"
                name="Peak Angle (°)"
                stroke="#FF4D00"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#FF4D00' }}
              />
              <Line
                type="monotone"
                dataKey="formScore"
                name="Form Score (0-100)"
                stroke="#8B5CF6"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
