import { useState } from 'react'
import type { RepData, CameraAngle } from './simulation'

export interface UserSettings {
  cameraAnglePreference: CameraAngle | 'Auto'
  sensitivity: 'Strict' | 'Standard' | 'Lenient'
  effortAlertThreshold: number
  audioFeedback: boolean
}

export interface StoredSession {
  id: string
  timestamp: string
  exerciseName: string
  exerciseId: string
  cameraAngle: CameraAngle
  durationSeconds: number
  totalReps: number
  avgFormScore: number
  peakEffort: number
  reps: RepData[]
}

const SETTINGS_STORAGE_KEY = 'aifactory_user_settings'
const HISTORY_STORAGE_KEY = 'aifactory_session_history'

export const DEFAULT_SETTINGS: UserSettings = {
  cameraAnglePreference: 'Auto',
  sensitivity: 'Standard',
  effortAlertThreshold: 85,
  audioFeedback: true,
}

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings to localStorage', e)
  }
}

export function getSessionHistory(): StoredSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveSessionToHistory(session: Omit<StoredSession, 'id' | 'timestamp'>): StoredSession {
  const newSession: StoredSession = {
    ...session,
    id: `sess_${Date.now()}`,
    timestamp: new Date().toISOString(),
  }
  try {
    const history = getSessionHistory()
    const updated = [newSession, ...history].slice(0, 10) // keep latest 10
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error('Failed to save session history', e)
  }
  return newSession
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings)

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      saveStoredSettings(updated)
      return updated
    })
  }

  return { settings, updateSettings }
}
