import { CssBaseline, useMediaQuery } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { colorThemes, createAppTheme, type ColorThemeId } from './theme'

export type ModePreference = 'system' | 'light' | 'dark'
export interface ThemePreference { mode: ModePreference; color: ColorThemeId }

const defaults: ThemePreference = { mode: 'system', color: 'blue' }
const lastKey = 'genesis.theme'
const userKey = (userId: string) => `genesis.theme.${userId.toLowerCase()}`

// eslint-disable-next-line react-refresh/only-export-components
export function loadPreference(userId: string | undefined): ThemePreference {
  try {
    const raw = (userId && localStorage.getItem(userKey(userId))) || localStorage.getItem(lastKey)
    const v = raw ? (JSON.parse(raw) as Partial<ThemePreference>) : {}
    return {
      mode: v.mode === 'light' || v.mode === 'dark' || v.mode === 'system' ? v.mode : defaults.mode,
      color: v.color && v.color in colorThemes ? v.color : defaults.color,
    }
  } catch {
    return defaults
  }
}

function savePreference(userId: string | undefined, pref: ThemePreference) {
  try {
    const json = JSON.stringify(pref)
    localStorage.setItem(lastKey, json)
    if (userId) localStorage.setItem(userKey(userId), json)
  } catch { /* storage unavailable: keep the choice for this session only */ }
}

interface ThemeState extends ThemePreference {
  /** The mode actually shown (system resolved). */
  resolvedMode: 'light' | 'dark'
  setMode: (mode: ModePreference) => void
  setColor: (color: ColorThemeId) => void
}

const ThemeStateContext = createContext<ThemeState | null>(null)

/** Light/dark mode and colour theme, remembered per user in localStorage; defaults to the OS light/dark preference. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.userId
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true })
  // Re-read the stored choice whenever the signed-in user changes.
  const [state, setState] = useState(() => ({ userId, pref: loadPreference(userId) }))
  const pref = state.userId === userId ? state.pref : loadPreference(userId)
  if (state.userId !== userId) setState({ userId, pref })

  const update = useCallback((patch: Partial<ThemePreference>) => {
    setState((s) => {
      const next = { ...s.pref, ...patch }
      savePreference(s.userId, next)
      return { ...s, pref: next }
    })
  }, [])

  const resolvedMode = pref.mode === 'system' ? (prefersDark ? 'dark' : 'light') : pref.mode
  const theme = useMemo(() => createAppTheme(resolvedMode, pref.color), [resolvedMode, pref.color])
  const value = useMemo<ThemeState>(() => ({
    ...pref, resolvedMode, setMode: (mode) => update({ mode }), setColor: (color) => update({ color }),
  }), [pref, resolvedMode, update])

  return (
    <ThemeStateContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeStateContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppTheme(): ThemeState {
  const ctx = useContext(ThemeStateContext)
  if (!ctx) throw new Error('useAppTheme must be used inside AppThemeProvider')
  return ctx
}
