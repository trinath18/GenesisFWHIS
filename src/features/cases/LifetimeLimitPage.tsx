import { Alert, Box, Button, Chip, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { lifetimeLimitApi, type LifetimeCase, type LifetimeLimitView } from '../../api/caseMenu'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { RowsTable, type Column } from '../../components/DataTables'
import { formatDate, formatMoney } from '../../lib/format'

const caseColumns: Column<LifetimeCase>[] = [
  { header: 'MBM Number', cell: (r) => r.memberNumber }, { header: 'Case Number', cell: (r) => r.caseNumber }, { header: 'Patient ID', cell: (r) => r.coverId },
  { header: 'Patient Name', cell: (r) => r.patientName }, { header: 'Admission Date', cell: (r) => formatDate(r.admitted) }, { header: 'Discharge Date', cell: (r) => formatDate(r.discharged) },
  { header: 'Claimability', cell: (r) => r.claimability },
]

/** Legacy: Case > Lifetime Lmt Upgrade (frmMembershipLifetimeLmt). Shows the renewal chain of a member and allocates the lifetime limit (3 x annual limit). */
export function LifetimeLimitPage() {
  const [member, setMember] = useState('')
  const [cover, setCover] = useState('00')
  const [view, setView] = useState<LifetimeLimitView | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)

  const go = useMutation({
    mutationFn: () => lifetimeLimitApi.get(member.trim(), cover.trim()),
    onSuccess: (v) => { setView(v); setMessage({ severity: v.allocated ? 'info' : 'warning', text: v.status }) },
    onError: (e) => { setView(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const update = useMutation({
    mutationFn: () => lifetimeLimitApi.allocate(view!.memberNumber, view!.coverId),
    onSuccess: (r) => { setConfirming(false); setMessage({ severity: 'success', text: `${r.message.trim()} Lifetime limit ${formatMoney(r.lifetimeLimit)}.` }); go.mutate() },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const ready = member.trim() !== '' && cover.trim().length === 2
  // Same checks as the legacy Update button, shown before the user tries.
  const blocked = !view ? 'Press Go first.' : !view.qualified ? 'This Member is not qualified for Lifetime Limit (needs 3 memberships in the renewal chain).' : view.hasClaimsHistory ? 'This Member has claims history.' : view.allocated ? 'Lifetime Limit has been allocated for this member.' : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Lifetime Limit Upgrade</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField size="small" label="Member No" value={member} onChange={(e) => { setMember(e.target.value); setView(null) }} onKeyDown={(e) => { if (e.key === 'Enter' && ready) go.mutate() }} slotProps={{ htmlInput: { maxLength: 15 } }} />
        <TextField size="small" label="Cover ID" value={cover} onChange={(e) => { setCover(e.target.value); setView(null) }} sx={{ width: 90 }} slotProps={{ htmlInput: { maxLength: 2 } }} />
        <Button variant="contained" disabled={!ready || go.isPending} onClick={() => { setMessage(null); go.mutate() }}>Go</Button>
        <TextField size="small" label="Lifetime Lmt" value={view?.lifetimeLimit != null ? formatMoney(view.lifetimeLimit) : ''} disabled slotProps={{ inputLabel: { shrink: true } }} />
        {view && <Chip sx={{ alignSelf: 'center' }} color={view.allocated ? 'success' : 'default'} label={view.allocated ? 'Allocated' : 'Not allocated'} />}
        {view?.topupNumber && <Typography variant="body2" sx={{ alignSelf: 'center' }}>Top-up No. {view.topupNumber}</Typography>}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" color="secondary" disabled={!!blocked || update.isPending} title={blocked ?? ''} onClick={() => setConfirming(true)}>Update</Button>
      </Paper>
      <Typography variant="subtitle2">Membership Listing</Typography>
      <RowsTable rows={view?.memberships ?? []} empty={view ? 'No memberships.' : 'Enter the member number and cover ID, then Go.'} columns={[
        { header: 'Member Number', cell: (r) => r.memberNumber }, { header: 'Cover ID', cell: (r) => r.coverId }, { header: 'MBM Name', cell: (r) => r.name }, { header: 'IC No', cell: (r) => r.icNo },
        { header: 'Policy No', cell: (r) => r.policyNo }, { header: 'Pol Eff Date', cell: (r) => formatDate(r.effectiveDate) }, { header: 'Pol Exp Date', cell: (r) => formatDate(r.expiryDate) },
        { header: 'Pol Status', cell: (r) => r.status }, { header: 'Data Status', cell: (r) => r.dataStatus },
      ]} />
      <Typography variant="subtitle2">Case Listing</Typography>
      <RowsTable rows={view?.currentCases ?? []} columns={caseColumns} empty="No cases for this membership." />
      <Typography variant="subtitle2">1st and 2nd Year Case Listing</Typography>
      <RowsTable rows={view?.earlierYearCases ?? []} columns={caseColumns} empty="No cases in the earlier years." />
      <ConfirmDialog open={confirming} busy={update.isPending} title="Allocate lifetime limit"
        message={`Allocate the lifetime limit (3 x the plan's annual limit) to ${view?.memberNumber}-${view?.coverId} under top-up number ${view?.topupNumber}?`}
        onConfirm={() => update.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
