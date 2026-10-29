import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { caseTransferApi, type CaseTransferParty } from '../../api/caseTransfers'
import { toDmy } from '../../lib/dates'

const statusName: Record<string, string> = { A: 'A - Active', C: 'C - Cancel', D: 'D - Delete' }

function Party({ title, p }: { title: string; p: CaseTransferParty | null }) {
  const row = (label: string, value: string | null | undefined) => <TextField size="small" label={label} value={value ?? ''} disabled sx={{ width: 200 }} slotProps={{ inputLabel: { shrink: true } }} />
  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
      <Typography variant="subtitle2" sx={{ width: '100%' }}>{title}</Typography>
      {row('Member No.', p?.memberNumber)}{row('Cov ID', p?.coverId)}{row('Patient', p?.name)}{row('Policy No.', p?.policyNo)}{row('IC No.', p?.icNo)}
      {row('Pol Status', p?.status ? statusName[p.status] ?? p.status : '')}{row('Eff Date', toDmy(p?.effectiveDate ?? ''))}{row('Exp Date', toDmy(p?.expiryDate ?? ''))}
    </Paper>
  )
}

/** Legacy: Case > Case Transfer (frmCaseTransferMBMNo) and Case > Temp Case Transfer (FrmTempCaseTransfer). */
export function CaseTransferPage({ temporary = false }: { temporary?: boolean }) {
  const api = caseTransferApi(temporary)
  const [caseNo, setCaseNo] = useState('')
  const [current, setCurrent] = useState<CaseTransferParty | null>(null)
  const [loadedCase, setLoadedCase] = useState('')
  const [member, setMember] = useState('')
  const [cover, setCover] = useState('00')
  const [target, setTarget] = useState<CaseTransferParty | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const reset = () => { setCaseNo(''); setCurrent(null); setLoadedCase(''); setMember(''); setCover('00'); setTarget(null) }

  const go = useMutation({
    mutationFn: () => api.current(caseNo.trim()),
    onSuccess: (p) => { setCurrent(p); setLoadedCase(caseNo.trim()); setMember(temporary ? '' : p.memberNumber); setCover(temporary ? '00' : p.coverId); setTarget(temporary ? null : p); setMessage(null) },
    onError: (e) => { setCurrent(null); setLoadedCase(''); setTarget(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const lookup = useMutation({
    mutationFn: () => api.party(member.trim(), cover.trim()),
    onSuccess: (p) => { setTarget(p); if (!p.policyNo || !p.name) setMessage({ severity: 'error', text: !p.policyNo ? 'Member not found !' : 'Invalid Cover ID ! Pls try again !' }); else setMessage(null) },
    onError: (e) => { setTarget(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const transfer = useMutation({
    mutationFn: () => api.transfer(loadedCase, member.trim(), cover.trim()),
    onSuccess: (r) => { setConfirming(false); reset(); setMessage({ severity: 'success', text: r.message + (r.temporaryMemberRemoved ? ' The temporary membership was removed.' : '') }) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const ready = !!current && !!member.trim() && cover.trim().length === 2

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">{temporary ? 'Temporary Case Transfer' : 'Case - Transfer of Membership'}</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <TextField size="small" label={temporary ? 'Temp Case No.' : 'Case No.'} value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) go.mutate() }} slotProps={{ htmlInput: { maxLength: 15 } }} />
        <Button variant="contained" disabled={!caseNo.trim() || go.isPending} onClick={() => { setMessage(null); go.mutate() }}>Go</Button>
        <Button variant="outlined" onClick={() => { reset(); setMessage(null) }}>Cancel</Button>
      </Paper>
      <Party title={temporary ? 'Temp Member' : 'Current Member'} p={current} />
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start', opacity: current ? 1 : 0.5, pointerEvents: current ? 'auto' : 'none' }}>
        <Typography variant="subtitle2" sx={{ width: '100%' }}>Transfer Member</Typography>
        <TextField size="small" label="Transfer No." value={member} onChange={(e) => { setMember(e.target.value); setTarget(null) }} onBlur={() => { if (member.trim() && cover.trim().length === 2) lookup.mutate() }} slotProps={{ htmlInput: { maxLength: 15 } }} />
        <TextField size="small" label="Cov ID" value={cover} onChange={(e) => { setCover(e.target.value); setTarget(null) }} onBlur={() => { if (member.trim() && cover.trim().length === 2) lookup.mutate() }} sx={{ width: 90 }} slotProps={{ htmlInput: { maxLength: 2 } }} />
        <Button variant="outlined" disabled={!ready || lookup.isPending} onClick={() => lookup.mutate()}>Check</Button>
      </Paper>
      <Party title="Transfer Member details" p={target} />
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button variant="contained" disabled={!ready || !target?.name || transfer.isPending} onClick={() => { setMessage(null); setConfirming(true) }}>Transfer</Button>
      </Box>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>{temporary ? 'Transfer temporary case' : 'Transfer case'}</DialogTitle>
        <DialogContent><DialogContentText>
          {temporary
            ? `Case ${loadedCase} will get a new case number of the payor of ${member}, move to ${member}-${cover}, and the temporary membership ${current?.memberNumber} will be removed if it has no other case. Continue?`
            : `Case ${loadedCase} will move from ${current?.memberNumber}-${current?.coverId} to ${member}-${cover}, and its approved claims will be moved between the two members' limits. Continue?`}
        </DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirming(false)}>No</Button><Button variant="contained" disabled={transfer.isPending} onClick={() => transfer.mutate()}>Yes</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
