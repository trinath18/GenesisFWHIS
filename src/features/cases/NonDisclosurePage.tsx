import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { nonDisclosureApi, preExistingCategories, underlyingCategories, type MemberSearchItem, type NonDisclosurePerson, type NonDisclosureView } from '../../api/caseMenu'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'
import { formatDate } from '../../lib/format'
import { CodeSelect } from './SendToShared'

const empty = { preDate: '', preCat: '', preBy: '', undDate: '', undCat: '', undBy: '' }
const catName = (list: { code: string; name: string }[], code: string | null) => (code ? list.find((c) => c.code === code)?.name ?? code : '')
const headers = ['MBM Number', 'Cover ID', 'MBM Name', 'Policy No', 'Eff Date', 'Exp Date', 'Pre-Existing Date', 'Pre-Existing Cat', 'Pre-Existing Inf', 'Und Illness Date', 'Und Illness Cat', 'Und Illness Inf']
const cells = (p: NonDisclosurePerson) => [p.memberNumber, p.coverId, p.name, p.policyNo, formatDate(p.effectiveDate), formatDate(p.expiryDate), formatDate(p.preExistingDate), catName(preExistingCategories, p.preExistingCategory),
  p.preExistingInformedBy, formatDate(p.underlyingDate), catName(underlyingCategories, p.underlyingCategory), p.underlyingInformedBy]

