import { alpha, Box, Paper, Typography, type SxProps, type Theme } from '@mui/material'
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'


/** The dark title bar across the top of a legacy form. */
export function LegacyTitle({ children }: { children: ReactNode }) {
  return (
    <Paper square elevation={0} sx={(t) => ({
      bgcolor: 'legacy.titleBar', color: 'legacy.titleBarText', py: 0.5, textAlign: 'center', borderRadius: 1,
      backgroundImage: `linear-gradient(180deg, ${alpha('#fff', 0.08)}, ${alpha('#000', 0.12)})`,
      boxShadow: `0 1px 2px ${alpha(t.palette.common.black, 0.2)}`,
    })}><Typography sx={{ fontWeight: 700, letterSpacing: 0.3 }}>{children}</Typography></Paper>
  )
}

/** Red emphasised label of the legacy forms ("TOTAL RECORDS", "Records"); themed so it stays readable in dark mode. */
export function LegacyEm({ children }: { children: ReactNode }) {
  return <Box component="strong" sx={{ color: 'legacy.emphasis' }}>{children}</Box>
}

type Sized = ReactElement<{ sx?: { width?: unknown } }>
const width = (c: ReactNode) => (isValidElement(c) && c.props && typeof c.props === 'object' && 'sx' in c.props && c.props.sx && !Array.isArray(c.props.sx) ? (c as Sized).props.sx?.width : undefined)

/**
 * A width given in the legacy form's pixels, grown with the page: --legacy-unit (set on :root by the theme) is 1px on a laptop screen and up to 1.45px on a
 * wide one. Every box grows by the same factor, so the columns still line up row to row.
 */
const legacyWidth = (w: number) => `calc(${w} * var(--legacy-unit, 1px))`

/**
 * A label and its box(es) on one line. When a box fills the rest of the row (a percentage width), the boxes given a width in pixels grow with the page
 * (legacyWidth) and keep that width, and the filling box takes up the difference, so the columns line up and a date box shows its whole date. Labels keep
 * their width. A row with a single box grows the same way; a row of several fixed boxes and no filling box (often a cell of a grid) keeps its set sizes.
 */
export function LegacyRow({ label, w = 100, children, sx }: { label: string; w?: number; children: ReactNode; sx?: SxProps<Theme> }) {
  const filled = Children.toArray(children).some((c) => typeof width(c) === 'string' && String(width(c)).endsWith('%'))
  const lone = Children.toArray(children).length === 1
  const boxes = Children.map(children, (c) => {
    const n = width(c)
    if (!(filled || lone) || typeof n !== 'number' || (isValidElement(c) && c.type === Typography)) return c
    return cloneElement(c as Sized, { sx: { ...(c as Sized).props.sx, width: legacyWidth(n), ...(filled ? { flexShrink: 0 } : { maxWidth: '100%' }) } as Sized['props']['sx'] })
  })
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 32, '& > .MuiTypography-root': { color: 'text.secondary', fontWeight: 500, lineHeight: 1.25 }, ...sx }}>
      <Typography sx={{ width: w, flexShrink: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.25, color: 'text.secondary' }}>{label}</Typography>{boxes}
    </Box>
  )
}

/** A field caption of a legacy form, on one line; a caption too long for its column ends in "…" and shows in full on hover. */
export function LegacyLabel({ children }: { children: string }) {
  return <Typography noWrap title={children} sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25, color: 'text.secondary', minWidth: 0 }}>{children}</Typography>
}

/**
 * Captions and boxes laid out on a grid, so every column lines up row to row whatever the page width. `columns` alternates caption and box columns,
 * e.g. '96px minmax(108px, 150px) 100px minmax(0, 1fr)'; on a narrow screen (below `sm`) it falls back to one caption and one box per line.
 */
export function LegacyGrid({ columns, narrow = '96px minmax(0, 1fr)', children, sx }: { columns: string; narrow?: string; children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: narrow, sm: columns }, columnGap: 1, rowGap: 0.75, alignItems: 'center', alignContent: 'start', ...sx }}>
      {children}
    </Box>
  )
}

/** A bordered frame with an optional caption. */
export function LegacyFrame({ title, children, sx }: { title?: string; children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, display: 'grid', gap: 0.5, alignContent: 'start', borderRadius: 1.5, ...sx }}>
      {title && <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'primary.main', pb: 0.5, mb: 0.25, borderBottom: 1, borderColor: 'divider' }}>{title}</Typography>}
      {children}
    </Paper>
  )
}
