import { Alert, Box, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ minHeight: '1.4em', wordBreak: 'break-word' }}>{value || '\u00A0'}</Typography>
    </Box>
  )
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 2 }}>{children}</Box>
}

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  align?: 'right'
}

/** Renders the loading, error and "no records" states for a tab, then a table. */
export function QueryTable<T>({ query, columns, empty = 'No records.' }: { query: UseQueryResult<T[]>; columns: Column<T>[]; empty?: string }) {
  if (query.isLoading) return <CircularProgress size={24} />
  if (query.error) return <Alert severity="error">{(query.error as Error).message}</Alert>
  const rows = query.data ?? []
  if (rows.length === 0) return <Typography color="text.secondary">{empty}</Typography>
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>{columns.map((c) => <TableCell key={c.header} align={c.align}>{c.header}</TableCell>)}</TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} hover>{columns.map((c) => <TableCell key={c.header} align={c.align}>{c.cell(r)}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