/** Legacy: Case > Non-Disclousre Info (frmRECNonDisclosure). Records the pre-existing and underlying illness a member or covered person did not disclose. */
export function NonDisclosurePage() {
  const [number, setNumber] = useState('')
  const [view, setView] = useState<NonDisclosureView | null>(null)
  const [selected, setSelected] = useState<NonDisclosurePerson | null>(null)
  const [f, setF] = useState(empty)
  const [confirming, setConfirming] = useState(false)
  const [searching, setSearching] = useState<{ q: string; items: MemberSearchItem[] | null } | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)

  const pick = (p: NonDisclosurePerson | null) => {
    setSelected(p)
    setF(p ? { preDate: p.preExistingDate ?? '', preCat: p.preExistingCategory ?? '', preBy: p.preExistingInformedBy ?? '', undDate: p.underlyingDate ?? '', undCat: p.underlyingCategory ?? '', undBy: p.underlyingInformedBy ?? '' } : empty)
  }
  const load = useMutation({
    mutationFn: (m: string) => nonDisclosureApi.get(m),
    onSuccess: (v, m) => {
      setView(v); setNumber(m); setMessage(null)
      // Keep the person that was being edited selected after a reload.
      pick(v.persons.find((p) => p.coverId === selected?.coverId && p.memberNumber === selected?.memberNumber) ?? null)
    },
    onError: (e) => { setView(null); pick(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const step = useMutation({
    mutationFn: (next: boolean) => (next ? nonDisclosureApi.next(number.trim()) : nonDisclosureApi.previous(number.trim())),
    onSuccess: (r) => { pick(null); load.mutate(r.memberNumber) },
    onError: (e) => setMessage({ severity: 'warning', text: (e as Error).message }),
  })
  const search = useMutation({
    mutationFn: (q: string) => nonDisclosureApi.search(q),
    onSuccess: (r, q) => setSearching({ q, items: r.items }),
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const save = useMutation({
    mutationFn: () => nonDisclosureApi.save(selected!.memberNumber, selected!.coverId, {
      preExistingDate: f.preDate || null, preExistingCategory: f.preCat || null, preExistingInformedBy: f.preBy.trim() || null,
      underlyingDate: f.undDate || null, underlyingCategory: f.undCat || null, underlyingInformedBy: f.undBy.trim() || null,
    }),
    onSuccess: (r) => { setConfirming(false); setMessage({ severity: 'success', text: r.message }); load.mutate(view!.memberNumber) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const go = () => {
    const m = number.trim()
    if (!m) { setMessage({ severity: 'error', text: 'Please Enter Membership No' }); return }
    pick(null); setMessage(null); load.mutate(m)
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Record of Non-Disclosure</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField size="small" label="Mem No" value={number} onChange={(e) => setNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go() }} slotProps={{ htmlInput: { maxLength: 30 } }} />
        <Button variant="contained" disabled={load.isPending} onClick={go}>Go</Button>
        <Button variant="outlined" disabled={number.trim().length < 3 || search.isPending} onClick={() => search.mutate(number)}>Search</Button>
        <Button variant="outlined" disabled={!number.trim() || step.isPending} onClick={() => step.mutate(false)}>Pre</Button>
        <Button variant="outlined" disabled={step.isPending} onClick={() => step.mutate(true)}>Next</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" disabled={!view} onClick={() => view && download(csvBlob(headers, view.persons.map(cells)), `non-disclosure-${view.memberNumber.replace(/[^A-Za-z0-9-]/g, '_')}.csv`)}>Print to File</Button>
        <Button variant="outlined" onClick={() => { setNumber(''); setView(null); pick(null); setMessage(null) }}>Clear</Button>
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader sx={{ '& th, & td': { whiteSpace: 'nowrap' } }}>
          <TableHead><TableRow>{headers.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(view?.persons ?? []).map((p) => (
              <TableRow key={p.coverId} hover selected={selected?.coverId === p.coverId} onClick={() => pick(p)} sx={{ cursor: 'pointer' }}>
                {cells(p).map((c, i) => <TableCell key={i}>{c}</TableCell>)}
              </TableRow>
            ))}
            {!view && <TableRow><TableCell colSpan={headers.length}>Enter the membership number and press Go.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, opacity: selected ? 1 : 0.5, pointerEvents: selected ? 'auto' : 'none' }}>
        <Typography variant="subtitle2">Member Name : {selected ? `${selected.name ?? ''} (${selected.memberNumber} - ${selected.coverId})` : 'click a row in the list'}</Typography>
        {selected && !selected.hasDetailRecord && <Alert severity="warning">This person has no detail record ({selected.coverId === '00' ? 'MBMTwo' : 'MBMCoveredPersonsTwo'}), so the legacy screen could not save it either.</Alert>}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ width: 160, pt: 1 }}>Pre-Existing Illness</Typography>
          <DateField label="Date" value={f.preDate} onChange={(iso) => setF((x) => ({ ...x, preDate: iso }))} sx={{ width: 150 }} />
          <CodeSelect label="Categories" value={f.preCat} options={preExistingCategories} onChange={(v) => setF((x) => ({ ...x, preCat: v }))} />
          <TextField size="small" label="Informed by" value={f.preBy} onChange={set('preBy')} sx={{ width: 320 }} slotProps={{ htmlInput: { maxLength: 50 }, inputLabel: { shrink: true } }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ width: 160, pt: 1 }}>Underlying Illness</Typography>
          <DateField label="Date" value={f.undDate} onChange={(iso) => setF((x) => ({ ...x, undDate: iso }))} sx={{ width: 150 }} />
          <CodeSelect label="Categories" value={f.undCat} options={underlyingCategories} onChange={(v) => setF((x) => ({ ...x, undCat: v }))} />
          <TextField size="small" label="Informed by" value={f.undBy} onChange={set('undBy')} sx={{ width: 320 }} slotProps={{ htmlInput: { maxLength: 50 }, inputLabel: { shrink: true } }} />
        </Box>
        <Box><Button variant="contained" color="secondary" disabled={!selected?.hasDetailRecord || save.isPending} onClick={() => setConfirming(true)}>Update</Button></Box>
      </Paper>
      <ConfirmDialog open={confirming} busy={save.isPending} title="Non-disclosure" message={`Are you sure? The non-disclosure of ${selected?.memberNumber} - ${selected?.coverId} will be updated.`} onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
      <Dialog open={!!searching} onClose={() => setSearching(null)} maxWidth="md" fullWidth>
        <DialogTitle>Members matching "{searching?.q}"</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead><TableRow><TableCell>Member No.</TableCell><TableCell>Name</TableCell><TableCell>IC No.</TableCell><TableCell>Policy No.</TableCell><TableCell>Status</TableCell><TableCell>Eff Date</TableCell></TableRow></TableHead>
            <TableBody>
              {(searching?.items ?? []).map((m) => (
                <TableRow key={m.number} hover sx={{ cursor: 'pointer' }} onClick={() => { setSearching(null); setNumber(m.number); pick(null); load.mutate(m.number) }}>
                  <TableCell>{m.number}</TableCell><TableCell>{m.name}</TableCell><TableCell>{m.icBcPp}</TableCell><TableCell>{m.policyNo}</TableCell><TableCell>{m.status}</TableCell><TableCell>{formatDate(m.payorEffDate)}</TableCell>
                </TableRow>
              ))}
              {searching?.items?.length === 0 && <TableRow><TableCell colSpan={6}>No record found!</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions><Button onClick={() => setSearching(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
