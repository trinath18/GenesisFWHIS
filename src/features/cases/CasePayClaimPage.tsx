import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { casePayClaimApi, type CasePayClaimView } from '../../api/caseTransfers'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'
import { download } from '../../lib/download'

const reasons: [keyof Flags, string][] = [['infoInv', 'Further information/investigation is required on your condition'], ['nonPan', 'Non-Panel Hospital'], ['nonCash', 'No cashless 90 days'], ['covgSub', 'Coverage subject to Radiology/Scan result which is pending'], ['confInfo', 'Conflicting information provided'], ['lab', 'Awaiting lab test result which is pending'], ['othersChecked', 'Others']]
type Flags = { lab: boolean; confInfo: boolean; infoInv: boolean; covgSub: boolean; nonPan: boolean; nonCash: boolean; othersChecked: boolean }
const none: Flags = { lab: false, confInfo: false, infoInv: false, covgSub: false, nonPan: false, nonCash: false, othersChecked: false }

/** Legacy: Case > Case PayClaim (frmCASPayClaim). */
export function CasePayClaimPage() {
  const [caseNo, setCaseNo] = useState('')
  const [view, setView] = useState<CasePayClaimView | null>(null)
  const [date, setDate] = useState('')
  const [flags, setFlags] = useState<Flags>(none)
  const [others, setOthers] = useState('')
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const fill = (v: CasePayClaimView) => {
    const r = v.record
    setView(v); setDate(r?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)); setOthers(r?.others ?? '')
    setFlags(r ? { lab: r.lab, confInfo: r.confInfo, infoInv: r.infoInv, covgSub: r.covgSub, nonPan: r.nonPan, nonCash: r.nonCash, othersChecked: r.othersChecked } : none)
  }
  const show = useMutation({ mutationFn: () => casePayClaimApi.get(caseNo.trim()), onSuccess: (v) => { fill(v); setMessage(null) }, onError: (e) => { setView(null); setMessage({ severity: 'error', text: (e as Error).message }) } })
  const save = useMutation({
    mutationFn: () => casePayClaimApi.save(view!.caseNumber, { date: date || null, ...flags, others: flags.othersChecked ? others : null }),
    onSuccess: async (r) => { setConfirming(false); setMessage({ severity: 'success', text: r.updated ? 'Record Updated...' : 'Record Saved...' }); fill(await casePayClaimApi.get(view!.caseNumber)) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const print = async () => { try { download(await casePayClaimApi.letter(view!.caseNumber), `payclaim-${view!.caseNumber}.pdf`) } catch (e) { setMessage({ severity: 'error', text: (e as Error).message }) } }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Pay & Claim</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <TextField size="small" label="Case Number" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) show.mutate() }} slotProps={{ htmlInput: { maxLength: 15 } }} />
        <Button variant="contained" disabled={!caseNo.trim() || show.isPending} onClick={() => { setMessage(null); show.mutate() }}>Go</Button>
      </Paper>
      {view && (
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[['Principal Name', view.principalName], ['Membership No.', view.memberNumber], ['Policy No.', view.policyNo], ['Patient Name', view.patientName], ['Date of Admission', toDmy(view.admitted ?? '')], ['Date of Discharge', toDmy(view.discharged ?? '')]].map(([l, v]) => (
            <TextField key={l} size="small" label={l} value={v ?? ''} disabled sx={{ width: 220 }} slotProps={{ inputLabel: { shrink: true } }} />
          ))}
        </Paper>
      )}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, opacity: view ? 1 : 0.5, pointerEvents: view ? 'auto' : 'none' }}>
        <DateField label="Pay & Claim Date" required value={date} onChange={setDate} />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Actions</Typography>
        {reasons.map(([k, label]) => <FormControlLabel key={k} control={<Checkbox size="small" checked={flags[k]} onChange={(e) => setFlags((f) => ({ ...f, [k]: e.target.checked }))} />} label={label} />)}
        {flags.othersChecked && <TextField size="small" label="Remarks" required value={others} onChange={(e) => setOthers(e.target.value)} slotProps={{ htmlInput: { maxLength: 50 } }} />}
        {view?.record && <Typography variant="caption" color="text.secondary">Registered by {view.record.registeredBy} {toDmy(view.record.registered ?? '')}; last updated by {view.record.updatedBy} {toDmy(view.record.updated ?? '')}</Typography>}
      </Paper>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button variant="outlined" disabled={!view?.record} onClick={print}>Letter Format</Button>
        <Button variant="contained" disabled={!view || save.isPending} onClick={() => { setMessage(null); setConfirming(true) }}>{view?.record ? 'Update' : 'Save'}</Button>
      </Box>
      <Dialog open={confirming} onClose={() => setConfirming(false)}><DialogTitle>Pay & Claim</DialogTitle><DialogContent><DialogContentText>Are you sure?</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirming(false)}>No</Button><Button variant="contained" disabled={save.isPending} onClick={() => save.mutate()}>Yes</Button></DialogActions></Dialog>
    </Box>
  )
}
