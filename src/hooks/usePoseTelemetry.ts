import { useCallback, useEffect, useRef } from 'react'
import { PoseTelemetrySocket } from '@/lib/telemetry/poseTelemetrySocket'
import type { PoseTelemetryInput } from '@/lib/telemetry/types'

interface UsePoseTelemetryOptions {
  active: boolean
  lifecycleKey: string
}

export function usePoseTelemetry({ active, lifecycleKey }: UsePoseTelemetryOptions) {
  const socketRef = useRef<PoseTelemetrySocket | null>(null)
  const sessionIdRef = useRef('')
  const endpoint = (import.meta.env.VITE_POSE_WS_URL as string | undefined)?.trim() ?? ''

  useEffect(() => {
    if (!active || !endpoint) return
    sessionIdRef.current = crypto.randomUUID()
    const socket = new PoseTelemetrySocket(endpoint)
    socketRef.current = socket
    socket.connect()
    return () => {
      socket.close()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [active, endpoint, lifecycleKey])

  const publish = useCallback((input: Omit<PoseTelemetryInput, 'sessionId'>) => {
    const socket = socketRef.current
    if (!socket) return false
    return socket.send({ ...input, sessionId: sessionIdRef.current })
  }, [])

  return { enabled: Boolean(endpoint), publish }
}
