import { Alert, Box, Button, Checkbox, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { mcoPendingApi, type McoPendingCriteria } from '../../api/mcoPending'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatDate } from '../../lib/format'
import { DateInput } from '../../components/DateField'

const empty: McoPendingCriteria = { memberFrom: '', memberTo: '', bordxFrom: '', bordxTo: '', status: '' }
const statusLabel: Record<string, string> = { B: 'Billed', P: 'Pending', R: 'Release' }

/** Legacy: Membership > MCO Pending. Hold members back from MCO billing (Pending) or release them. Billed members are locked. */
export function McoPendingPage() {
  const [criteria, setCriteria] = useState(empty)
  const [applied, setApplied] = useState<McoPendingCriteria | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const result = useQuery({ queryKey: ['mco-pending', applied], queryFn: () => mcoPendingApi.search(applied!), enabled: applied !== null })
  const rows = result.data?.rows ?? []
  const set = (k: keyof McoPendingCriteria) => (e: { target: { value: string } }) => setCriteria((c) => ({ ...c, [k]: e.target.value }))

  const change = useMutation({
    mutationFn: () => mcoPendingApi.change(status, [...selected]),
    onSuccess: (r) => { setConfirming(false); setSelected(new Set()); setMessage({ severity: 'success', text: `Record updated: ${r.added} set to pending, ${r.released} released, ${r.unchanged} unchanged.` }); void result.refetch() },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const toggle = (m: string) => setSelected((s) => { const n = new Set(s); if (n.has(m)) n.delete(m); else n.add(m); return n })

  return (
    <>
      <Typography variant="h5" gutterBottom>MCO Pending</Typography>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setMessage(null); setSelected(new Set()); setApplied({ ...criteria }) }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <TextField size="small" label="Member no from" value={criteria.memberFrom} onChange={set('memberFrom')} />
        <TextField size="small" label="Member no to" value={criteria.memberTo} onChange={set('memberTo')} />
        <DateInput label="Bordx date from" value={criteria.bordxFrom} onChange={set('bordxFrom')} />
        <DateInput label="Bordx date to" value={criteria.bordxTo} onChange={set('bordxTo')} />
        <TextField select size="small" label="Status" value={criteria.status} onChange={set('status')} sx={{ width: 160 }}>
          <MenuItem value="">(any)</MenuItem>{Object.entries(statusLabel).map(([v, l]) => <MenuItem key={v} value={v}>{v} - {l}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="contained">Search</Button>
        <Button onClick={() => { setCriteria(empty); setApplied(null); setSelected(new Set()); setMessage(null) }}>Clear</Button>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {result.error && <Alert severity="error" sx={{ mb: 2 }}>{(result.error as Error).message}</Alert>}
      {applied === null && <Typography color="text.secondary">Enter filters and press Search.</Typography>}
      {result.data && (rows.length === 0 ? <Alert severity="info">No record found!</Alert> : (
        <>
          {result.data.truncated && <Alert severity="info" sx={{ mb: 1 }}>Showing the first {rows.length} members. Add filters to narrow the search.</Alert>}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1 }}>
            <TextField select size="small" label="Set status to" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 180 }}>
              <MenuItem value="P">P - Pending</MenuItem><MenuItem value="R">R - Release</MenuItem>
            </TextField>
            <Button variant="contained" disabled={selected.size === 0 || !status || change.isPending} onClick={() => { setMessage(null); setConfirming(true) }}>Update ({selected.size})</Button>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '55vh' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell padding="checkbox" />{['Member No', 'Bordx date', 'New bordx date', 'Status'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.memberNumber} hover>
                    <TableCell padding="checkbox"><Checkbox disabled={r.status === 'B'} checked={selected.has(r.memberNumber)} onChange={() => toggle(r.memberNumber)} slotProps={{ input: { 'aria-label': `Select ${r.memberNumber}` } }} /></TableCell>
                    <TableCell>{r.memberNumber}</TableCell><TableCell>{formatDate(r.bordxDate)}</TableCell><TableCell>{formatDate(r.newBordxDate)}</TableCell>
                    <TableCell>{r.status ? `${r.status} - ${statusLabel[r.status] ?? ''}` : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ))}
      <ConfirmDialog open={confirming} busy={change.isPending} title="Update MCO pending" message={`Do you want to update ${selected.size} member(s) to "${status === 'P' ? 'Pending' : 'Release'}"?`} onConfirm={() => change.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}
