import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { caseTransferApi, type CaseTransferParty } from '../../api/caseTransfers'
import { LegacyFrame, LegacyRow as L, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { toDmy } from '../../lib/dates'

const statusName: Record<string, string> = { A: 'A - Active', C: 'C - Cancel', D: 'D - Delete' }
const ro = (v: string | null | undefined, w: number | string = '100%') => <TextField size="small" sx={{ ...box, width: w }} value={v ?? ''} slotProps={{ input: { readOnly: true } }} />

/**
 * One member frame of the legacy form: Member No. (Transfer No.) and Cov ID, Policy No. and Pol Status, IC No. and Eff Date, Patient and Exp Date. The
 * transfer frame takes the member number and cover ID; everything else is filled in from the member.
 */
function Party({ title, numberLabel, p, number, cover }: { title: string; numberLabel: string; p: CaseTransferParty | null; number?: ReactNode; cover?: ReactNode }) {
  return (
    <LegacyFrame title={title}>
      <L label={numberLabel} w={85}>{number ?? ro(p?.memberNumber, 170)}<Typography sx={{ fontSize: 13, width: 65, ml: 1 }}>Cov ID</Typography>{cover ?? ro(p?.coverId, 70)}</L>
      <L label="Policy No." w={85}>{ro(p?.policyNo, 170)}<Typography sx={{ fontSize: 13, width: 65, ml: 1 }}>Pol Status</Typography>{ro(p?.status ? statusName[p.status] ?? p.status : '', 130)}</L>
      <L label="IC No." w={85}>{ro(p?.icNo, 170)}<Typography sx={{ fontSize: 13, width: 65, ml: 1 }}>Eff Date</Typography>{ro(toDmy(p?.effectiveDate ?? ''), 130)}</L>
      <L label="Patient" w={85}>{ro(p?.name, 170)}<Typography sx={{ fontSize: 13, width: 65, ml: 1 }}>Exp Date</Typography>{ro(toDmy(p?.expiryDate ?? ''), 130)}</L>
    </LegacyFrame>
  )
}

/** Legacy: Case > Case Transfer (frmCaseTransferMBMNo, "Case - Transfer of Membership") and Case > Temp Case Transfer (FrmTempCaseTransfer). */
export function CaseTransferPage({ temporary = false }: { temporary?: boolean }) {
  const api = caseTransferApi(temporary)
  const navigate = useNavigate()
  const [caseNo, setCaseNo] = useState('')
  const [current, setCurrent] = useState<CaseTransferParty | null>(null)
  const [loadedCase, setLoadedCase] = useState('')
  const [member, setMember] = useState('')
  const [cover, setCover] = useState('00')
  const [target, setTarget] = useState<CaseTransferParty | null>(null)
  const [newCase, setNewCase] = useState('')
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const reset = () => { setCaseNo(''); setCurrent(null); setLoadedCase(''); setMember(''); setCover('00'); setTarget(null) }

  const go = useMutation({
    mutationFn: () => api.current(caseNo.trim()),
    onSuccess: (p) => { setCurrent(p); setLoadedCase(caseNo.trim()); setNewCase(''); setMember(temporary ? '' : p.memberNumber); setCover(temporary ? '00' : p.coverId); setTarget(temporary ? null : p); setMessage(null) },
    onError: (e) => { setCurrent(null); setLoadedCase(''); setTarget(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const lookup = useMutation({
    mutationFn: () => api.party(member.trim(), cover.trim()),
    onSuccess: (p) => { setTarget(p); if (!p.policyNo || !p.name) setMessage({ severity: 'error', text: !p.policyNo ? 'Member not found !' : 'Invalid Cover ID ! Pls try again !' }); else setMessage(null) },
    onError: (e) => { setTarget(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const transfer = useMutation({
    mutationFn: () => api.transfer(loadedCase, member.trim(), cover.trim()),
    onSuccess: (r) => { setConfirming(false); reset(); setNewCase(r.newCaseNumber); setMessage({ severity: 'success', text: r.message + (r.temporaryMemberRemoved ? ' The temporary membership was removed.' : '') }) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const ready = !!current && !!member.trim() && cover.trim().length === 2
  const check = () => { if (member.trim() && cover.trim().length === 2) lookup.mutate() }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>{temporary ? 'Temporary Case Transfer' : 'Case - Transfer of Membership'}</LegacyTitle>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 1 }}>
        <LegacyFrame>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 13, width: 85 }}>{temporary ? 'Temp Case' : 'Case No.'}</Typography>
            <TextField size="small" sx={{ ...box, width: 170 }} value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) go.mutate() }} slotProps={{ htmlInput: { maxLength: 15 } }} />
            <Button size="small" variant="outlined" disabled={!caseNo.trim() || go.isPending} onClick={() => { setMessage(null); go.mutate() }}>Go</Button>
            {temporary && <><Typography sx={{ fontSize: 13, ml: 4 }}>Case No.</Typography>{<TextField size="small" sx={{ ...yellow, width: 170 }} value={newCase} slotProps={{ input: { readOnly: true } }} title="The new case number, after the transfer" />}</>}
          </Box>
        </LegacyFrame>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Party title={temporary ? 'Temp Member' : 'Current Member'} numberLabel="Member No." p={current} />
          <Box sx={{ opacity: current ? 1 : 0.55, pointerEvents: current ? 'auto' : 'none' }}>
            <Party title="Transfer Member" numberLabel="Transfer No." p={target}
              number={<TextField size="small" sx={{ ...box, width: 170 }} value={member} onChange={(e) => { setMember(e.target.value); setTarget(null) }} onBlur={check} onKeyDown={(e) => { if (e.key === 'Enter') check() }} slotProps={{ htmlInput: { maxLength: 15 } }} />}
              cover={<TextField size="small" sx={{ ...box, width: 70 }} value={cover} onChange={(e) => { setCover(e.target.value); setTarget(null) }} onBlur={check} onKeyDown={(e) => { if (e.key === 'Enter') check() }} slotProps={{ htmlInput: { maxLength: 2 } }} />} />
          </Box>
        </Box>
        <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button size="small" variant="contained" disabled={!ready || !target?.name || transfer.isPending} onClick={() => { setMessage(null); setConfirming(true) }}>Transfer</Button>
          <Button size="small" variant="outlined" onClick={() => { reset(); setNewCase(''); setMessage(null) }}>Cancel</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Paper>
      </Paper>

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
