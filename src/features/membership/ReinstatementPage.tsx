import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { reinstatementApi, type ReinstatementMember, type ReinstatementQuote } from '../../api/reinstatement'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Field, FieldGrid } from '../../components/DataTables'
import { formatDate, formatMoney } from '../../lib/format'
import { DateInput } from '../../components/DateField'

/** Legacy: Membership > Member Reinstatement. Re-activates a cancelled member; premium and MCO fee are calculated by the server from the rate tables. */
export function ReinstatementPage() {
  const [number, setNumber] = useState('')
  const [member, setMember] = useState<ReinstatementMember | null>(null)
  const [bordx, setBordx] = useState('')
  const [date, setDate] = useState('')
  const [batch, setBatch] = useState('')
  const [quote, setQuote] = useState<ReinstatementQuote | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const request = () => ({ memberNumber: member!.memberNumber, endorsementBordxDate: bordx || null, reinstateDate: date || null, batchNo: batch ? Number(batch) : null })
  const search = useMutation({
    mutationFn: () => reinstatementApi.get(number),
    onSuccess: (m) => { setMember(m); setQuote(null); setMessage(m.status !== 'C' ? { severity: 'error', text: 'Membership is active!' } : null) },
    onError: (e) => { setMember(null); setQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const price = useMutation({
    mutationFn: () => reinstatementApi.quote(request()),
    onSuccess: (q) => { setQuote(q); setMessage(null) },
    onError: (e) => { setQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const reinstate = useMutation({
    mutationFn: () => reinstatementApi.reinstate(request()),
    onSuccess: (r) => {
      setConfirming(false); setQuote(null)
      setMessage({ severity: r.crossReferenceUpdated ? 'success' : 'error', text: r.crossReferenceUpdated ? `Membership reinstated successfully: premium ${formatMoney(r.totalPremium)}, MCO fee ${formatMoney(r.totalMcoFee)}.` : 'Membership reinstated, but the maintenance cross-reference could not be updated. Please tell IT to re-run the sync.' })
      search.mutate()
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const submit = (e: FormEvent) => { e.preventDefault(); setMessage(null); search.mutate() }

  return (
    <>
      <Typography variant="h5" gutterBottom>Member Reinstatement</Typography>
      <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" label="Membership number" value={number} onChange={(e) => setNumber(e.target.value)} sx={{ width: 280 }} autoFocus />
        <Button type="submit" variant="contained" disabled={!number.trim() || search.isPending}>Search</Button>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {member && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2 }}>
          <FieldGrid>
            <Field label="Name" value={member.name} /><Field label="Policy No" value={member.policyNo} /><Field label="Status" value={member.status === 'C' ? 'C - Cancelled' : member.status === 'A' ? 'A - Active' : member.status} />
            <Field label="Payor effective" value={formatDate(member.effectiveDate)} /><Field label="Payor expiry" value={formatDate(member.expiryDate)} />
            <Field label="Final expiry" value={formatDate(member.finalExpiryDate)} /><Field label="Lapsed date" value={formatDate(member.lapsedDate)} />
            <Field label="Plan" value={member.plan} /><Field label="Covered persons" value={member.hasSupplementary ? member.coveredPersons.length : 0} />
          </FieldGrid>
          {member.canReinstate && (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <DateInput label="Endorsement bordx date" value={bordx} onChange={(e) => { setBordx(e.target.value); setQuote(null) }} />
              <DateInput label="Reinstate date" value={date} onChange={(e) => { setDate(e.target.value); setQuote(null) }} />
              <TextField size="small" type="number" label="Batch no" value={batch} onChange={(e) => { setBatch(e.target.value); setQuote(null) }} sx={{ width: 120 }} />
              <Button variant="outlined" disabled={price.isPending} onClick={() => { setMessage(null); price.mutate() }}>Calculate fees</Button>
            </Box>
          )}
          {quote && (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead><TableRow><TableCell>Cover</TableCell><TableCell align="right">Premium</TableCell><TableCell align="right">MCO fee</TableCell></TableRow></TableHead>
                  <TableBody>
                    {quote.lines.map((l) => <TableRow key={l.coverId}><TableCell>{l.coverId}</TableCell><TableCell align="right">{formatMoney(l.premium)}</TableCell><TableCell align="right">{formatMoney(l.mcoFee)}</TableCell></TableRow>)}
                    <TableRow><TableCell><b>Total</b></TableCell><TableCell align="right"><b>{formatMoney(quote.totalPremium)}</b></TableCell><TableCell align="right"><b>{formatMoney(quote.totalMcoFee)}</b></TableCell></TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Box><Button variant="contained" onClick={() => setConfirming(true)} disabled={reinstate.isPending}>Reinstate</Button></Box>
            </>
          )}
        </Paper>
      )}
      <ConfirmDialog open={confirming} busy={reinstate.isPending} title="Reinstate membership" message={`Do you want to reinstate ${member?.memberNumber}? Premium ${formatMoney(quote?.totalPremium)} and MCO fee ${formatMoney(quote?.totalMcoFee)} will be recorded.`} onConfirm={() => reinstate.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}
