# FormFit AI

AI-powered lifting coach — hackathon build.

Point a camera at your lift (or upload a clip) and the app detects the exercise and
camera angle, counts reps, grades your form rep by rep, and reads your effort from
rep count, rep-speed decay and facial strain cues — then coaches you live.

## Status

**Frontend complete, AI analysis currently simulated in the browser.** The pose
overlay, exercise classification, rep timing, form scores and effort metrics are
produced by a demo engine (`src/lib/simulation.ts`) that mirrors the shape of the
real model output, so the backend can be swapped in without UI changes.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Recharts (rep tempo / form charting)
- lucide-react icons

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## App flow

- `/` — landing page
- `/session` — live set analysis:
  - Start from **camera** (`getUserMedia`), **video upload**, or **demo mode**
  - Movement classification (exercise + camera angle, with confidence)
  - Animated pose-estimation overlay with key-joint angle readout
  - Rep counter, rep tempo, live form score (0–100) with coaching cues
  - Effort meter (0–100) fusing reps, tempo decay and strain cues
  - End-of-set summary with stats and a coach's note

## Where the AI plugs in

`src/lib/simulation.ts` exports `simulateRep()`, `ExerciseDef` and the feed/effort
types consumed by `src/pages/Session.tsx`. Replace the simulated rep generator and
classifier with real inference (pose model + form/effort heuristics) and the UI
will render it unchanged.
