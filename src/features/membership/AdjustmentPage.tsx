import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { adjustmentApi, type AdjustmentMember, type CancellationQuote, type PrincipalAmendment } from '../../api/adjustment'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Field, FieldGrid } from '../../components/DataTables'
import { formatDate, formatMoney } from '../../lib/format'

type Form = Record<'name' | 'policyNo' | 'icBcPp' | 'dateOfBirth' | 'sex' | 'address1' | 'address2' | 'address3' | 'city' | 'state' | 'postCode' | 'race' | 'nationality' | 'salutation' | 'email' | 'telHome' | 'telMobile' | 'telOffice' | 'endorsementBordxDate' | 'effectiveDate' | 'batchNo', string>

const textFields: { key: keyof Form; label: string; max: number; required?: boolean }[] = [
  { key: 'name', label: 'Name', max: 60, required: true }, { key: 'icBcPp', label: 'IC / BC / Passport', max: 30, required: true }, { key: 'policyNo', label: 'Policy no', max: 25 },
  { key: 'salutation', label: 'Salutation', max: 5 }, { key: 'address1', label: 'Address 1', max: 50 }, { key: 'address2', label: 'Address 2', max: 50 }, { key: 'address3', label: 'Address 3', max: 50 },
  { key: 'city', label: 'City', max: 50 }, { key: 'state', label: 'State', max: 50 }, { key: 'postCode', label: 'Postcode', max: 6 }, { key: 'race', label: 'Race', max: 2 },
  { key: 'nationality', label: 'Nationality', max: 10 }, { key: 'email', label: 'E-mail', max: 50 }, { key: 'telHome', label: 'Tel (home)', max: 12 }, { key: 'telMobile', label: 'Tel (mobile)', max: 15 },
  { key: 'telOffice', label: 'Tel (office)', max: 15 },
]

const toForm = (m: AdjustmentMember): Form => ({
  name: m.name ?? '', policyNo: m.policyNo ?? '', icBcPp: m.icBcPp ?? '', dateOfBirth: m.dateOfBirth ?? '', sex: m.sex ?? '', address1: m.address1 ?? '', address2: m.address2 ?? '', address3: m.address3 ?? '',
  city: m.city ?? '', state: m.state ?? '', postCode: m.postCode ?? '', race: m.race ?? '', nationality: m.nationality ?? '', salutation: m.salutation ?? '', email: m.email ?? '',
  telHome: m.telHome ?? '', telMobile: m.telMobile ?? '', telOffice: m.telOffice ?? '', endorsementBordxDate: '', effectiveDate: '', batchNo: m.batchNo?.toString() ?? '',
})

