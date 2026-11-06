import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { caseAdjustmentTabsApi, type CaseWorksheetItem } from '../../api/caseRegistration'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'
import { download } from '../../lib/download'
import { formatMoney } from '../../lib/format'

/** The LG tab of the legacy Case Adjustment form: the guarantee letters of the case, issuing a new one, editing a remark and printing a letter. */
export function CaseLgTab({ caseNumber, lgAmount }: { caseNumber: string; lgAmount: number | null }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['adj-lg', caseNumber], queryFn: () => caseAdjustmentTabsApi.lgs(caseNumber) })
  const [amount, setAmount] = useState(lgAmount ? String(lgAmount) : '')
  const [time, setTime] = useState('')
  const [remark, setRemark] = useState('')
  const [editing, setEditing] = useState<{ no: number; text: string } | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const done = (text: string) => { setMessage({ severity: 'success', text }); qc.invalidateQueries({ queryKey: ['adj-lg', caseNumber] }) }
  const fail = (e: unknown) => setMessage({ severity: 'error', text: (e as Error).message })
  // Legacy cmdLG_Click asked "Are you sure?" and then disabled the button, so one visit issues at most one LG.
  const [confirming, setConfirming] = useState(false)
  const issue = useMutation({ mutationFn: () => caseAdjustmentTabsApi.issueLg(caseNumber, { amount: amount ? Number(amount) : null, time: time || null, remark: remark || null }), onSettled: () => setConfirming(false), onSuccess: (r) => done(`Guarantee letter ${r.lgNumber} issued for ${formatMoney(r.amount)} (balance before ${formatMoney(r.balance)}).`), onError: fail })
  const save = useMutation({ mutationFn: () => caseAdjustmentTabsApi.lgRemark(caseNumber, editing!.no, editing!.text), onSuccess: () => { setEditing(null); done('Remark updated.') }, onError: fail })
  const print = async (no: number, number: string) => { try { download(await caseAdjustmentTabsApi.lgLetter(caseNumber, no), `${number}.pdf`) } catch (e) { fail(e) } }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField size="small" type="number" label="LG Amount" value={amount} onChange={(e) => setAmount(e.target.value)} sx={{ width: 150 }} />
        <TextField size="small" label="LG Time (hh:mm)" value={time} onChange={(e) => setTime(e.target.value)} sx={{ width: 150 }} slotProps={{ htmlInput: { maxLength: 5 } }} />
        <TextField size="small" label="LG Remark" value={remark} onChange={(e) => setRemark(e.target.value)} sx={{ width: 280 }} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <Button variant="contained" disabled={issue.isPending || issue.isSuccess || !amount || !time} onClick={() => { setMessage(null); setConfirming(true) }}>Issue LG</Button>
        <ConfirmDialog open={confirming} busy={issue.isPending} title="Issue LG" message="Are you sure?" onConfirm={() => issue.mutate()} onCancel={() => setConfirming(false)} />
      </Box>
      <Table size="small">
        <TableHead><TableRow>{['LG No', 'Date', 'Amount', 'Patient', 'Admitted', 'Hospital', 'Issued by', 'Remark', 'Time', ''].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {(list.data ?? []).map((l) => (
            <TableRow key={l.lgNo}>
              <TableCell>{l.lgNumber}</TableCell><TableCell>{toDmy(l.date ?? '')}</TableCell><TableCell align="right">{formatMoney(l.amount)}</TableCell><TableCell>{l.patientId} {l.patientName}</TableCell><TableCell>{toDmy(l.admitted ?? '')}</TableCell>
              <TableCell>{l.hospital}</TableCell><TableCell>{l.issuedBy}</TableCell>
              <TableCell>{editing?.no === l.lgNo ? <TextField size="small" value={editing.text} onChange={(e) => setEditing({ no: l.lgNo, text: e.target.value })} slotProps={{ htmlInput: { maxLength: 100 } }} /> : l.remark}</TableCell>
              <TableCell>{l.userTime} / {l.systemTime}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {editing?.no === l.lgNo ? <><Button size="small" onClick={() => save.mutate()}>Save</Button><Button size="small" onClick={() => setEditing(null)}>Cancel</Button></> : <Button size="small" onClick={() => setEditing({ no: l.lgNo, text: l.remark ?? '' })}>Edit remark</Button>}
                <Button size="small" onClick={() => print(l.lgNo, l.lgNumber)}>Print</Button>
              </TableCell>
            </TableRow>
          ))}
          {list.data?.length === 0 && <TableRow><TableCell colSpan={10}>No guarantee letters issued for this case.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Box>
  )
}

