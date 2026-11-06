import { alpha, createTheme, darken, lighten, type PaletteMode, type Theme } from '@mui/material/styles'

/** Colour tokens for the legacy-form look, so screens never hard-code colours and stay readable in dark mode. */
export interface LegacyPalette {
  /** The dark bar across the top of a legacy form. */
  titleBar: string
  titleBarText: string
  /** The yellow read-only boxes of the legacy forms (case number, WS No, status). */
  readOnly: string
  /** The cyan read-only boxes (Invoice Processing). */
  readOnlyAlt: string
  /** Red emphasised labels ("TOTAL RECORDS", "Records"). */
  emphasis: string
  /** A cell the user has typed into (worksheet grid). */
  highlight: string
  /** A row that cannot be processed (member deletion). */
  dangerRow: string
  /** Table header background. */
  tableHead: string
}

declare module '@mui/material/styles' {
  interface Palette { legacy: LegacyPalette }
  interface PaletteOptions { legacy?: LegacyPalette }
}

export type ColorThemeId = 'blue' | 'teal' | 'indigo' | 'green'

export const colorThemes: Record<ColorThemeId, { label: string; primary: string; secondary: string }> = {
  blue: { label: 'Blue', primary: '#1e5bb8', secondary: '#0f8a9d' },
  teal: { label: 'Teal', primary: '#0b7d7a', secondary: '#3b5bdb' },
  indigo: { label: 'Indigo', primary: '#5146c7', secondary: '#b5367a' },
  green: { label: 'Green', primary: '#2e7d4f', secondary: '#1e6fb8' },
}

const fontFamily = '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif'

export function createAppTheme(mode: PaletteMode, colorTheme: ColorThemeId): Theme {
  const dark = mode === 'dark'
  const c = colorThemes[colorTheme] ?? colorThemes.blue
  const primary = dark ? lighten(c.primary, 0.45) : c.primary
  const secondary = dark ? lighten(c.secondary, 0.3) : c.secondary
  const bg = dark ? { default: '#0f141a', paper: '#161d26' } : { default: '#f3f5f9', paper: '#ffffff' }
  const divider = dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'

  const legacy: LegacyPalette = {
    titleBar: dark ? darken(c.primary, 0.45) : darken(c.primary, 0.55),
    titleBarText: '#ffffff',
    readOnly: dark ? 'rgba(250, 204, 21, 0.14)' : '#fff8c5',
    readOnlyAlt: dark ? 'rgba(34, 211, 238, 0.14)' : '#d3f5fb',
    emphasis: dark ? '#ff8a80' : '#c62828',
    highlight: dark ? 'rgba(251, 146, 60, 0.22)' : '#ffe0b2',
    dangerRow: dark ? 'rgba(244, 67, 54, 0.16)' : '#fdecea',
    tableHead: dark ? alpha(primary, 0.16) : alpha(c.primary, 0.08),
  }

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: secondary },
      background: bg,
      divider,
      text: dark ? { primary: '#e6ebf2', secondary: '#9aa7b8' } : { primary: '#1b2433', secondary: '#5b6678' },
      legacy,
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily,
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.1 },
      h6: { fontWeight: 650, letterSpacing: 0.2 },
      subtitle2: { fontWeight: 650 },
    },
  })

  const { palette: p } = theme
  const focusRing = `0 0 0 3px ${alpha(p.primary.main, dark ? 0.35 : 0.2)}`

  return createTheme(theme, {
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: p.background.default },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': { backgroundColor: alpha(p.text.primary, 0.22), borderRadius: 8, border: `2px solid ${p.background.default}` },
          '*::-webkit-scrollbar-thumb:hover': { backgroundColor: alpha(p.text.primary, 0.35) },
          '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: `linear-gradient(90deg, ${darken(c.primary, dark ? 0.35 : 0.15)} 0%, ${dark ? darken(c.primary, 0.1) : lighten(c.primary, 0.08)} 100%)`,
            color: '#fff',
            borderBottom: `1px solid ${alpha('#000', 0.15)}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: dark ? '#121821' : '#fbfcfe',
            borderRight: `1px solid ${divider}`,
            '& .MuiListItemButton-root': { borderRadius: 6, margin: '1px 8px' },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: 'background-color 120ms ease',
            '&:hover': { backgroundColor: alpha(p.primary.main, dark ? 0.12 : 0.07) },
            '&.active, &.Mui-selected': {
              backgroundColor: alpha(p.primary.main, dark ? 0.22 : 0.12),
              color: p.primary.main,
              boxShadow: `inset 3px 0 0 ${p.primary.main}`,
              '& .MuiListItemText-primary': { fontWeight: 650 },
            },
            '&.active:hover': { backgroundColor: alpha(p.primary.main, dark ? 0.28 : 0.16) },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 6 },
          contained: { '&:hover': { boxShadow: `0 2px 6px ${alpha(p.primary.main, 0.3)}` } },
          outlined: { borderColor: alpha(p.primary.main, 0.5) },
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? alpha('#fff', 0.03) : '#fff',
            transition: 'box-shadow 120ms ease, border-color 120ms ease',
            '&:hover:not(.Mui-disabled):not(.Mui-focused) .MuiOutlinedInput-notchedOutline': { borderColor: alpha(p.primary.main, 0.6) },
            '&.Mui-focused': { boxShadow: focusRing },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1 },
            '&.Mui-disabled': { backgroundColor: dark ? alpha('#fff', 0.02) : alpha(p.text.primary, 0.03) },
          },
          notchedOutline: { borderColor: dark ? alpha('#fff', 0.18) : alpha('#0f172a', 0.2) },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: divider },
        },
      },
      MuiCard: { styleOverrides: { root: { border: `1px solid ${divider}` } }, defaultProps: { elevation: 0 } },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 6, border: '1px solid', alignItems: 'center' },
          standardSuccess: { borderColor: alpha(p.success.main, 0.35) },
          standardInfo: { borderColor: alpha(p.info.main, 0.35) },
          standardWarning: { borderColor: alpha(p.warning.main, 0.4) },
          standardError: { borderColor: alpha(p.error.main, 0.35) },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 650, backgroundColor: legacy.tableHead, color: p.text.primary },
          root: { borderColor: divider },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&.MuiTableRow-hover:hover': { backgroundColor: alpha(p.primary.main, dark ? 0.1 : 0.05) } },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 40 },
          indicator: { height: 3, borderRadius: '3px 3px 0 0' },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, minHeight: 40, '&.Mui-selected': { color: p.primary.main } },
        },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 10 } } },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 650 } } },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12, borderRadius: 6 } } },
      MuiCheckbox: { defaultProps: { color: 'primary' } },
      MuiMenu: { styleOverrides: { paper: { border: `1px solid ${divider}` } } },
    },
  })
}
