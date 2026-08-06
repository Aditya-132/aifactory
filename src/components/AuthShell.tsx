import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

const MARKS = [
  ['REP 04', 'FORM 92'],
  ['REP 05', 'FORM 88'],
  ['REP 06', 'FORM 71'],
]

export default function AuthShell({
  eyebrow,
  title,
  accent,
  blurb,
  children,
}: {
  eyebrow: string
  title: string
  accent: string
  blurb: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="noise" />

      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            FORMFIT<span className="text-primary">*</span>
          </Link>
          <Link
            to="/"
            className="mono-data flex items-center gap-2 text-xs tracking-[0.2em] hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> BACK
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r-2 border-foreground bg-foreground px-8 py-16 lg:block">
          <div className="bg-grid-dark absolute inset-0 opacity-60" />
          <div className="relative">
            <p className="mono-data text-xs tracking-[0.3em] text-background/60">{eyebrow}</p>
            <h2 className="mt-6 text-5xl font-black uppercase leading-[0.95] text-background">
              Every rep
              <br />
              you lift
              <br />
              <span className="font-serifit italic lowercase text-primary">is on record.</span>
            </h2>
            <p className="mt-6 max-w-sm text-background/70">
              An account keeps your sets, your rep-by-rep telemetry and your coach summaries
              across devices. Without one, everything stays in this browser.
            </p>

            <div className="mt-12 space-y-2">
              {MARKS.map(([rep, form], i) => (
                <motion.div
                  key={rep}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.6, ease: EASE }}
                  className="mono-data flex items-center justify-between border-2 border-background/25 px-4 py-2 text-xs tracking-[0.15em] text-background/80"
                >
                  <span>{rep}</span>
                  <span className={i === 2 ? 'text-primary' : ''}>{form}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center px-4 py-12 sm:px-10 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="w-full max-w-md"
          >
            <p className="mono-data text-xs tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-[0.95] sm:text-5xl">
              {title}
              <br />
              <span className="font-serifit italic lowercase text-primary">{accent}</span>
            </h1>
            <p className="mt-4 text-muted-foreground">{blurb}</p>

            <div className="hard-shadow mt-8 border-2 border-foreground bg-card p-6">{children}</div>
          </motion.div>
        </section>
      </div>
    </div>
  )
}