/** The Worksheet tab: the claim versions of the case and the payor approval of the selected one. */
export function CaseWorksheetTab({ caseNumber }: { caseNumber: string }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['adj-ws', caseNumber], queryFn: () => caseAdjustmentTabsApi.worksheets(caseNumber) })
  const [sel, setSel] = useState<CaseWorksheetItem | null>(null)
  const [date, setDate] = useState('')
  const [code, setCode] = useState('')
  const [ind, setInd] = useState('')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const pick = (w: CaseWorksheetItem) => { setSel(w); setDate(w.payorApprovalDate?.slice(0, 10) ?? ''); setCode(w.payorApprovalCode ?? ''); setInd(w.bordxReversalIndicator ?? ''); setStatus(w.reversalBordxStatus ?? ''); setMessage(null) }
  const update = useMutation({
    mutationFn: () => caseAdjustmentTabsApi.approve(caseNumber, sel!.version, { approvalDate: date || null, approvalCode: code || null, reversalIndicator: ind || null, reversalStatus: status || null }),
    onSuccess: () => { setMessage({ severity: 'success', text: 'Record has been updated' }); qc.invalidateQueries({ queryKey: ['adj-ws', caseNumber] }) },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const yn = [['', '(none)'], ['Y', 'Y'], ['N', 'N']]
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Table size="small">
        <TableHead><TableRow>{['Claim', 'Actual', 'Approved', 'Pay to hospital', 'Pay to member', 'Bordx ref', 'Bordx date', 'Bordx amount', 'Payor app', 'App date', 'App code', 'Rev', 'Carton', 'Sent', 'DN/CN ref', 'DN/CN date'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {(list.data ?? []).map((w) => (
            <TableRow key={w.version} hover selected={sel?.version === w.version} onClick={() => pick(w)} sx={{ cursor: 'pointer' }}>
              <TableCell>{caseNumber}-{w.version}</TableCell><TableCell align="right">{formatMoney(w.totalActual)}</TableCell><TableCell align="right">{formatMoney(w.totalApproved)}</TableCell><TableCell align="right">{formatMoney(w.payableToHospital)}</TableCell><TableCell align="right">{formatMoney(w.payableToMember)}</TableCell>
              <TableCell>{w.bordxRefNo}</TableCell><TableCell>{toDmy(w.bordxDate ?? '')}</TableCell><TableCell align="right">{formatMoney(w.bordxAmount)}</TableCell><TableCell>{w.payorApprovalStatus}</TableCell><TableCell>{toDmy(w.payorApprovalDate ?? '')}</TableCell>
              <TableCell>{w.payorApprovalCode}</TableCell><TableCell>{w.bordxReversalIndicator}</TableCell><TableCell>{w.cartonNo}</TableCell><TableCell>{toDmy(w.sentDate ?? '')}</TableCell><TableCell>{w.debitCreditRef}</TableCell><TableCell>{toDmy(w.debitCreditDate ?? '')}</TableCell>
            </TableRow>
          ))}
          {list.data?.length === 0 && <TableRow><TableCell colSpan={16}>No worksheets for this case.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start', opacity: sel ? 1 : 0.5, pointerEvents: sel ? 'auto' : 'none' }}>
        <Typography variant="subtitle2" sx={{ width: '100%' }}>Payor approval {sel ? `- claim ${caseNumber}-${sel.version} (bordx amount ${formatMoney(sel.bordxAmount)})` : '- select a claim'}</Typography>
        <DateField label="Approval Date" required value={date} onChange={setDate} />
        <TextField size="small" label="Approval Code (12 digits)" value={code} onChange={(e) => setCode(e.target.value)} sx={{ width: 240 }} slotProps={{ htmlInput: { maxLength: 20 } }} />
        <TextField select size="small" label="Bordx reversal" value={ind} onChange={(e) => setInd(e.target.value)} sx={{ width: 150 }}>{yn.map(([c, n]) => <MenuItem key={c} value={c}>{n}</MenuItem>)}</TextField>
        <TextField select size="small" label="Reversal status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 150 }}>{yn.map(([c, n]) => <MenuItem key={c} value={c}>{n}</MenuItem>)}</TextField>
        <Button variant="contained" disabled={update.isPending} onClick={() => { setMessage(null); update.mutate() }}>Update</Button>
      </Paper>
    </Box>
  )
}
