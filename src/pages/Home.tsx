import { Link } from 'react-router'
import {
  ArrowRight,
  Camera,
  Dumbbell,
  Flame,
  Gauge,
  Move3d,
  ScanFace,
  Upload,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const FEATURES = [
  {
    icon: ScanFace,
    title: 'Exercise recognition',
    body: 'The model watches your movement and classifies the lift — squat, deadlift, bench, press, curl, lunge — no manual logging.',
  },
  {
    icon: Move3d,
    title: 'Any camera angle',
    body: 'Front, side, three-quarter or rear — detection figures out the viewpoint and tracks the joints that matter for that lift.',
  },
  {
    icon: Gauge,
    title: 'Live form assessment',
    body: 'Joint angles are scored rep by rep. Knee valgus, lumbar rounding, elbow flare — you get the cue the moment it happens.',
  },
  {
    icon: Flame,
    title: 'Effort detection',
    body: 'Rep count, rep-speed decay and facial strain are fused into a 0–100 effort score, so you know when a set is truly done.',
  },
]

const STEPS = [
  { icon: Camera, title: 'Turn on your camera', body: 'Prop your phone up or upload a clip — any angle works.' },
  { icon: Zap, title: 'Just lift', body: 'The AI identifies the exercise, counts reps and scores your form in real time.' },
  { icon: Gauge, title: 'Get coached', body: 'Instant cues mid-set, plus a full breakdown when you rack the weight.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">
              FormFit<span className="text-primary">AI</span>
            </span>
          </div>
          <Link to="/session">
            <Button size="sm" className="font-semibold">
              Start a set <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-grid relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 text-center sm:pt-28">
          <Badge variant="outline" className="mb-6 border-primary/40 px-3 py-1 text-primary">
            AI-powered lifting coach
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Your camera is now your <span className="text-glow text-primary">coach</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            FormFit AI watches your set, detects the exercise and angle, grades your form rep by
            rep, and reads your effort from your speed, reps and face. No wearables. No logging.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/session">
              <Button size="lg" className="volt-glow px-8 font-semibold">
                <Camera className="mr-2 h-5 w-5" /> Start lifting
              </Button>
            </Link>
            <Link to="/session">
              <Button size="lg" variant="outline">
                <Upload className="mr-2 h-5 w-5" /> Upload a clip
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Everything a coach sees, <span className="text-primary">automated</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Three steps. Zero setup.</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="volt-glow mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-4 font-mono text-xs text-primary">0{i + 1}</p>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/session">
              <Button size="lg" className="volt-glow px-10 font-semibold">
                Try it now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Demo build — analysis is simulated in the browser while the AI backend is being wired up.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        FormFit AI · hackathon build
      </footer>
    </div>
  )
}
