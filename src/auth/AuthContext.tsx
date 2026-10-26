import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type UserInfo } from '../api/auth'
import { setUnauthorizedHandler, tokenStore } from '../api/client'
import { isAllowed } from './access'

interface AuthState {
  user: UserInfo | null
  loading: boolean
  login: (userId: string, password: string) => Promise<void>
  logout: () => void
  can: (position: number) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(() => tokenStore.get() !== null)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    authApi.me().then(setUser).catch(logout).finally(() => setLoading(false))
  }, [logout])

  const login = useCallback(async (userId: string, password: string) => {
    const res = await authApi.login(userId, password)
    tokenStore.set(res.token)
    setUser(res.user)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, logout, can: (p) => isAllowed(user?.access, p) }),
    [user, loading, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
