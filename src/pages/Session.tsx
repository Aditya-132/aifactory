import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  Camera,
  CircleStop,
  Flame,
  MessagesSquare,
  ScanFace,
  Timer,
  TriangleAlert,
  Upload,
  Video,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import EffortDial, { zoneFor } from '@/components/EffortDial'
import VelocityAngleChart from '@/components/VelocityAngleChart'
import ExerciseSummaryTable from '@/components/ExerciseSummaryTable'
import SettingsModal from '@/components/SettingsModal'
import { saveSessionToHistory } from '@/lib/workoutStore'
import {
  EXERCISES,
  angleForExercise,
  simulateRep,
  type CameraAngle,
  type ExerciseDef,
  type FeedItem,
  type RepData,
  type SessionPhase,
} from '@/lib/simulation'

type Source = 'camera' | 'upload' | 'demo' | null
type MobileTab = 'coach' | 'data'

const SEV_STYLE: Record<FeedItem['severity'], string> = {
  good: 'border-emerald-600 bg-emerald-50 text-emerald-950',
  warn: 'border-amber-600 bg-amber-50 text-amber-950',
  crit: 'border-red-600 bg-red-50 text-red-950',
  info: 'border-blue-600 bg-blue-50 text-blue-950',
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
  const [tab, setTab] = useState<MobileTab>('coach')

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

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(EXERCISES[0].id)
  const [selectedCameraAngle, setSelectedCameraAngle] = useState<CameraAngle>('Side')

  const beginAnalysis = useCallback(
    () => {
      const chosenEx = EXERCISES.find((e) => e.id === selectedExerciseId) || EXERCISES[0]
      const chosenAngle = selectedCameraAngle || angleForExercise(chosenEx)
      setExercise(chosenEx)
      setAngle(chosenAngle)

      setPhase('analyzing')
      pushFeed('Pose model initializing — tracking 17 keypoints…', 'info')
      window.setTimeout(() => {
        setConfidence(92 + Math.floor(Math.random() * 6))
        setPhase('live')
        pushFeed(
          `Movement locked: ${chosenEx.name}. Viewport set to ${chosenAngle.toUpperCase()} view — ${chosenEx.keyJoint.toLowerCase()} angle tracked.`,
          'info',
        )
        pushFeed('Set started — rep counting live', 'info')
        clockRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
        scheduleNextRep(chosenEx)
      }, 2400)
    },
    [selectedExerciseId, selectedCameraAngle, pushFeed, scheduleNextRep],
  )

  const startCamera = async () => {
    setCameraError(null)
    try {
      // rear camera on phones — that's the one pointed at the lifter
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
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

  // /session?demo=1 jumps straight into a simulated set (handy for hackathon judging)
  const autoDemoRef = useRef(false)
  useEffect(() => {
    if (autoDemoRef.current) return
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      autoDemoRef.current = true
      startDemo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])



  const endSession = useCallback(() => {
    clearTimers()
    stopCamera()
    setPhase('ended')
    setSummaryOpen(true)
    pushFeed('Set complete — calculating final form & effort breakdown', 'info')

    if (exercise && angle) {
      saveSessionToHistory({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        cameraAngle: angle,
        durationSeconds: elapsed,
        totalReps: repsRef.current.length,
        avgFormScore: repsRef.current.length
          ? Math.round(repsRef.current.reduce((a, r) => a + r.formScore, 0) / repsRef.current.length)
          : 0,
        peakEffort: repsRef.current.length ? Math.max(...repsRef.current.map((r) => r.effort)) : 0,
        reps: repsRef.current,
      })
    }
  }, [clearTimers, stopCamera, pushFeed, exercise, angle, elapsed])

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
    setTab('coach')
  }

  const latest = reps[reps.length - 1]
  const avgForm = reps.length
    ? Math.round(reps.reduce((acc, r) => acc + r.formScore, 0) / reps.length)
    : 0
  const effort = latest ? latest.effort : 0
  const zone = zoneFor(effort)
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  const statTiles = [
    { label: 'REPS', value: reps.length, key: reps.length, accent: true },
    { label: 'S / REP', value: latest ? latest.tempo.toFixed(1) : '—', key: latest?.tempo ?? 0, accent: false },
    { label: 'FORM', value: avgForm || '—', key: avgForm, accent: false },
  ]

  const chartEl = (
    <div className="p-3">
      <VelocityAngleChart reps={reps} targetAngle={exercise?.id === 'squat' ? 110 : 90} />
    </div>
  )

  const feedEl = (
    <div className="max-h-64 overflow-y-auto p-3 lg:max-h-72">
      {feed.length === 0 ? (
        <p className="mono-data p-2 text-[10px] tracking-[0.25em] text-muted-foreground">
          CUES LAND HERE MID-SET
        </p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {feed.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className={`border-2 px-3 py-2 text-xs ${SEV_STYLE[item.severity]}`}
              >
                <span className="mono-data mr-2 text-[9px] opacity-60">{item.time}</span>
                {item.message}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )

  return (
    <div className="min-h-screen touch-manipulation bg-background pb-24 lg:pb-0">
      <div className="noise" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="icon" aria-label="Back home" className="border-2 border-transparent hover:border-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <span className="text-xl font-bold tracking-tight">
              FORMFIT<span className="text-primary">*</span>
            </span>
            <span className="mono-data hidden border-2 border-foreground bg-secondary px-2 py-0.5 text-[9px] font-semibold tracking-[0.25em] sm:inline-block">
              SIMULATED ANALYSIS
            </span>
          </div>
          {/* top bar action items: Settings, Reopen Summary, End Set, New Set */}
          <div className="flex items-center gap-2">
            <SettingsModal />

            {phase === 'ended' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSummaryOpen(true)}
                  className="hard-shadow-sm border-2 border-foreground bg-primary font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  <Activity className="mr-1.5 h-3.5 w-3.5" /> SUMMARY
                </Button>
                <Button
                  size="sm"
                  onClick={reset}
                  className="hard-shadow-sm border-2 border-foreground bg-foreground font-bold text-background transition-transform hover:-translate-y-0.5"
                >
                  NEW SET
                </Button>
              </>
            )}

            {phase === 'live' && (
              <>
                <span className="mono-data hidden items-center gap-2 text-xs font-semibold tracking-[0.2em] sm:flex">
                  <span className="blink-rec inline-block h-2.5 w-2.5 rounded-full bg-primary" />
                  REC {mm}:{ss}
                </span>
                <Button
                  size="sm"
                  onClick={endSession}
                  className="hard-shadow-sm border-2 border-foreground bg-destructive font-bold text-destructive-foreground transition-transform hover:-translate-y-0.5"
                >
                  <CircleStop className="mr-1.5 h-4 w-4" /> END SET
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 lg:py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          {/* ── Video panel (shared, responsive) ── */}
          <div className="lg:col-span-2">
            <div className="hard-shadow relative aspect-[4/5] overflow-hidden border-2 border-foreground bg-foreground sm:aspect-video">
              {/* video source */}
              {source === 'camera' && (
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              )}
              {source === 'upload' && videoUrl && (
                <video src={videoUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
              )}
              {source === 'demo' && <div className="bg-grid absolute inset-0 bg-background" />}

              {/* setup overlay */}
              {phase === 'setup' && (
                <div className="bg-grid absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background p-6 text-center z-10 overflow-y-auto">
                  <div>
                    <p className="mono-data text-[10px] tracking-[0.3em] text-primary">WORKOUT SETUP</p>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-bold uppercase tracking-tight">
                      Configure your <span className="font-serifit normal-case italic text-primary">set</span>
                    </h1>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                      Select your exercise movement and camera angle before pressing start.
                    </p>
                  </div>

                  {/* Pre-workout configuration selectors */}
                  <div className="w-full max-w-xs space-y-3 border-2 border-foreground bg-card p-3 hard-shadow-sm text-left">
                    <div>
                      <label className="mono-data block text-[10px] font-bold tracking-wider text-foreground mb-1">
                        1. SELECT EXERCISE
                      </label>
                      <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                        <SelectTrigger className="h-9 w-full border-2 font-mono text-xs font-semibold bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-2 font-mono text-xs">
                          {EXERCISES.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} ({e.primaryMuscles[0]})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mono-data block text-[10px] font-bold tracking-wider text-foreground mb-1">
                        2. SELECT CAMERA ANGLE
                      </label>
                      <Select value={selectedCameraAngle} onValueChange={(val) => setSelectedCameraAngle(val as CameraAngle)}>
                        <SelectTrigger className="h-9 w-full border-2 font-mono text-xs font-semibold bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-2 font-mono text-xs">
                          <SelectItem value="Side">Side View (Squat / Deadlift)</SelectItem>
                          <SelectItem value="Front">Front View (OHP / Curl)</SelectItem>
                          <SelectItem value="Three-quarter">Three-Quarter View (Bench)</SelectItem>
                          <SelectItem value="Rear">Rear View</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex w-full max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
                    <Button
                      size="lg"
                      className="hard-shadow-sm h-11 w-full border-2 border-foreground font-bold transition-transform hover:-translate-y-0.5 sm:w-auto"
                      onClick={startCamera}
                    >
                      <Camera className="mr-2 h-4 w-4" /> START CAMERA
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="hard-shadow-sm h-11 w-full border-2 border-foreground bg-card font-bold transition-transform hover:-translate-y-0.5 sm:w-auto"
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" /> UPLOAD VIDEO
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
                    <Button
                      size="lg"
                      variant="outline"
                      className="hard-shadow-sm h-11 w-full border-2 border-foreground bg-foreground font-bold text-background transition-transform hover:-translate-y-0.5 hover:bg-foreground sm:w-auto"
                      onClick={startDemo}
                    >
                      <Zap className="mr-2 h-4 w-4" /> DEMO MODE
                    </Button>
                  </div>
                  {cameraError && (
                    <p className="flex max-w-md items-center gap-2 border-2 border-amber-600 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
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
                    <motion.span
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mono-data hard-shadow-sm border-2 border-foreground bg-primary px-4 py-2 text-xs font-semibold tracking-[0.2em] text-primary-foreground"
                    >
                      DETECTING MOVEMENT &amp; ANGLE…
                    </motion.span>
                  </div>
                </div>
              )}

              {/* pose overlay */}
              <PoseCanvas exercise={exercise} angle={angle} severity={latest?.severity ?? 'good'} active={phase === 'live'} />

              {/* ended phase banner overlay if summary modal is closed */}
              {phase === 'ended' && !summaryOpen && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 p-6 text-center backdrop-blur-sm z-20">
                  <div className="hard-shadow max-w-sm border-2 border-foreground bg-card p-6 space-y-4">
                    <p className="mono-data text-[10px] font-semibold tracking-[0.25em] text-primary">SET COMPLETE</p>
                    <h2 className="text-xl font-bold uppercase">
                      {exercise?.name} — {reps.length} Reps
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Session data saved. Re-open the telemetry breakdown or start a new set.
                    </p>
                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                      <Button
                        size="sm"
                        onClick={() => setSummaryOpen(true)}
                        className="hard-shadow-sm flex-1 border-2 border-foreground bg-primary font-bold text-primary-foreground"
                      >
                        <Activity className="mr-1.5 h-3.5 w-3.5" /> VIEW SUMMARY
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={reset}
                        className="hard-shadow-sm flex-1 border-2 border-foreground bg-background font-bold"
                      >
                        NEW SET
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* viewfinder furniture */}
              {phase === 'live' && (
                <>
                  {['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map(
                    (c) => (
                      <span key={c} className={`absolute h-6 w-6 border-primary ${c}`} />
                    ),
                  )}
                  <motion.span
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mono-data absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap border-2 border-foreground bg-background px-3 py-1 text-[10px] font-semibold tracking-[0.2em]"
                  >
                    {exercise?.name.toUpperCase()} — {angle?.toUpperCase()}
                  </motion.span>
                </>
              )}
            </div>

            {/* desktop chart */}
            <div className="hard-shadow-sm mt-6 hidden border-2 border-foreground bg-card lg:block">
              <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-2.5">
                <Activity className="h-4 w-4 text-primary" />
                <span className="mono-data text-[10px] font-semibold tracking-[0.25em]">
                  REP TEMPO × FORM SCORE
                </span>
              </div>
              {chartEl}
            </div>
          </div>

          {/* ── Mobile stack ── */}
          <div className="mt-5 space-y-5 lg:hidden">
            {/* stats strip */}
            <div className="grid grid-cols-3 gap-3">
              {statTiles.map((s) => (
                <div key={s.label} className="hard-shadow-sm border-2 border-foreground bg-card p-2.5 text-center">
                  <motion.p
                    key={String(s.key)}
                    initial={{ scale: 1.3, color: '#FF4D00' }}
                    animate={{ scale: 1, color: s.accent ? '#FF4D00' : '#14110E' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="mono-data text-2xl font-semibold"
                  >
                    {s.value}
                  </motion.p>
                  <p className="mono-data mt-0.5 text-[8px] tracking-[0.25em] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* compact effort row */}
            <div className="hard-shadow-sm flex items-center justify-between border-2 border-foreground bg-card px-4 py-3">
              <div>
                <p className="mono-data flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.25em]">
                  <Flame className="h-4 w-4 text-primary" /> EFFORT
                </p>
                <motion.p
                  key={zone.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mono-data mt-1 text-xs font-semibold tracking-[0.25em]"
                  style={{ color: zone.color }}
                >
                  {zone.label}
                </motion.p>
              </div>
              <EffortDial value={phase === 'live' || phase === 'ended' ? effort : 0} size={92} />
            </div>

            {/* compact detection */}
            <div className="hard-shadow-sm border-2 border-foreground bg-card">
              <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-2">
                <ScanFace className="h-4 w-4 text-primary" />
                <span className="mono-data text-[10px] font-semibold tracking-[0.25em]">DETECTION</span>
              </div>
              <div className="p-3">
                <AnimatePresence mode="wait">
                  {exercise ? (
                    <motion.div
                      key={exercise.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serifit text-xl italic leading-none">{exercise.name}</span>
                        <span className="mono-data flex items-center gap-2 text-[10px]">
                          <span className="border-2 border-foreground bg-foreground px-1.5 py-0.5 tracking-widest text-background">
                            {angle?.toUpperCase()}
                          </span>
                          <span className="border-2 border-foreground bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground">
                            {confidence}%
                          </span>
                        </span>
                      </div>
                      <Select value={exercise.id} onValueChange={overrideExercise}>
                        <SelectTrigger className="mt-3 h-10 w-full border-2 text-sm font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-2">
                          {EXERCISES.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mono-data text-[10px] tracking-[0.25em] text-muted-foreground"
                    >
                      {phase === 'analyzing' ? 'CLASSIFYING MOVEMENT…' : 'NO MOVEMENT DETECTED YET'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* tabs: coaching / chart */}
            <div className="hard-shadow-sm border-2 border-foreground bg-card">
              <div className="grid grid-cols-2 border-b-2 border-foreground">
                {(
                  [
                    ['coach', MessagesSquare, 'COACHING'],
                    ['data', Activity, 'DATA'],
                  ] as const
                ).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`mono-data flex h-11 items-center justify-center gap-2 text-[10px] font-semibold tracking-[0.25em] transition-colors ${
                      tab === id ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
              {tab === 'coach' ? feedEl : chartEl}
            </div>
          </div>

          {/* ── Desktop right rail ── */}
          <div className="hidden flex-col gap-5 lg:flex">
            {/* detection card */}
            <div className="hard-shadow-sm border-2 border-foreground bg-card">
              <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-2.5">
                <ScanFace className="h-4 w-4 text-primary" />
                <span className="mono-data text-[10px] font-semibold tracking-[0.25em]">DETECTION</span>
              </div>
              <div className="space-y-3 p-4">
                <AnimatePresence mode="wait">
                  {exercise ? (
                    <motion.div
                      key={exercise.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serifit text-2xl italic leading-none">{exercise.name}</span>
                        <span className="mono-data border-2 border-foreground bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {confidence}%
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="mono-data flex items-center gap-1 border-2 border-foreground bg-foreground px-2 py-0.5 text-[10px] tracking-widest text-background">
                          <Video className="h-3 w-3" /> {angle?.toUpperCase()}
                        </span>
                        {exercise.primaryMuscles.map((m) => (
                          <span key={m} className="mono-data border-2 border-foreground/30 px-2 py-0.5 text-[10px] tracking-widest text-muted-foreground">
                            {m.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <div className="pt-2">
                        <p className="mono-data mb-1 text-[9px] tracking-[0.25em] text-muted-foreground flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> SESSION LOCKED
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Exercise &amp; camera angle are locked for this set to preserve telemetry integrity.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mono-data text-[10px] tracking-[0.25em] text-muted-foreground"
                    >
                      {phase === 'analyzing' ? 'CLASSIFYING MOVEMENT…' : 'NO MOVEMENT DETECTED YET'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {statTiles.map((s) => (
                <div key={s.label} className="hard-shadow-sm border-2 border-foreground bg-card p-3 text-center">
                  <motion.p
                    key={String(s.key)}
                    initial={{ scale: 1.3, color: '#FF4D00' }}
                    animate={{ scale: 1, color: s.accent ? '#FF4D00' : '#14110E' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="mono-data text-3xl font-semibold"
                  >
                    {s.value}
                  </motion.p>
                  <p className="mono-data mt-1 text-[9px] tracking-[0.25em] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* effort dial */}
            <div className="hard-shadow-sm border-2 border-foreground bg-card">
              <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
                <span className="mono-data flex items-center gap-2 text-[10px] font-semibold tracking-[0.25em]">
                  <Flame className="h-4 w-4 text-primary" /> EFFORT LEVEL
                </span>
                <motion.span
                  key={zone.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mono-data text-[10px] font-semibold tracking-[0.25em]"
                  style={{ color: zone.color }}
                >
                  {zone.label}
                </motion.span>
              </div>
              <div className="flex items-center justify-around gap-4 p-5">
                <EffortDial value={phase === 'live' || phase === 'ended' ? effort : 0} size={150} />
                <p className="mono-data max-w-[130px] text-[9px] leading-relaxed tracking-[0.15em] text-muted-foreground">
                  FUSED FROM REP COUNT, REP-SPEED DECAY &amp; FACIAL STRAIN CUES
                </p>
              </div>
            </div>

            {/* live coaching feed */}
            <div className="hard-shadow-sm flex-1 border-2 border-foreground bg-card">
              <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-2.5">
                <Timer className="h-4 w-4 text-primary" />
                <span className="mono-data text-[10px] font-semibold tracking-[0.25em]">LIVE COACHING</span>
              </div>
              {feedEl}
            </div>
          </div>
        </div>
      </main>

      {/* mobile sticky action bar while a set is live */}
      <AnimatePresence>
        {phase === 'live' && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-background lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="mono-data flex items-center gap-2 text-xs font-semibold tracking-[0.15em]">
                <span className="blink-rec inline-block h-2.5 w-2.5 rounded-full bg-primary" />
                REC {mm}:{ss}
              </span>
              <Button
                onClick={endSession}
                className="hard-shadow-sm h-11 border-2 border-foreground bg-destructive px-6 font-bold text-destructive-foreground"
              >
                <CircleStop className="mr-1.5 h-4 w-4" /> END SET
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="hard-shadow max-h-[92dvh] overflow-y-auto border-2 border-foreground bg-card sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serifit text-2xl italic">
              Set summary — {exercise?.name}
            </DialogTitle>
            <DialogDescription className="mono-data text-[10px] tracking-[0.25em]">
              {angle?.toUpperCase()} VIEW — TELEMETRY BREAKDOWN
            </DialogDescription>
          </DialogHeader>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'REPS', value: reps.length },
              { label: 'AVG FORM', value: avgForm || '—' },
              { label: 'PEAK EFFORT', value: reps.length ? `${Math.max(...reps.map((r) => r.effort))}%` : '—' },
              {
                label: 'AVG TEMPO',
                value: reps.length ? `${(reps.reduce((a, r) => a + r.tempo, 0) / reps.length).toFixed(1)}s` : '—',
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="hard-shadow-sm border-2 border-foreground bg-background p-3 text-center"
              >
                <p className="mono-data text-2xl font-semibold text-primary">{s.value}</p>
                <p className="mono-data mt-1 text-[8px] tracking-[0.25em] text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Velocity & Angle Telemetry Graph */}
          <div className="border-2 border-foreground bg-background p-4 hard-shadow-sm space-y-2">
            <p className="mono-data text-[10px] font-bold tracking-[0.2em] text-primary">POST-WORKOUT TELEMETRY ANALYTICS</p>
            <VelocityAngleChart reps={reps} targetAngle={exercise?.id === 'squat' ? 110 : 90} />
          </div>

          {/* Rep-by-Rep Exercise Summary Table */}
          <div className="space-y-2">
            <p className="mono-data text-[10px] font-bold tracking-[0.2em] text-foreground">REP-BY-REP BREAKDOWN TABLE</p>
            <ExerciseSummaryTable reps={reps} />
          </div>

          {/* Coach's note */}
          <div className="border-2 border-foreground bg-primary/10 p-4">
            <p className="mono-data text-[10px] font-semibold tracking-[0.25em] text-primary">COACH'S NOTE</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              {avgForm >= 80
                ? 'Strong set. Technique held up under fatigue — keep this load or add a little next time.'
                : avgForm >= 65
                  ? 'Solid work, but form slipped as fatigue built. Consider dropping 5–10% and owning every rep.'
                  : reps.length
                    ? 'Form broke down early. Lighter load, slower tempo, and film from the side for cleaner tracking.'
                    : 'No reps recorded — start a set to get a full breakdown.'}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" className="hard-shadow-sm h-12 border-2 font-bold sm:h-10" onClick={reset}>
              NEW SESSION
            </Button>
            <Button className="hard-shadow-sm h-12 border-2 border-foreground bg-foreground font-bold text-background hover:bg-foreground/90 sm:h-10" onClick={() => setSummaryOpen(false)}>
              CLOSE SUMMARY
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
