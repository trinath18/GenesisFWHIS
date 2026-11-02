import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cardSendingApi, type CardSendingCriteria } from '../../api/cardSending'
import { suspensionApi } from '../../api/suspensions'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'
import { formatDate } from '../../lib/format'

const empty: CardSendingCriteria = { payor: '', memberFrom: '', memberTo: '', bordxFrom: '', bordxTo: '', batchFrom: '', batchTo: '', sentFrom: '', sentTo: '', mode: '' }
const key = (r: { memberNumber: string; coverId: string }) => `${r.memberNumber}|${r.coverId}`
const lbl = (text: string, w = 95) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0 }}>{text}</Typography>
const to = <Typography sx={{ fontSize: 13, mx: 0.5 }}>To</Typography>

/**
 * Legacy: Membership > Card Sending Mode (frmMembershipCardControl, "Membership Card Control"). MBM Number, Bordx Date, Payor, Batch No., Sending Mode and
 * Sent Date ranges; the member list with a Check column; the sending mode and sent date to set with Search, Update, Print, Clear and Exit; and the totals.
 */
export function CardSendingPage() {
  const navigate = useNavigate()
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
  const setDay = (k: keyof CardSendingCriteria) => (iso: string) => setCriteria((c) => ({ ...c, [k]: iso }))
  const T = (k: keyof CardSendingCriteria, w = 150, type?: string) => <TextField size="small" type={type} sx={{ ...box, width: w }} value={criteria[k]} onChange={set(k)} />
  const D = (k: keyof CardSendingCriteria) => <DateField sx={{ ...box, width: 140 }} value={criteria[k]} onChange={setDay(k)} />

  const update = useMutation({
    mutationFn: () => cardSendingApi.update(mode, date, rows.filter((r) => selected.has(key(r))).map((r) => ({ memberNumber: r.memberNumber, coverId: r.coverId }))),
    onSuccess: (r) => { setConfirming(false); setMessage({ severity: 'success', text: `Record updated: ${r.updated} member(s).` }); setSelected(new Set()); void result.refetch() },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const toggle = (k: string) => setSelected((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(key(r)))
  const search = () => { setMessage(null); setSelected(new Set()); setApplied({ ...criteria }) }
  const clear = () => { setCriteria(empty); setApplied(null); setSelected(new Set()); setMessage(null); setMode(''); setDate('') }
  const print = () => download(csvBlob(['MBMNumber', 'Cover ID', 'Member Name', 'Bordx Date', 'Batch No', 'Sending Mode', 'Sent Date'],
    rows.map((r) => [r.memberNumber, r.coverId, r.name, formatDate(r.bordxDate), r.batchNo, r.sendingMode, formatDate(r.cardDate)])), 'card-sending.csv')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Membership Card Control</LegacyTitle>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {result.error && <Alert severity="error">{(result.error as Error).message}</Alert>}

      <LegacyFrame>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); search() }} sx={{ display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{lbl('MBM Number')}{T('memberFrom')}{to}{T('memberTo')}</Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{lbl('Bordx Date', 80)}{D('bordxFrom')}{to}{D('bordxTo')}</Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{lbl('Payor')}
            <TextField select size="small" sx={{ ...box, width: 330 }} value={criteria.payor} onChange={set('payor')}>
              <MenuItem value="">(any)</MenuItem>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{lbl('Batch No.', 80)}{T('batchFrom', 140, 'number')}{to}{T('batchTo', 140, 'number')}</Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{lbl('Sending Mode')}
            <TextField select size="small" sx={{ ...box, width: 200 }} value={criteria.mode} onChange={set('mode')}>
              <MenuItem value="">(any)</MenuItem>{(modes.data ?? []).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{lbl('Sent Date', 80)}{D('sentFrom')}{to}{D('sentTo')}</Box>
          <button type="submit" hidden />
        </Box>
      </LegacyFrame>

      {result.data?.truncated && <Alert severity="info">Showing the first {result.data.principals} principal members. Add filters to narrow the search.</Alert>}
      <Paper variant="outlined">
        <FormControlLabel sx={{ ml: 0.5 }} label={<Typography sx={{ fontSize: 13 }}>Check all</Typography>}
          control={<Checkbox size="small" checked={allSelected} indeterminate={selected.size > 0 && !allSelected} disabled={rows.length === 0} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(key)))} />} />
        <TableContainer sx={{ height: '45vh' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>{['Check', 'MBMNumber', 'Cover ID', 'Member Name', 'Bordx Date', 'Batch No', 'Sending Mode', 'Sent Date'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={key(r)} hover>
                  <TableCell padding="checkbox"><Checkbox size="small" checked={selected.has(key(r))} onChange={() => toggle(key(r))} slotProps={{ input: { 'aria-label': `Select ${key(r)}` } }} /></TableCell>
                  <TableCell>{r.memberNumber}</TableCell><TableCell>{r.coverId}</TableCell><TableCell>{r.name}</TableCell>
                  <TableCell>{formatDate(r.bordxDate)}</TableCell><TableCell>{r.batchNo}</TableCell><TableCell>{r.sendingMode}</TableCell><TableCell>{formatDate(r.cardDate)}</TableCell>
                </TableRow>
              ))}
              {applied !== null && result.data && rows.length === 0 && <TableRow><TableCell colSpan={8}>Record Not Found!</TableCell></TableRow>}
              {applied === null && <TableRow><TableCell colSpan={8}>Enter filters (or none) and click Search.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {lbl('Sending Mode', 90)}
          <TextField select size="small" sx={{ ...box, width: 180 }} value={mode} onChange={(e) => setMode(e.target.value)}>
            {(modes.data ?? []).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          {lbl('Sent Date', 65)}<DateField sx={{ ...box, width: 140 }} value={date} onChange={setDate} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" disabled={result.isFetching} onClick={search}>Search</Button>
          <Button size="small" variant="contained" disabled={selected.size === 0 || !mode || !date || update.isPending} onClick={() => { setMessage(null); setConfirming(true) }}>Update ({selected.size})</Button>
          <Button size="small" variant="outlined" disabled={rows.length === 0} onClick={print}>Print</Button>
          <Button size="small" variant="outlined" onClick={clear}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {lbl('Total Principal', 95)}<TextField size="small" sx={{ ...yellow, width: 90 }} value={result.data?.principals ?? ''} slotProps={{ input: { readOnly: true } }} />
        {lbl('Total Supp', 75)}<TextField size="small" sx={{ ...yellow, width: 90 }} value={result.data?.supplementary ?? ''} slotProps={{ input: { readOnly: true } }} />
        {lbl('Total Member', 90)}<TextField size="small" sx={{ ...yellow, width: 90 }} value={result.data ? result.data.principals + result.data.supplementary : ''} slotProps={{ input: { readOnly: true } }} />
      </Box>

      <ConfirmDialog open={confirming} busy={update.isPending} title="Update card sending" message={`Do you want to update ${selected.size} member(s) to "${mode}" on ${formatDate(date)}?`} onConfirm={() => update.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
