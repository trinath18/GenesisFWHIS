import { Alert, Box, Button, Checkbox, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { cardSendingApi, type CardSendingCriteria } from '../../api/cardSending'
import { suspensionApi } from '../../api/suspensions'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatDate } from '../../lib/format'

const empty: CardSendingCriteria = { payor: '', memberFrom: '', memberTo: '', bordxFrom: '', bordxTo: '', batchFrom: '', batchTo: '', sentFrom: '', sentTo: '', mode: '' }
const key = (r: { memberNumber: string; coverId: string }) => `${r.memberNumber}|${r.coverId}`

/** Legacy: Membership > Card Sending Mode. Search members, tick them, set how and when the card was sent. */
export function CardSendingPage() {
  const modes = useQuery({ queryKey: ['card-modes'], queryFn: cardSendingApi.modes })
  const payors = useQuery({ queryKey: ['payors'], queryFn: suspensionApi.payors })
  const [criteria, setCriteria] = useState(empty)
  const [applied, setApplied] = useState<CardSendingCriteria | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState('')
  const [date, setDate] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const result = useQuery({ queryKey: ['card-sending', applied], queryFn: () => cardSendingApi.search(applied!), enabled: applied !== null })
  const rows = result.data?.rows ?? []
  const set = (k: keyof CardSendingCriteria) => (e: { target: { value: string } }) => setCriteria((c) => ({ ...c, [k]: e.target.value }))

  const update = useMutation({
    mutationFn: () => cardSendingApi.update(mode, date, rows.filter((r) => selected.has(key(r))).map((r) => ({ memberNumber: r.memberNumber, coverId: r.coverId }))),
    onSuccess: (r) => { setConfirming(false); setMessage({ severity: 'success', text: `Record updated: ${r.updated} member(s).` }); setSelected(new Set()); void result.refetch() },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const toggle = (k: string) => setSelected((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(key(r)))

  return (
    <>
      <Typography variant="h5" gutterBottom>Card Sending Mode</Typography>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setMessage(null); setSelected(new Set()); setApplied({ ...criteria }) }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <TextField select size="small" label="Payor" value={criteria.payor} onChange={set('payor')} sx={{ width: 240 }}>
          <MenuItem value="">(any)</MenuItem>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Member no from" value={criteria.memberFrom} onChange={set('memberFrom')} />
        <TextField size="small" label="Member no to" value={criteria.memberTo} onChange={set('memberTo')} />
        <TextField size="small" type="date" label="Bordx date from" value={criteria.bordxFrom} onChange={set('bordxFrom')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="Bordx date to" value={criteria.bordxTo} onChange={set('bordxTo')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="number" label="Batch from" value={criteria.batchFrom} onChange={set('batchFrom')} sx={{ width: 120 }} />
        <TextField size="small" type="number" label="Batch to" value={criteria.batchTo} onChange={set('batchTo')} sx={{ width: 120 }} />
        <TextField size="small" type="date" label="Card sent from" value={criteria.sentFrom} onChange={set('sentFrom')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="Card sent to" value={criteria.sentTo} onChange={set('sentTo')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField select size="small" label="Current mode" value={criteria.mode} onChange={set('mode')} sx={{ width: 160 }}>
          <MenuItem value="">(any)</MenuItem>{(modes.data ?? []).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="contained">Search</Button>
        <Button onClick={() => { setCriteria(empty); setApplied(null); setSelected(new Set()); setMessage(null) }}>Clear</Button>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {result.error && <Alert severity="error" sx={{ mb: 2 }}>{(result.error as Error).message}</Alert>}
      {applied === null && <Typography color="text.secondary">Enter filters (or none) and press Search.</Typography>}
      {result.data && (
        <>
          {result.data.truncated && <Alert severity="info" sx={{ mb: 1 }}>Showing the first {result.data.principals} principal members. Add filters to narrow the search.</Alert>}
          {rows.length === 0 ? <Alert severity="info">Record Not Found!</Alert> : (
            <>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                <TextField select size="small" label="Card sending mode" value={mode} onChange={(e) => setMode(e.target.value)} sx={{ width: 180 }}>
                  {(modes.data ?? []).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
                <TextField size="small" type="date" label="Card sent date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <Button variant="contained" disabled={selected.size === 0 || !mode || !date || update.isPending} onClick={() => { setMessage(null); setConfirming(true) }}>Update ({selected.size})</Button>
                <Typography variant="body2" color="text.secondary">{result.data.principals} principal, {result.data.supplementary} supplementary</Typography>
              </Box>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '55vh' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"><Checkbox checked={allSelected} indeterminate={selected.size > 0 && !allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(key)))} slotProps={{ input: { 'aria-label': 'Select all' } }} /></TableCell>
                      {['Member No', 'Cover', 'Name', 'Bordx date', 'Batch', 'Mode', 'Card sent'].map((h) => <TableCell key={h}>{h}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={key(r)} hover>
                        <TableCell padding="checkbox"><Checkbox checked={selected.has(key(r))} onChange={() => toggle(key(r))} slotProps={{ input: { 'aria-label': `Select ${key(r)}` } }} /></TableCell>
                        <TableCell>{r.memberNumber}</TableCell><TableCell>{r.coverId}</TableCell><TableCell>{r.name}</TableCell>
                        <TableCell>{formatDate(r.bordxDate)}</TableCell><TableCell>{r.batchNo}</TableCell><TableCell>{r.sendingMode}</TableCell><TableCell>{formatDate(r.cardDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}
      <ConfirmDialog open={confirming} busy={update.isPending} title="Update card sending" message={`Do you want to update ${selected.size} member(s) to "${mode}" on ${formatDate(date)}?`} onConfirm={() => update.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}
