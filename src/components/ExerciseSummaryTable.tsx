import type { RepData } from '@/lib/simulation'

interface ExerciseSummaryTableProps {
  reps: RepData[]
}

const SEV_BADGE: Record<RepData['severity'], { label: string; style: string }> = {
  good: { label: 'GOOD', style: 'bg-emerald-500/10 text-emerald-600 border-emerald-600' },
  warn: { label: 'WARNING', style: 'bg-amber-500/10 text-amber-600 border-amber-600' },
  crit: { label: 'CRITICAL', style: 'bg-red-500/10 text-red-600 border-red-600' },
}

export default function ExerciseSummaryTable({ reps }: ExerciseSummaryTableProps) {
  if (!reps || reps.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground font-mono">
        No rep data recorded for this session.
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto border-2 border-foreground bg-background hard-shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-foreground bg-muted text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            <th className="p-2.5 text-center">Rep #</th>
            <th className="p-2.5">Duration (Conc / Ecc)</th>
            <th className="p-2.5 text-right">Peak Angle</th>
            <th className="p-2.5 text-right">Rep Speed</th>
            <th className="p-2.5 text-center">Form Status</th>
            <th className="p-2.5">Flaws Detected</th>
          </tr>
        </thead>
        <tbody className="divide-y border-foreground/20 text-xs font-mono">
          {reps.map((r) => {
            const badge = SEV_BADGE[r.severity]
            return (
              <tr key={r.rep} className="hover:bg-muted/40 transition-colors">
                <td className="p-2.5 text-center font-bold">#{r.rep}</td>
                <td className="p-2.5">
                  <span className="font-semibold">{r.tempo}s</span>{' '}
                  <span className="text-[10px] text-muted-foreground">
                    ({r.concentricTime}s / {r.eccentricTime}s)
                  </span>
                </td>
                <td className="p-2.5 text-right font-semibold">{r.peakAngle}°</td>
                <td className="p-2.5 text-right text-emerald-600 font-semibold">{r.velocity} °/s</td>
                <td className="p-2.5 text-center">
                  <span
                    className={`inline-block border px-2 py-0.5 text-[9px] font-bold tracking-wider ${badge.style}`}
                  >
                    {badge.label}
                  </span>
                </td>
                <td className="p-2.5">
                  {r.flaws && r.flaws.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {r.flaws.map((flaw, idx) => (
                        <span
                          key={idx}
                          className="bg-red-100 text-red-800 border border-red-300 text-[9px] px-1.5 py-0.5 rounded font-sans font-medium"
                        >
                          {flaw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">Clean execution</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
