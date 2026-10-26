import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { suspensionApi, type Suspension } from '../../api/suspensions'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatDate } from '../../lib/format'

const kinds = [{ value: '01', label: '01 - Member' }, { value: '02', label: '02 - Agent' }]

/** Legacy: Maintenance > Suspension (detail tab). Members or agents that are suspended. Categories are maintained in "Suspension Category". */
export function SuspensionsPage() {
  const queryClient = useQueryClient()
  const payors = useQuery({ queryKey: ['payors'], queryFn: suspensionApi.payors })
  const [filter, setFilter] = useState({ kind: '', code: '', payor: '' })
  const [applied, setApplied] = useState(filter)
  const list = useQuery({ queryKey: ['suspensions', applied], queryFn: () => suspensionApi.search(applied.kind, applied.code, applied.payor) })
  const [editing, setEditing] = useState<{ row: Suspension | null } | null>(null)
  const [deleting, setDeleting] = useState<Suspension | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['suspensions'] })

  const remove = useMutation({
    mutationFn: (s: Suspension) => suspensionApi.remove(s.kind, s.code),
    onSuccess: () => { setMessage({ severity: 'success', text: 'Record deleted.' }); setDeleting(null); void refresh() },
    onError: (e) => { setMessage({ severity: 'error', text: (e as Error).message }); setDeleting(null) },
  })

  return (
    <>
      <Typography variant="h5" gutterBottom>Suspension</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <TextField select size="small" label="Type" value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })} sx={{ width: 160 }}>
          <MenuItem value="">(any)</MenuItem>{kinds.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Member no / agent code (starts with)" value={filter.code} onChange={(e) => setFilter({ ...filter, code: e.target.value })} sx={{ width: 300 }} />
        <TextField select size="small" label="Payor" value={filter.payor} onChange={(e) => setFilter({ ...filter, payor: e.target.value })} sx={{ width: 260 }}>
          <MenuItem value="">(any)</MenuItem>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
        </TextField>
        <Button variant="outlined" onClick={() => setApplied(filter)}>Search</Button>
        <Button variant="contained" onClick={() => { setMessage(null); setEditing({ row: null }) }}>Add</Button>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {list.error && <Alert severity="error" sx={{ mb: 2 }}>{(list.error as Error).message}</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '65vh' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>{['Type', 'Member No / Agent', 'Remarks', 'Payor', 'Updated by', 'Updated', ''].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(list.data ?? []).map((s) => (
              <TableRow key={`${s.kind}:${s.code}`} hover>
                <TableCell>{s.kind}</TableCell><TableCell>{s.code}</TableCell><TableCell>{s.remarks}</TableCell>
                <TableCell>{s.payorCode} - {s.payorName}</TableCell><TableCell>{s.updatedBy}</TableCell><TableCell>{formatDate(s.updatedOn)}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => { setMessage(null); setEditing({ row: s }) }}>Edit</Button>
                  <Button size="small" color="error" onClick={() => setDeleting(s)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No Record Available</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {editing && <SuspensionDialog row={editing.row} payors={payors.data ?? []} onClose={() => setEditing(null)} onSaved={(text) => { setEditing(null); setMessage({ severity: 'success', text }); void refresh() }} />}
      <ConfirmDialog open={deleting !== null} busy={remove.isPending} title="Delete record" confirmLabel="Delete" message={`Do you want to delete the suspension of '${deleting?.code}'?`}
        onConfirm={() => deleting && remove.mutate(deleting)} onCancel={() => setDeleting(null)} />
    </>
  )
}

function SuspensionDialog({ row, payors, onClose, onSaved }: { row: Suspension | null; payors: { code: string; name: string | null }[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [v, setV] = useState({ kind: row?.kind ?? '01', code: row?.code ?? '', remarks: row?.remarks ?? '', payorCode: row?.payorCode ?? '' })
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const save = useMutation({
    mutationFn: () => row ? suspensionApi.update(v) : suspensionApi.create(v),
    onSuccess: () => onSaved(row ? 'Record updated.' : 'Record saved.'),
    onError: (e) => { setError((e as Error).message); setConfirming(false) },
  })
  return (
    <>
      <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>{row ? 'Edit' : 'Add'} suspension</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select size="small" label="Type" value={v.kind} disabled={!!row} onChange={(e) => setV({ ...v, kind: e.target.value })}>
            {kinds.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
          </TextField>
          <TextField size="small" required label={v.kind === '01' ? 'Member number' : 'Agent code'} value={v.code} disabled={!!row} onChange={(e) => setV({ ...v, code: e.target.value })} slotProps={{ htmlInput: { maxLength: v.kind === '01' ? 50 : 15 } }} />
          <TextField select size="small" required label="Payor" value={v.payorCode} onChange={(e) => setV({ ...v, payorCode: e.target.value })}>
            {payors.map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
          </TextField>
          <TextField size="small" required multiline minRows={2} label="Remarks" value={v.remarks} onChange={(e) => setV({ ...v, remarks: e.target.value })} slotProps={{ htmlInput: { maxLength: 100 } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button variant="contained" onClick={() => { setError(null); setConfirming(true) }} disabled={save.isPending}>Save</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={confirming} busy={save.isPending} title="Save record" message="Do you want to save the record?" onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}
