import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { caseRegistrationApi } from '../../api/caseRegistration'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { download } from '../../lib/download'
import { formatMoney } from '../../lib/format'

const names: Record<string, string> = { lg: 'Guarantee letter', btbg: 'BTBG letter', repudiation: 'Repudiation letter', 'policy-ending': 'Policy ending letter', expired: 'Policy expired letter' }

/** What the legacy form did straight after registration: issue a guarantee letter (LG) and print the policy ending / expired / repudiation letters. */
export function CaseAfterRegistration({ caseNumber, letters, lgAmount, lgTime, onDone }: { caseNumber: string; letters: string[]; lgAmount: number | null; lgTime: string | null; onDone: () => void }) {
  const [amount, setAmount] = useState(lgAmount ? String(lgAmount) : '')
  const [time, setTime] = useState(lgTime ?? '')
  const [remark, setRemark] = useState('')
  const [lgLetter, setLgLetter] = useState<string | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  // Legacy cmdLG_Click asked "Are you sure?" and then disabled the button, so one visit issues at most one LG.
  const [confirming, setConfirming] = useState(false)
  const issue = useMutation({
    mutationFn: () => caseRegistrationApi.issueLg(caseNumber, { amount: amount ? Number(amount) : null, time: time || null, remark: remark || null }),
    onSettled: () => setConfirming(false),
    onSuccess: (r) => { setLgLetter(r.letter === 'B' ? 'btbg' : 'lg'); setMessage({ severity: 'success', text: `Guarantee letter ${r.lgNumber} issued for ${formatMoney(r.amount)} (balance before ${formatMoney(r.balance)}).` }) },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const print = async (kind: string) => { try { download(await caseRegistrationApi.letter(caseNumber, kind), `${kind}-${caseNumber}.pdf`) } catch (e) { setMessage({ severity: 'error', text: (e as Error).message }) } }
  const all = [...(lgLetter ? [lgLetter] : []), ...letters]

  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle1">Case {caseNumber} registered</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField size="small" type="number" label="LG Amount" value={amount} onChange={(e) => setAmount(e.target.value)} sx={{ width: 150 }} />
        <TextField size="small" label="LG Time (hh:mm)" value={time} onChange={(e) => setTime(e.target.value)} sx={{ width: 150 }} slotProps={{ htmlInput: { maxLength: 5 } }} />
        <TextField size="small" label="LG Remark" value={remark} onChange={(e) => setRemark(e.target.value)} sx={{ width: 280 }} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <Button variant="contained" disabled={issue.isPending || issue.isSuccess || !amount || !time} onClick={() => { setMessage(null); setConfirming(true) }}>Issue LG</Button>
      </Box>
      <ConfirmDialog open={confirming} busy={issue.isPending} title="Issue LG" message="Are you sure?" onConfirm={() => issue.mutate()} onCancel={() => setConfirming(false)} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {all.map((k) => <Button key={k} variant="outlined" onClick={() => print(k)}>{names[k] ?? k}</Button>)}
        {all.length === 0 && <Typography variant="body2" color="text.secondary">No letters are due for this case.</Typography>}
        <Box sx={{ flexGrow: 1 }} /><Button onClick={onDone}>Done</Button>
      </Box>
    </Paper>
  )
}
