import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { deletionApi, type DeletionCriteria } from '../../api/deletion'
import { suspensionApi } from '../../api/suspensions'
import { formatDate } from '../../lib/format'
import { DateInput } from '../../components/DateField'

const options = [{ value: 'D', label: 'D - Bordx date' }, { value: 'B', label: 'B - Batch' }, { value: 'M', label: 'M - Membership' }]
const empty: DeletionCriteria = { health: '', payor: '', option: '', bordxFrom: null, bordxTo: null, batchNo: null, memberFrom: null, memberTo: null }

/** Legacy: Membership > Deletion. Permanently removes members (after archiving them). Preview first; members with cases or billing records are refused. */
export function MemberDeletionPage() {
  const health = useQuery({ queryKey: ['health-plans'], queryFn: deletionApi.healthPlans })
  const payors = useQuery({ queryKey: ['payors'], queryFn: suspensionApi.payors })
  const [c, setC] = useState(empty)
  const [applied, setApplied] = useState<DeletionCriteria | null>(null)
  const [typed, setTyped] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const preview = useMutation({
    mutationFn: (criteria: DeletionCriteria) => deletionApi.preview(criteria),
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const remove = useMutation({
    mutationFn: () => deletionApi.remove(applied!, preview.data!.principals),
    onSuccess: (r) => {
      setConfirming(false); setTyped(''); preview.reset(); setApplied(null)
      setMessage({ severity: 'success', text: `Deleted ${r.membersDeleted} member(s) and ${r.coveredPersonsDeleted} covered person(s); ${r.recordsArchived} record(s) archived.` })
    },
    onError: (e) => { setConfirming(false); setTyped(''); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const set = <K extends keyof DeletionCriteria>(k: K, v: DeletionCriteria[K]) => setC((x) => ({ ...x, [k]: v }))
  const data = preview.data

  return (
    <>
      <Typography variant="h5" gutterBottom>Membership Deletion</Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>Deleted members are copied to the archive first, but they disappear from the live membership. Search, review the list, then confirm.</Alert>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setMessage(null); setApplied({ ...c }); preview.mutate({ ...c }) }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <TextField select required size="small" label="Health plan" value={c.health} onChange={(e) => set('health', e.target.value)} sx={{ width: 220 }}>
          {(health.data ?? []).map((h) => <MenuItem key={h.code} value={h.code}>{h.code} - {h.description}</MenuItem>)}
        </TextField>
        <TextField select required size="small" label="Payor" value={c.payor} onChange={(e) => set('payor', e.target.value)} sx={{ width: 260 }}>
          {(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
        </TextField>
        <TextField select required size="small" label="Select by" value={c.option} onChange={(e) => set('option', e.target.value)} sx={{ width: 180 }}>
          {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        {(c.option === 'D' || c.option === 'B') && <DateInput label={c.option === 'B' ? 'Receipt (bordx) date' : 'Bordx date from'} value={c.bordxFrom ?? ''} onChange={(e) => set('bordxFrom', e.target.value || null)} />}
        {c.option === 'D' && <DateInput label="Bordx date to" value={c.bordxTo ?? ''} onChange={(e) => set('bordxTo', e.target.value || null)} />}
        {c.option === 'B' && <TextField size="small" type="number" label="Batch no" value={c.batchNo ?? ''} onChange={(e) => set('batchNo', e.target.value ? Number(e.target.value) : null)} sx={{ width: 120 }} />}
        {c.option === 'M' && <>
          <TextField size="small" label="Membership no from" value={c.memberFrom ?? ''} onChange={(e) => set('memberFrom', e.target.value || null)} />
          <TextField size="small" label="Membership no to" value={c.memberTo ?? ''} onChange={(e) => set('memberTo', e.target.value || null)} />
        </>}
        <Button type="submit" variant="contained" disabled={preview.isPending}>List</Button>
        <Button onClick={() => { setC(empty); setApplied(null); preview.reset(); setMessage(null) }}>Clear</Button>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {data && (data.principals === 0 ? <Alert severity="info">No Record Found</Alert> : (
        <>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
            <Typography>{data.principals} principal member(s), {data.coveredPersons} covered person(s){data.blocked > 0 ? `, ${data.blocked} cannot be deleted` : ''}</Typography>
            <Button color="error" variant="contained" disabled={data.blocked > 0 || remove.isPending} onClick={() => { setTyped(''); setConfirming(true) }}>Delete {data.principals} member(s)</Button>
          </Box>
          {data.blocked > 0 && <Alert severity="error" sx={{ mb: 1 }}>Members with cases or billing records cannot be deleted. Narrow the selection to exclude them.</Alert>}
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '55vh' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow>{['Bordx date', 'Batch', 'Member No', 'Name', 'Type', 'Covered persons', 'Status'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {data.candidates.map((m) => (
                  <TableRow key={m.memberNumber} hover sx={m.blockedReason ? { bgcolor: 'legacy.dangerRow' } : undefined}>
                    <TableCell>{formatDate(m.bordxDate)}</TableCell><TableCell>{m.batchNo}</TableCell><TableCell>{m.memberNumber}</TableCell><TableCell>{m.name}</TableCell>
                    <TableCell>{m.memberType}</TableCell><TableCell>{m.insurer === 'F' || m.insurer === 'H' ? m.coveredPersons : 0}</TableCell>
                    <TableCell>{m.blockedReason ? <Typography color="error" variant="body2">Cannot delete: {m.blockedReason}</Typography> : 'Can be deleted'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ))}
      <Dialog open={confirming} onClose={remove.isPending ? undefined : () => setConfirming(false)}>
        <DialogTitle>Delete members</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>This permanently removes {data?.principals} member(s) from the live membership (a copy is kept in the archive). Type the number of members to confirm.</DialogContentText>
          <TextField autoFocus size="small" label="Number of members" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)} disabled={remove.isPending}>Cancel</Button>
          <Button color="error" variant="contained" disabled={typed.trim() !== String(data?.principals) || remove.isPending} onClick={() => remove.mutate()}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
