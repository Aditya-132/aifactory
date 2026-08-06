import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import type { CoachSummary } from '@/lib/api'

export type CoachNoteState = 'offline' | 'pending' | 'complete' | 'failed'

export default function CoachNote({
  state,
  summary,
  fallback,
}: {
  state: CoachNoteState
  summary: CoachSummary | null
  fallback: string
}) {
  const showLive = state === 'complete' && summary?.summary

  return (
    <div className="border-2 border-foreground bg-primary/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="mono-data text-[10px] font-semibold tracking-[0.25em] text-primary">
          COACH&apos;S BIOMECHANICAL ASSESSMENT
        </p>
        {state === 'pending' && (
          <span className="mono-data flex items-center gap-2 text-[10px] tracking-[0.2em] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> WRITING
          </span>
        )}
        {showLive && (
          <span className="mono-data flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> {summary?.model?.toUpperCase() ?? 'AI COACH'}
          </span>
        )}
      </div>

      {showLive ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {summary?.headline && (
            <p className="mt-2 text-base font-bold leading-snug">{summary.headline}</p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{summary?.summary}</p>

          {summary && summary.focusAreas.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {summary.focusAreas.map((cue) => (
                <li key={cue} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                  <span className="mono-data mt-0.5 text-[10px] text-primary">▸</span>
                  {cue}
                </li>
              ))}
            </ul>
          )}

          {summary?.nextSession && (
            <p className="mono-data mt-3 border-t-2 border-foreground/15 pt-2 text-[11px] leading-relaxed tracking-wide text-muted-foreground">
              NEXT SESSION — {summary.nextSession}
            </p>
          )}
        </motion.div>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{fallback}</p>
          {state === 'pending' && (
            <p className="mono-data mt-2 text-[10px] tracking-wide text-muted-foreground">
              YOUR COACH IS READING THE REP TELEMETRY…
            </p>
          )}
          {state === 'failed' && (
            <p className="mono-data mt-2 text-[10px] tracking-wide text-muted-foreground">
              COACH SUMMARY UNAVAILABLE{summary?.error ? ` — ${summary.error.toUpperCase()}` : ''}
            </p>
          )}
        </>
      )}
    </div>
  )
}
