import { Box, Paper, Typography, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'


/** The dark title bar across the top of a legacy form. */
export function LegacyTitle({ children }: { children: ReactNode }) {
  return <Paper square sx={{ bgcolor: 'grey.800', color: 'common.white', py: 0.5, textAlign: 'center' }}><Typography sx={{ fontWeight: 700 }}>{children}</Typography></Paper>
}

/** A label and its box(es) on one line. */
export function LegacyRow({ label, w = 100, children, sx }: { label: string; w?: number; children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 32, ...sx }}>
      <Typography sx={{ width: w, flexShrink: 0, fontSize: 13 }}>{label}</Typography>{children}
    </Box>
  )
}

/** A bordered frame with an optional caption. */
export function LegacyFrame({ title, children, sx }: { title?: string; children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.5, alignContent: 'start', ...sx }}>
      {title && <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography>}
      {children}
    </Paper>
  )
}