/** Legacy: Membership > Adjustment, amendment of a principal's personal details (endorsement type A). Fee-changing endorsements follow later. */
export function AdjustmentPage() {
  const [number, setNumber] = useState('')
  const [member, setMember] = useState<AdjustmentMember | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const load = useMutation({
    mutationFn: () => adjustmentApi.get(number),
    onSuccess: (m) => { setMember(m); setForm(toForm(m)); setMessage(null) },
    onError: (e) => { setMember(null); setForm(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const save = useMutation({
    mutationFn: () => adjustmentApi.amend({ memberNumber: member!.memberNumber, ...form!, dateOfBirth: form!.dateOfBirth || null, endorsementBordxDate: form!.endorsementBordxDate || null, effectiveDate: form!.effectiveDate || null, batchNo: form!.batchNo ? Number(form!.batchNo) : null } as PrincipalAmendment),
    onSuccess: (r) => {
      setConfirming(false); setMember(r.member); setForm(toForm(r.member))
      setMessage(r.crossReferenceUpdated && r.renewalKeyUpdated ? { severity: 'success', text: 'Record updated.' } : { severity: 'error', text: 'Record updated, but the maintenance copies (cross reference / renewal key) could not be updated. Please tell IT to re-run the sync.' })
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const [cx, setCx] = useState({ cancelDate: '', bordx: '', batch: '' })
  const [cxQuote, setCxQuote] = useState<CancellationQuote | null>(null)
  const [cxConfirming, setCxConfirming] = useState(false)
  const cxRequest = () => ({ memberNumber: member!.memberNumber, cancelDate: cx.cancelDate || null, endorsementBordxDate: cx.bordx || null, batchNo: cx.batch ? Number(cx.batch) : null })
  const quoteCx = useMutation({
    mutationFn: () => adjustmentApi.quoteCancellation(cxRequest()),
    onSuccess: (q) => { setCxQuote(q); setMessage(null) },
    onError: (e) => { setCxQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const cancelCx = useMutation({
    mutationFn: () => adjustmentApi.cancel(cxRequest()),
    onSuccess: (r) => {
      setCxConfirming(false); setCxQuote(null)
      setMessage(r.crossReferenceUpdated ? { severity: 'success', text: 'Membership cancelled. Refund recorded.' } : { severity: 'error', text: 'Membership cancelled, but the maintenance cross reference could not be updated. Please tell IT to re-run the sync.' })
      load.mutate()
    },
    onError: (e) => { setCxConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))
  const submit = (e: FormEvent) => { e.preventDefault(); setMessage(null); load.mutate() }

  return (
    <>
      <Typography variant="h5" gutterBottom>Membership Adjustment - Amendment</Typography>
      <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" label="Membership number" value={number} onChange={(e) => setNumber(e.target.value)} sx={{ width: 280 }} autoFocus />
        <Button type="submit" variant="contained" disabled={!number.trim() || load.isPending}>Search</Button>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {member && form && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2 }}>
          <FieldGrid>
            <Field label="Member no" value={member.memberNumber} /><Field label="Status" value={member.status} /><Field label="Plan" value={member.plan} />
            <Field label="Payor effective" value={formatDate(member.payorEffectiveDate)} /><Field label="Payor expiry" value={formatDate(member.payorExpiryDate)} />
          </FieldGrid>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.5 }}>
            {textFields.map((f) => <TextField key={f.key} size="small" label={f.label} required={f.required} value={form[f.key]} onChange={set(f.key)} slotProps={{ htmlInput: { maxLength: f.max } }} />)}
            <TextField size="small" type="date" label="Date of birth" required value={form.dateOfBirth} onChange={set('dateOfBirth')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select size="small" label="Sex" required value={form.sex} onChange={set('sex')}><MenuItem value="M">M - Male</MenuItem><MenuItem value="F">F - Female</MenuItem></TextField>
          </Box>
          <Typography variant="subtitle2">Endorsement</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField size="small" type="date" label="Endorsement bordx date" required value={form.endorsementBordxDate} onChange={set('endorsementBordxDate')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="Effective date" required value={form.effectiveDate} onChange={set('effectiveDate')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Batch no" required value={form.batchNo} onChange={set('batchNo')} sx={{ width: 120 }} />
          </Box>
          <Box><Button variant="contained" onClick={() => { setMessage(null); setConfirming(true) }} disabled={save.isPending}>Update</Button></Box>
        </Paper>
      )}
      {member && form && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Cancel membership</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" type="date" label="Cancellation date" value={cx.cancelDate} onChange={(e) => { setCx({ ...cx, cancelDate: e.target.value }); setCxQuote(null) }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="Cancel bordx date" value={cx.bordx} onChange={(e) => { setCx({ ...cx, bordx: e.target.value }); setCxQuote(null) }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Cancel batch no" value={cx.batch} onChange={(e) => { setCx({ ...cx, batch: e.target.value }); setCxQuote(null) }} sx={{ width: 140 }} />
            <Button variant="outlined" disabled={quoteCx.isPending} onClick={() => { setMessage(null); quoteCx.mutate() }}>Calculate refund</Button>
          </Box>
          {cxQuote && (
            <>
              <FieldGrid>
                <Field label="Premium on file" value={formatMoney(cxQuote.premium)} /><Field label="MCO fee on file" value={formatMoney(cxQuote.mcoFee)} />
                <Field label="Premium refund" value={formatMoney(cxQuote.refund.premiumReduction)} /><Field label="Premium remaining" value={formatMoney(cxQuote.refund.premiumEffective)} />
                <Field label="MCO refund" value={formatMoney(cxQuote.refund.mcoRefund)} /><Field label="MCO remaining" value={formatMoney(cxQuote.refund.mcoEffective)} />
              </FieldGrid>
              <Box><Button color="error" variant="contained" onClick={() => setCxConfirming(true)} disabled={cancelCx.isPending}>Cancel membership</Button></Box>
            </>
          )}
        </Paper>
      )}
      <ConfirmDialog open={cxConfirming} busy={cancelCx.isPending} title="Cancel membership" message={`Do you want to cancel ${member?.memberNumber} effective ${formatDate(cx.cancelDate)}? The covered persons are cancelled too and the refund is recorded.`} onConfirm={() => cancelCx.mutate()} onCancel={() => setCxConfirming(false)} />
      <ConfirmDialog open={confirming} busy={save.isPending} title="Save amendment" message={`Do you want to save the amendment for ${member?.memberNumber}? An amendment history entry will be recorded.`} onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}

