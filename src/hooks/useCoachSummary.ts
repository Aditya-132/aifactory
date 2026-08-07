import { useCallback, useState } from 'react'

import { parseCoachSummaryResponse, type CoachSummaryBullet } from '@/lib/aiCoachSummary'

export type CoachSummaryStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CoachSummaryState {
  status: CoachSummaryStatus
  bullets: CoachSummaryBullet[]
  error: string | null
}

const INITIAL_STATE: CoachSummaryState = {
  status: 'idle',
  bullets: [],
  error: null,
}

/**
 * Client for the dev-server /api/coach-summary middleware.
 *
 * The hook owns request state only — prompt construction lives in
 * `src/lib/aiCoachSummary.ts` and the HTTP call goes to the same origin, so
 * the provider API key never reaches the browser bundle.
 */
export function useCoachSummary() {
  const [state, setState] = useState<CoachSummaryState>(INITIAL_STATE)

  const requestSummary = useCallback(async (feedMessages: string[]) => {
    setState({ status: 'loading', bullets: [], error: null })
    try {
      const response = await fetch('/api/coach-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed: feedMessages }),
      })
      const body = (await response.json().catch(() => null)) as
        | { bullets?: unknown; error?: unknown }
        | null

      if (!response.ok) {
        const message =
          body && typeof body.error === 'string'
            ? body.error
            : `Summary request failed (${response.status})`
        setState({ status: 'error', bullets: [], error: message })
        return null
      }

      const bullets = parseCoachSummaryResponse(body)
      if (!bullets) {
        setState({
          status: 'error',
          bullets: [],
          error: 'Summary response was not in the expected format',
        })
        return null
      }

      setState({ status: 'ready', bullets, error: null })
      return bullets
    } catch {
      setState({
        status: 'error',
        bullets: [],
        error: 'Could not reach the summary endpoint',
      })
      return null
    }
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { ...state, requestSummary, reset }
}
