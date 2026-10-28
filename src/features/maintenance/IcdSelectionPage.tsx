import { Alert, Box, Button, List, ListItemButton, ListItemText, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { icdSelectionApi, type IcdCodeRow } from '../../api/icdSelection'

function Pane({ title, rows, selected, onToggle, total }: { title: string; rows: IcdCodeRow[]; selected: Set<string>; onToggle: (code: string) => void; total: number }) {
  return (
    <Paper variant="outlined" sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <Typography variant="subtitle2" sx={{ p: 1, color: 'error.main', fontWeight: 700 }}>{title} ({total})</Typography>
      <Box sx={{ display: 'flex', px: 1.5, py: 0.5, borderBottom: 1, borderColor: 'divider', fontSize: 13, fontWeight: 600 }}><Box sx={{ width: 90, flexShrink: 0 }}>ICD Code</Box><Box>ICD Description</Box></Box>
      <List dense disablePadding sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {rows.map((r) => (
          <ListItemButton key={r.code} selected={selected.has(r.code)} onClick={() => onToggle(r.code)} sx={{ py: 0 }}>
            <Box sx={{ width: 90, flexShrink: 0 }}>{r.code}</Box><ListItemText sx={{ minWidth: 0 }} primary={r.description} title={r.description ?? ''} slotProps={{ primary: { variant: 'body2', noWrap: true } }} />
          </ListItemButton>
        ))}
        {rows.length === 0 && <Typography variant="body2" sx={{ p: 1.5 }} color="text.secondary">No ICD codes.</Typography>}
      </List>
    </Paper>
  )
}

/** Legacy: Maintenance > Case > ICD Selection. Left: ICD codes not applied yet; right: ICD codes applied (table ICDOriginal). Select / Unselect move the highlighted codes. */
export function IcdSelectionPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [left, setLeft] = useState<Set<string>>(new Set())
  const [right, setRight] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const view = useQuery({ queryKey: ['icd-selection', applied], queryFn: () => icdSelectionApi.list(applied) })
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (code: string) => { const n = new Set(set); if (n.has(code)) n.delete(code); else n.add(code); setter(n) }
  const done = (text: string) => () => { setLeft(new Set()); setRight(new Set()); setMessage({ severity: 'success', text }); void qc.invalidateQueries({ queryKey: ['icd-selection'] }) }
  const fail = (e: unknown) => setMessage({ severity: 'error', text: (e as Error).message })
  const select = useMutation({ mutationFn: () => icdSelectionApi.select([...left]), onSuccess: (r) => done(`${r.changed} ICD code(s) applied.`)(), onError: fail })
  const unselect = useMutation({ mutationFn: () => icdSelectionApi.unselect([...right]), onSuccess: (r) => done(`${r.changed} ICD code(s) removed from the applied list.`)(), onError: fail })
  const v = view.data

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Case Maintenance - ICD Selection</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setApplied(search) }} sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" label="ICD code or description" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 320 }} />
        <Button type="submit" variant="outlined">Search</Button>
        <Button variant="outlined" onClick={() => { setSearch(''); setApplied('') }}>Clear</Button>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', gap: 2, alignItems: 'stretch' }}>
        <Pane title="Original ICD Code" rows={v?.available ?? []} selected={left} onToggle={toggle(left, setLeft)} total={v?.availableTotal ?? 0} />
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.5, flexShrink: 0, width: 130 }}>
          <Button fullWidth variant="contained" sx={{ height: 40, whiteSpace: 'nowrap' }} disabled={left.size === 0 || select.isPending} onClick={() => select.mutate()}>Select &gt;</Button>
          <Button fullWidth variant="contained" color="secondary" sx={{ height: 40, whiteSpace: 'nowrap' }} disabled={right.size === 0 || unselect.isPending} onClick={() => unselect.mutate()}>&lt; Unselect</Button>
        </Box>
        <Pane title="ICD Code Applied" rows={v?.applied ?? []} selected={right} onToggle={toggle(right, setRight)} total={v?.appliedTotal ?? 0} />
      </Box>
      <Typography variant="body2"><strong style={{ color: '#c62828' }}>TOTAL RECORDS</strong> {v ? v.availableTotal + v.appliedTotal : 0} &nbsp; (lists show at most 2,000 codes each; use Search to narrow)</Typography>
    </Box>
  )
}

