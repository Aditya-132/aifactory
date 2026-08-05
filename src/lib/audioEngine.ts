import { getStoredSettings } from './workoutStore'

class AudioFeedbackEngine {
  private audioCtx: AudioContext | null = null
  private speechDebounceTimer: number | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {})
    }
    return this.audioCtx
  }

  /** Play synthesized audio tones for rep completion, start countdown, warning, or critical alerts */
  playTone(type: 'rep' | 'warn' | 'crit' | 'start' | 'go') {
    try {
      const settings = getStoredSettings()
      if (!settings.audioFeedback) return

      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'rep') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, now) // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12) // A5
        gain.gain.setValueAtTime(0.12, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
        osc.start(now)
        osc.stop(now + 0.22)
      } else if (type === 'start') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(440, now)
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
        osc.start(now)
        osc.stop(now + 0.12)
      } else if (type === 'go') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(880, now)
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
        osc.start(now)
        osc.stop(now + 0.25)
      } else if (type === 'warn') {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(329.63, now) // E4
        gain.gain.setValueAtTime(0.1, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
        osc.start(now)
        osc.stop(now + 0.28)
      } else if (type === 'crit') {
        osc.type = 'square'
        osc.frequency.setValueAtTime(220, now) // A3
        osc.frequency.setValueAtTime(164.81, now + 0.15) // E3
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38)
        osc.start(now)
        osc.stop(now + 0.38)
      }
    } catch {
      // Failures do not interrupt workout flow
    }
  }

  /** Speak HUD cue using Web Speech API TTS with queueing & debouncing */
  speakCue(text: string, isCritical = false) {
    try {
      const settings = getStoredSettings()
      if (!settings.audioFeedback) return
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      const synth = window.speechSynthesis

      if (isCritical) {
        synth.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.05
        utterance.pitch = 1.0
        utterance.volume = 0.95
        synth.speak(utterance)
        return
      }

      if (this.speechDebounceTimer) {
        window.clearTimeout(this.speechDebounceTimer)
      }

      this.speechDebounceTimer = window.setTimeout(() => {
        if (!synth.speaking) {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.rate = 1.0
          utterance.volume = 0.8
          synth.speak(utterance)
        }
      }, 300)
    } catch {
      // Failures do not interrupt workout flow
    }
  }

  cancelAll() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    } catch {}
  }
}

export const audioEngine = new AudioFeedbackEngine()
