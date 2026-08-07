import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, api, getStoredToken, setStoredToken } from './api'
import type { PublicUser } from './api'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>(() =>
    getStoredToken() ? 'loading' : 'anonymous',
  )

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return

    let cancelled = false
    api
      .me(token)
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) setStoredToken(null)
        setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const token = await api.login(email, password)
    setStoredToken(token.accessToken)
    setUser(token.user)
    setStatus('authenticated')
  }, [])

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const token = await api.signup(email, password, displayName)
    setStoredToken(token.accessToken)
    setUser(token.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    setStoredToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({ user, status, login, signup, logout }),
    [user, status, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
