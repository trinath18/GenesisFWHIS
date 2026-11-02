import { Box, Checkbox, FormControlLabel, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'
import { DateField } from '../../components/DateField'

/** Pieces shared by the legacy "send to" screens (Send to Bordx Unit, Send to Claims (Rep), CRU Send to Claims). */

/** A from / to date pair with the legacy "*" box that searches for an empty date instead. */
export function DateRange({ label, from, to, empty, onChange }: {
  label: string; from: string; to: string; empty?: boolean
  onChange: (v: { from?: string; to?: string; empty?: boolean }) => void
}) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
      <DateField label={`${label} from`} value={from} disabled={empty} onChange={(iso) => onChange({ from: iso })} sx={{ width: 140 }} />
      <DateField label="To" value={to} disabled={empty} onChange={(iso) => onChange({ to: iso })} sx={{ width: 140 }} />
      {empty !== undefined && (
        <Tooltip title={`Search records with no ${label}`}>
          <FormControlLabel sx={{ ml: 0, mr: 0.5 }} control={<Checkbox size="small" checked={empty} onChange={(e) => onChange({ empty: e.target.checked, from: '', to: '' })} />} label="*" />
        </Tooltip>
      )}
    </Box>
  )
}

/** A select of "code - name" options with an empty "(all)" choice, like the legacy combos. */
export function CodeSelect({ label, value, options, onChange, width = 200 }: { label: string; value: string; options: { code: string; name: string }[]; onChange: (v: string) => void; width?: number }) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)} sx={{ width }} slotProps={{ inputLabel: { shrink: true } }}>
      <MenuItem value=""><em>(all)</em></MenuItem>
      {options.map((o) => <MenuItem key={o.code} value={o.code}>{o.code} - {o.name}</MenuItem>)}
    </TextField>
  )
}

export interface TickColumn<T> { header: string; cell: (row: T) => ReactNode; align?: 'right' }

/** The result grid: a tick box per row (the legacy ListView check boxes), single-row selection for Amend. */
export function TickTable<T>({ rows, rowKey, columns, checked, onToggle, selected, onSelect, empty }: {
  rows: T[]; rowKey: (r: T) => string; columns: TickColumn<T>[]; checked: Set<string>; onToggle: (key: string) => void
  selected?: string | null; onSelect?: (key: string) => void; empty: string
}) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 160 }}>
      <Table size="small" stickyHeader sx={{ '& th, & td': { whiteSpace: 'nowrap' } }}>
        <TableHead><TableRow><TableCell padding="checkbox" />{columns.map((c) => <TableCell key={c.header} align={c.align}>{c.header}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.map((r) => {
            const k = rowKey(r)
            return (
              <TableRow key={k} hover selected={selected === k} onClick={() => onSelect?.(k)} sx={{ cursor: onSelect ? 'pointer' : undefined }}>
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}><Checkbox size="small" checked={checked.has(k)} onChange={() => onToggle(k)} /></TableCell>
                {columns.map((c) => <TableCell key={c.header} align={c.align}>{c.cell(r)}</TableCell>)}
              </TableRow>
            )
          })}
          {rows.length === 0 && <TableRow><TableCell colSpan={columns.length + 1}>{empty}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
