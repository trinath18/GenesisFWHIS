import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { worksheetApi, worksheetStatuses, type WorksheetPreview, type WorksheetSaveRequest, type WorksheetSaveResult } from '../../api/worksheets'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatMoney } from '../../lib/format'

type Fields = Omit<WorksheetSaveRequest, 'expectedFinalApproved' | 'limitOverrides' | 'exGratia'>
const empty: Fields = {
  worksheetStatus: 'AA', remarks: null, debitCreditRemarks: null, note: null, payTo: null, bank: null, accountNo: null, address1: null, address2: null, address3: null,
  postCode: null, city: null, state: null, paymentMode: null, attention: null,
}
const text = (v: string | null) => (v == null || v.trim() === '' ? null : v.trim())

/**
 * The save part of the legacy worksheet forms: status, remarks and, when the member is paid, the payee and address. Registration saves a new version;
 * Worksheet Adjustment passes its own `submit` and the details the version was saved with.
 */
export function WorksheetSavePanel({ data, typed, onSaved, initial, submit, title, action = 'Save Worksheet' }: {
  data: WorksheetPreview; typed: Record<number, string>; onSaved: (r: WorksheetSaveResult) => void
  initial?: Partial<WorksheetSaveRequest>; submit?: (r: WorksheetSaveRequest) => Promise<WorksheetSaveResult>; title?: string; action?: string
}) {
  const start = { ...empty, ...Object.fromEntries(Object.entries(initial ?? {}).filter(([k]) => k in empty)), worksheetStatus: initial?.worksheetStatus ?? empty.worksheetStatus } as Fields
  const [f, setF] = useState<Fields>(start)
  const [exGratia, setExGratia] = useState(initial?.exGratia ?? false)
  const [confirming, setConfirming] = useState(false)
  const memberPaid = data.invoices.some((i) => i.payTo === 'M')
  const set = (patch: Partial<Fields>) => setF((x) => ({ ...x, ...patch }))
  const save = useMutation({
    mutationFn: () => (submit ?? ((r: WorksheetSaveRequest) => worksheetApi.save(data.case.caseNumber, r)))({
      ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, k === 'worksheetStatus' ? v : text(v as string | null)])) as Fields,
      expectedFinalApproved: data.calculation.finalApproved, exGratia,
      limitOverrides: Object.fromEntries(Object.entries(typed).filter(([, v]) => v.trim() !== '')),
    }),
    onSuccess: (r) => { setConfirming(false); if (!submit) setF(empty); onSaved(r) },
    onError: () => setConfirming(false),
  })
  const field = (key: keyof Fields, label: string, max: number, required = false) => (
    <TextField size="small" label={label} required={required} value={f[key] ?? ''} onChange={(e) => set({ [key]: e.target.value })} slotProps={{ htmlInput: { maxLength: max } }} />
  )
  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle1">{title ?? `Save worksheet ${data.case.caseNumber}-${data.version}`}</Typography>
      {save.isError && <Alert severity="error">{(save.error as Error).message}</Alert>}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
        <TextField select size="small" label="Worksheet Status" required value={f.worksheetStatus} onChange={(e) => set({ worksheetStatus: e.target.value })}>
          {worksheetStatuses.map(([c, n]) => <MenuItem key={c} value={c}>{c} - {n}</MenuItem>)}
        </TextField>
        {field('remarks', 'WS Remarks', 160)}{field('debitCreditRemarks', 'Credit/Debit Note Remarks', 200)}{field('note', 'Note', 100)}
        <FormControlLabel label="Ex-gratia" control={<Checkbox size="small" checked={exGratia} onChange={(e) => setExGratia(e.target.checked)} />} />
      </Box>
      {memberPaid && (
        <>
          <Typography variant="subtitle2">Member payment</Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            {field('payTo', 'Pay To', 50)}{field('bank', 'Bank', 40)}{field('accountNo', 'Account No', 30)}{field('paymentMode', 'Payment Mode', 50)}
            {field('address1', 'Address', 50, true)}{field('address2', 'Address 2', 50)}{field('address3', 'Address 3', 50)}{field('attention', 'Attention', 60)}
            {field('postCode', 'Post Code', 6, true)}{field('city', 'City', 50, true)}{field('state', 'State', 50, true)}
          </Box>
        </>
      )}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography sx={{ flex: 1 }}>Final approved {formatMoney(data.calculation.finalApproved)} · Hospital {formatMoney(data.calculation.payableToHospital)} · Member {formatMoney(data.calculation.payableToMember)}</Typography>
        <Button variant="contained" disabled={data.invoices.length === 0 || save.isPending} onClick={() => setConfirming(true)}>{action}</Button>
      </Box>
      <ConfirmDialog open={confirming} busy={save.isPending} title={action}
        message={submit ? `Rewrite worksheet ${data.case.caseNumber}-${data.version} with ${formatMoney(data.calculation.finalApproved)} approved?`
          : `Save worksheet ${data.case.caseNumber}-${data.version} for ${formatMoney(data.calculation.finalApproved)}? Its ${data.invoices.length} invoice(s) can no longer be removed afterwards.`}
        onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
    </Paper>
  )
}
