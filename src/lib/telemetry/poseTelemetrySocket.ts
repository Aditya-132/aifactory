import type { PoseTelemetryEnvelope, PoseTelemetryInput } from './types'

const MAX_RECONNECT_ATTEMPTS = 3
const MAX_BUFFERED_BYTES = 256 * 1024

/** The only place where the fallback wire contract is defined. */
export function serializePoseTelemetry(input: PoseTelemetryInput): string {
  const envelope: PoseTelemetryEnvelope = {
    type: 'pose_telemetry',
    version: 1,
    sessionId: input.sessionId,
    timestampMs: input.timestampMs,
    source: input.source,
    exercise: {
      label: input.exercise.label,
      confidence: Math.max(0, Math.min(1, input.exercise.confidence)),
    },
    rep: {
      phase: input.phase,
      count: input.repCount,
      completed: input.completedRep,
    },
    landmarks: input.landmarks.map(({ x, y, z, visibility }) => ({
      x,
      y,
      ...(z === undefined ? {} : { z }),
      ...(visibility === undefined ? {} : { visibility }),
    })),
  }
  return JSON.stringify(envelope)
}

/** A lossy, bounded publisher: pose inference is never delayed for the network. */
export class PoseTelemetrySocket {
  private socket: WebSocket | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private intentionallyClosed = false
  private readonly url: string

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    if (
      this.intentionallyClosed ||
      !this.url ||
      this.socket?.readyState === WebSocket.CONNECTING ||
      this.socket?.readyState === WebSocket.OPEN
    ) return

    try {
      const socket = new WebSocket(this.url)
      this.socket = socket
      socket.addEventListener('open', () => {
        if (socket !== this.socket) return
        this.reconnectAttempts = 0
      })
      socket.addEventListener('error', () => {
        // The close event owns reconnection. Errors stay isolated from inference.
      })
      socket.addEventListener('close', () => {
        if (socket !== this.socket) return
        this.socket = null
        this.scheduleReconnect()
      })
    } catch {
      this.socket = null
      this.scheduleReconnect()
    }
  }

  send(input: PoseTelemetryInput): boolean {
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    if (socket.bufferedAmount > MAX_BUFFERED_BYTES) return false
    try {
      socket.send(serializePoseTelemetry(input))
      return true
    } catch {
      return false
    }
  }

  close(): void {
    this.intentionallyClosed = true
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    const socket = this.socket
    this.socket = null
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      socket.close(1000, 'Session ended')
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
    const delayMs = 500 * 2 ** this.reconnectAttempts
    this.reconnectAttempts += 1
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delayMs)
  }
}
