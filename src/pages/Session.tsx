import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  Activity,
  ArrowLeft,
  Camera,
  CircleStop,
  Dumbbell,
  Flame,
  Gauge,
  ScanFace,
  Timer,
  TriangleAlert,
  Upload,
  Video,
  Zap,
} from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PoseCanvas from '@/components/PoseCanvas'
import {
  EXERCISES,
  angleForExercise,
  effortZone,
  simulateRep,
  type CameraAngle,
  type ExerciseDef,
  type FeedItem,
  type RepData,
  type SessionPhase,
} from '@/lib/simulation'

type Source = 'camera' | 'upload' | 'demo' | null

const SEV_STYLE: Record<FeedItem['severity'], string> = {
  good: 'text-primary border-primary/30 bg-primary/5',
  warn: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  crit: 'text-red-400 border-red-400/30 bg-red-400/5',
  info: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Session() {
  const [phase, setPhase] = useState<SessionPhase>('setup')
  const [source, setSource] = useState<Source>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [exercise, setExercise] = useState<ExerciseDef | null>(null)
  const [angle, setAngle] = useState<CameraAngle | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [reps, setReps] = useState<RepData[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const repTimerRef = useRef<number | null>(null)
  const clockRef = useRef<number | null>(null)
  const feedIdRef = useRef(0)
  const repsRef = useRef<RepData[]>([])

  const pushFeed = useCallback((message: string, severity: FeedItem['severity']) => {
    setFeed((f) => [{ id: feedIdRef.current++, time: now(), message, severity }, ...f].slice(0, 40))
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const clearTimers = useCallback(() => {
    if (repTimerRef.current) window.clearTimeout(repTimerRef.current)
    if (clockRef.current) window.clearInterval(clockRef.current)
    repTimerRef.current = null
    clockRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      clearTimers()
      stopCamera()
    }
  }, [clearTimers, stopCamera])

  const scheduleNextRep = useCallback(
    (ex: ExerciseDef) => {
      const nextIndex = repsRef.current.length + 1
      const prev = repsRef.current[repsRef.current.length - 1]
      const delay = prev ? prev.tempo * 1000 : ex.baseTempo * 1000
      repTimerRef.current = window.setTimeout(() => {
        const rep = simulateRep(nextIndex, ex)
        repsRef.current = [...repsRef.current, rep]
        setReps(repsRef.current)
        pushFeed(rep.cue, rep.severity)
        if (rep.effort >= 85) {
          pushFeed(`Effort at ${rep.effort}% — facial strain & bar speed say you're grinding`, 'info')
        }
        scheduleNextRep(ex)
      }, delay)
    },
    [pushFeed],
  )

  const beginAnalysis = useCallback(
    (picked?: ExerciseDef) => {
      const ex = picked ?? EXERCISES[Math.floor(Math.random() * EXERCISES.length)]
      setPhase('analyzing')
      pushFeed('Pose model initializing — tracking 17 keypoints…', 'info')
      window.setTimeout(() => {
        setExercise(ex)
        setAngle(angleForExercise(ex))
        setConfidence(88 + Math.floor(Math.random() * 10))
        setPhase('live')
        pushFeed(
          `Movement classified: ${ex.name}. Best viewing angle locked — ${ex.keyJoint.toLowerCase()} angle tracked.`,
          'info',
        )
        pushFeed('Set started — rep counting live', 'info')
        clockRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
        scheduleNextRep(ex)
      }, 2600)
    },
    [pushFeed, scheduleNextRep],
  )

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      setSource('camera')
      if (videoRef.current) videoRef.current.srcObject = stream
      beginAnalysis()
    } catch {
      setCameraError('Camera access was blocked. Allow camera permission, upload a video, or use demo mode.')
      setSource('demo')
    }
  }

  const startUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setSource('upload')
    beginAnalysis()
  }

  const startDemo = () => {
    setSource('demo')
    beginAnalysis()
  }

  const overrideExercise = (id: string) => {
    const ex = EXERCISES.find((e) => e.id === id)
    if (!ex) return
    clearTimers()
    setExercise(ex)
    setAngle(angleForExercise(ex))
    setConfidence(91 + Math.floor(Math.random() * 7))
    pushFeed(`Exercise corrected to ${ex.name} — recalibrating tracking`, 'info')
    clockRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    scheduleNextRep(ex)
  }

  const endSession = () => {
    clearTimers()
    stopCamera()
    setPhase('ended')
    setSummaryOpen(true)
  }

  const reset = () => {
    clearTimers()
    stopCamera()
    repsRef.current = []
    setPhase('setup')
    setSource(null)
    setVideoUrl(null)
    setExercise(null)
    setAngle(null)
    setReps([])
    setFeed([])
    setElapsed(0)
    setSummaryOpen(false)
  }

  const latest = reps[reps.length - 1]
  const avgForm = reps.length ? Math.round(reps.reduce((a, r) => a + r.formScore, 0) / reps.length) : 0
  const effort = latest?.effort ?? 0
  const zone = effortZone(effort)
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" aria-label="Back home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold tracking-tight">
                FormFit<span className="text-primary">AI</span>
              </span>
            </div>
            <Badge variant="outline" className="ml-2 border-primary/40 text-primary">
              Demo · simulated analysis
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {phase === 'live' && (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  {mm}:{ss}
                </span>
                <Button variant="destructive" size="sm" onClick={endSession}>
                  <CircleStop className="mr-2 h-4 w-4" /> End set
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video / camera panel */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black">
              {/* video source */}
              {source === 'camera' && (
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              )}
              {source === 'upload' && videoUrl && (
                <video src={videoUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
              )}
              {source === 'demo' && <div className="bg-grid absolute inset-0 opacity-60" />}

              {/* setup overlay */}
              {phase === 'setup' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 p-6 text-center">
                  <div>
                    <h1 className="text-2xl font-bold">Start a set</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Point a camera at your lift, upload a clip, or try the simulated demo.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button size="lg" className="volt-glow font-semibold" onClick={startCamera}>
                      <Camera className="mr-2 h-5 w-5" /> Use camera
                    </Button>
                    <Button size="lg" variant="secondary" asChild>
                      <label className="cursor-pointer">
                        <Upload className="mr-2 h-5 w-5" /> Upload video
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) startUpload(f)
                          }}
                        />
                      </label>
                    </Button>
                    <Button size="lg" variant="outline" onClick={startDemo}>
                      <Zap className="mr-2 h-5 w-5" /> Demo mode
                    </Button>
                  </div>
                  {cameraError && (
                    <p className="flex max-w-md items-center gap-2 text-sm text-amber-400">
                      <TriangleAlert className="h-4 w-4 shrink-0" /> {cameraError}
                    </p>
                  )}
                </div>
              )}

              {/* analyzing overlay */}
              {phase === 'analyzing' && (
                <div className="absolute inset-0">
                  <div className="scanline" />
                  <div className="absolute inset-x-0 bottom-6 flex justify-center">
                    <Badge className="volt-glow bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                      <ScanFace className="mr-2 h-4 w-4 animate-pulse" /> Detecting movement &amp; camera angle…
                    </Badge>
                  </div>
                </div>
              )}

              {/* pose overlay */}
              <PoseCanvas exercise={exercise} severity={latest?.severity ?? 'good'} active={phase === 'live'} />

              {/* viewfinder corners */}
              {phase === 'live' && (
                <>
                  {['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map(
                    (c) => (
                      <span key={c} className={`absolute h-7 w-7 border-primary/70 ${c}`} />
                    ),
                  )}
                  <Badge className="absolute left-1/2 top-3 -translate-x-1/2 border-primary/40 bg-black/60 text-primary" variant="outline">
                    {exercise?.name} · {angle} view
                  </Badge>
                </>
              )}
            </div>

            {/* rep chart */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Activity className="h-4 w-4 text-primary" /> Rep tempo &amp; form score
                </CardTitle>
              </CardHeader>
              <CardContent className="h-44">
                {reps.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Reps will chart here once your set starts.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={reps} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid stroke="hsl(240 5% 14%)" vertical={false} />
                      <XAxis dataKey="rep" tick={{ fill: 'hsl(240 4% 60%)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="l" domain={[0, 100]} tick={{ fill: 'hsl(240 4% 60%)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="r" orientation="right" unit="s" tick={{ fill: 'hsl(240 4% 60%)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(240 8% 7%)', border: '1px solid hsl(240 5% 16%)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'hsl(240 4% 60%)' }}
                      />
                      <Bar yAxisId="l" dataKey="formScore" name="Form score" fill="hsl(78 100% 54%)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      <Line yAxisId="r" type="monotone" dataKey="tempo" name="Tempo (s)" stroke="hsl(199 89% 60%)" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right rail */}
          <div className="flex flex-col gap-4">
            {/* detection card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ScanFace className="h-4 w-4 text-primary" /> Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {exercise ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">{exercise.name}</span>
                      <Badge className="bg-primary/15 text-primary">{confidence}% conf.</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        <Video className="mr-1 h-3 w-3" /> {angle} angle
                      </Badge>
                      {exercise.primaryMuscles.map((m) => (
                        <Badge key={m} variant="outline" className="text-muted-foreground">
                          {m}
                        </Badge>
                      ))}
                    </div>
                    <div className="pt-1">
                      <p className="mb-1 text-xs text-muted-foreground">Wrong exercise? Correct it:</p>
                      <Select value={exercise.id} onValueChange={overrideExercise}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXERCISES.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {phase === 'analyzing' ? 'Classifying movement…' : 'No movement detected yet.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center">
                <CardContent className="p-3">
                  <p className="text-3xl font-black text-primary">{reps.length}</p>
                  <p className="text-xs text-muted-foreground">Reps</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-3">
                  <p className="text-3xl font-black">{latest ? latest.tempo.toFixed(1) : '—'}</p>
                  <p className="text-xs text-muted-foreground">s / rep</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-3">
                  <p className={`text-3xl font-black ${avgForm >= 80 ? 'text-primary' : avgForm >= 65 ? 'text-amber-400' : avgForm ? 'text-red-400' : ''}`}>
                    {avgForm || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Form score</p>
                </CardContent>
              </Card>
            </div>

            {/* effort meter */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-primary" /> Effort level
                  </span>
                  <span className={`text-sm font-bold ${zone.color}`}>{zone.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-end justify-between">
                  <span className="text-4xl font-black">{phase === 'live' ? effort : '—'}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <Progress value={phase === 'live' ? effort : 0} className="h-3" />
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" /> Fused from rep count, rep-speed decay and facial strain cues.
                </p>
              </CardContent>
            </Card>

            {/* live feedback */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Timer className="h-4 w-4 text-primary" /> Live coaching
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-56 pr-3">
                  {feed.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Coaching cues will appear here.</p>
                  ) : (
                    <ul className="space-y-2">
                      {feed.map((item) => (
                        <li key={item.id} className={`rounded-md border px-3 py-2 text-xs ${SEV_STYLE[item.severity]}`}>
                          <span className="mr-2 font-mono opacity-60">{item.time}</span>
                          {item.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Summary dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Set summary — {exercise?.name}</DialogTitle>
            <DialogDescription>
              {mm}:{ss} · {angle} view · simulated analysis
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Reps', value: reps.length },
              { label: 'Avg form', value: avgForm || '—' },
              { label: 'Peak effort', value: reps.length ? Math.max(...reps.map((r) => r.effort)) : '—' },
              {
                label: 'Avg tempo',
                value: reps.length ? `${(reps.reduce((a, r) => a + r.tempo, 0) / reps.length).toFixed(1)}s` : '—',
              },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-black text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="mb-1 font-semibold text-primary">Coach's note</p>
            <p className="text-muted-foreground">
              {avgForm >= 80
                ? 'Strong set. Technique held up under fatigue — keep this load or add a little next time.'
                : avgForm >= 65
                  ? 'Solid work, but form slipped as fatigue built. Consider dropping 5–10% and owning every rep.'
                  : reps.length
                    ? 'Form broke down early. Lighter load, slower tempo, and film from the side for cleaner tracking.'
                    : 'No reps recorded — start a set to get a full breakdown.'}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              New session
            </Button>
            <Button onClick={() => setSummaryOpen(false)}>Review footage</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
