import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { adjustmentApi, type AdjustmentMember, type CancellationQuote, type PlanChangeQuote, type PrincipalAmendment, type SupplementaryCancelQuote, type SupplementaryDeleteQuote, type SupplementaryQuote } from '../../api/adjustment'
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
  const [pc, setPc] = useState({ plan: '', effective: '', bordx: '', batch: '', updateMco: true, updateLimit: false })
  const [pcQuote, setPcQuote] = useState<PlanChangeQuote | null>(null)
  const [pcConfirming, setPcConfirming] = useState(false)
  const pcRequest = () => ({ memberNumber: member!.memberNumber, newPlan: pc.plan, effectiveDate: pc.effective || null, endorsementBordxDate: pc.bordx || null, batchNo: pc.batch ? Number(pc.batch) : null, updateMcoFee: pc.updateMco, updateAnnualLimit: pc.updateLimit })
  const quotePc = useMutation({
    mutationFn: () => adjustmentApi.quotePlanChange(pcRequest()),
    onSuccess: (q) => { setPcQuote(q); setMessage(null) },
    onError: (e) => { setPcQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const changePc = useMutation({
    mutationFn: () => adjustmentApi.changePlan(pcRequest()),
    onSuccess: (r) => {
      setPcConfirming(false); setPcQuote(null)
      setMessage(r.crossReferenceUpdated ? { severity: 'success', text: 'Plan changed. Refund recorded.' } : { severity: 'error', text: 'Plan changed, but the maintenance copies could not be updated. Please tell IT to re-run the sync.' })
      load.mutate()
    },
    onError: (e) => { setPcConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const pcSet = (k: 'plan' | 'effective' | 'bordx' | 'batch') => (e: { target: { value: string } }) => { setPc((x) => ({ ...x, [k]: e.target.value })); setPcQuote(null) }
  const [se, setSe] = useState({ type: 'X', effective: '', bordx: '', batch: '' })
  const [seConfirming, setSeConfirming] = useState(false)
  const seLabel = se.type === 'X' ? 'suspend' : 'delete the policy of'
  const statusEndorse = useMutation({
    mutationFn: () => adjustmentApi.statusEndorsement({ memberNumber: member!.memberNumber, type: se.type, effectiveDate: se.effective || null, endorsementBordxDate: se.bordx || null, batchNo: se.batch ? Number(se.batch) : null }),
    onSuccess: (r) => {
      setSeConfirming(false)
      setMessage(r.crossReferenceUpdated ? { severity: 'success', text: r.type === 'X' ? 'Membership suspended.' : 'Policy deleted.' } : { severity: 'error', text: 'Saved, but the maintenance cross reference could not be updated. Please tell IT to re-run the sync.' })
      load.mutate()
    },
    onError: (e) => { setSeConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const emptySupp = { name: '', salutation: '', ic: '', dob: '', sex: '', rel: '', allergies: '', exclusion: '', plan: '', effective: '', bordx: '', batch: '', renew: '', policy: '' }
  const [sp, setSp] = useState(emptySupp)
  const [spQuote, setSpQuote] = useState<SupplementaryQuote | null>(null)
  const [spConfirming, setSpConfirming] = useState(false)
  const spRequest = () => ({
    memberNumber: member!.memberNumber, name: sp.name, salutation: sp.salutation || null, icBcPp: sp.ic, dateOfBirth: sp.dob || null, sex: sp.sex, relationship: sp.rel, allergies: sp.allergies || null,
    exclusion: sp.exclusion || null, supplementaryPlan: sp.plan || null, effectiveDate: sp.effective || null, endorsementBordxDate: sp.bordx || null, batchNo: sp.batch ? Number(sp.batch) : null,
    renewalDiscount: sp.renew ? Number(sp.renew) : null, policyDiscount: sp.policy ? Number(sp.policy) : null,
  })
  const quoteSp = useMutation({
    mutationFn: () => adjustmentApi.quoteSupplementary(spRequest()),
    onSuccess: (q) => { setSpQuote(q); setMessage(null) },
    onError: (e) => { setSpQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const addSp = useMutation({
    mutationFn: () => adjustmentApi.addSupplementary(spRequest()),
    onSuccess: (r) => { setSpConfirming(false); setSpQuote(null); setSp(emptySupp); setMessage({ severity: 'success', text: `Supplementary person added as cover ${r.quote.coverId}.` }); load.mutate() },
    onError: (e) => { setSpConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const spSet = (k: keyof typeof emptySupp) => (e: { target: { value: string } }) => { setSp((x) => ({ ...x, [k]: e.target.value })); setSpQuote(null) }
  const [sc, setSc] = useState({ cover: '', effective: '', bordx: '', batch: '' })
  const [scQuote, setScQuote] = useState<SupplementaryCancelQuote | null>(null)
  const [scConfirming, setScConfirming] = useState(false)
  const scRequest = () => ({ memberNumber: member!.memberNumber, coverId: sc.cover, effectiveDate: sc.effective || null, endorsementBordxDate: sc.bordx || null, batchNo: sc.batch ? Number(sc.batch) : null })
  const quoteSc = useMutation({
    mutationFn: () => adjustmentApi.quoteSupplementaryCancel(scRequest()),
    onSuccess: (q) => { setScQuote(q); setMessage(null) },
    onError: (e) => { setScQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const cancelSc = useMutation({
    mutationFn: () => adjustmentApi.cancelSupplementary(scRequest()),
    onSuccess: (r) => { setScConfirming(false); setScQuote(null); setMessage({ severity: 'success', text: `Cover ${r.quote.coverId} cancelled.` }); load.mutate() },
    onError: (e) => { setScConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const scSet = (k: 'cover' | 'effective' | 'bordx' | 'batch') => (e: { target: { value: string } }) => { setSc((x) => ({ ...x, [k]: e.target.value })); setScQuote(null) }
  const [sd, setSd] = useState({ cover: '', effective: '', bordx: '', batch: '' })
  const [sdQuote, setSdQuote] = useState<SupplementaryDeleteQuote | null>(null)
  const [sdConfirming, setSdConfirming] = useState(false)
  const sdRequest = () => ({ memberNumber: member!.memberNumber, coverId: sd.cover, effectiveDate: sd.effective || null, endorsementBordxDate: sd.bordx || null, batchNo: sd.batch ? Number(sd.batch) : null })
  const quoteSd = useMutation({
    mutationFn: () => adjustmentApi.quoteSupplementaryDelete(sdRequest()),
    onSuccess: (q) => { setSdQuote(q); setMessage(null) },
    onError: (e) => { setSdQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const deleteSd = useMutation({
    mutationFn: () => adjustmentApi.deleteSupplementary(sdRequest()),
    onSuccess: (r) => { setSdConfirming(false); setSdQuote(null); setMessage({ severity: 'success', text: `Cover ${r.quote.coverId} deleted (${r.rowsDeleted} rows).` }); load.mutate() },
    onError: (e) => { setSdConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const sdSet = (k: 'cover' | 'effective' | 'bordx' | 'batch') => (e: { target: { value: string } }) => { setSd((x) => ({ ...x, [k]: e.target.value })); setSdQuote(null) }
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
      {member && form && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Change plan</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" label="New plan code" value={pc.plan} onChange={pcSet('plan')} slotProps={{ htmlInput: { maxLength: 8 } }} sx={{ width: 160 }} />
            <TextField size="small" type="date" label="Plan change effective date" value={pc.effective} onChange={pcSet('effective')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="Plan change bordx date" value={pc.bordx} onChange={pcSet('bordx')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Plan change batch no" value={pc.batch} onChange={pcSet('batch')} sx={{ width: 160 }} />
            <Button variant="outlined" disabled={quotePc.isPending} onClick={() => { setMessage(null); quotePc.mutate() }}>Calculate plan change</Button>
          </Box>
          {pcQuote && (
            <>
              <FieldGrid>
                <Field label="Old plan" value={pcQuote.oldPlan} /><Field label="New plan" value={pcQuote.newPlan} /><Field label="Age / band" value={`${pcQuote.ageText} / ${pcQuote.ageCode}`} />
                <Field label="New premium" value={formatMoney(pcQuote.premium)} /><Field label="Premium on file" value={formatMoney(pcQuote.currentPremium)} />
                <Field label="New MCO fee" value={formatMoney(pcQuote.mcoFee)} /><Field label="MCO fee on file" value={formatMoney(pcQuote.currentMcoFee)} />
                <Field label="Premium refund" value={formatMoney(pcQuote.refund.premiumReduction)} /><Field label="MCO refund" value={formatMoney(pcQuote.refund.mcoRefund)} />
                <Field label="Annual limit (now / new)" value={`${formatMoney(pcQuote.currentAnnualLimit)} / ${formatMoney(pcQuote.newAnnualLimit)}`} />
              </FieldGrid>
              {pcQuote.mcoFeeDiffers && <FormControlLabel control={<Checkbox checked={pc.updateMco} onChange={(e) => { setPc((x) => ({ ...x, updateMco: e.target.checked })); setPcQuote(null) }} />} label="Change the member's MCO fee to the new plan's fee" />}
              {pcQuote.annualLimitDiffers && pcQuote.newAnnualLimit !== null && <FormControlLabel control={<Checkbox checked={pc.updateLimit} onChange={(e) => setPc((x) => ({ ...x, updateLimit: e.target.checked }))} />} label="Change the annual limit" />}
              <Box><Button variant="contained" onClick={() => setPcConfirming(true)} disabled={changePc.isPending}>Change plan</Button></Box>
            </>
          )}
        </Paper>
      )}
      {member && form && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Suspend membership / delete policy</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField select size="small" label="Endorsement type" value={se.type} onChange={(e) => setSe({ ...se, type: e.target.value })} sx={{ width: 220 }}>
              <MenuItem value="X">X - Suspend Membership</MenuItem><MenuItem value="D">D - Delete Policy</MenuItem>
            </TextField>
            <TextField size="small" type="date" label="Status effective date" value={se.effective} onChange={(e) => setSe({ ...se, effective: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="Status bordx date" value={se.bordx} onChange={(e) => setSe({ ...se, bordx: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Status batch no" value={se.batch} onChange={(e) => setSe({ ...se, batch: e.target.value })} sx={{ width: 140 }} />
            <Button color="error" variant="contained" disabled={statusEndorse.isPending} onClick={() => { setMessage(null); setSeConfirming(true) }}>Apply</Button>
          </Box>
        </Paper>
      )}
      {member && form && (member.insurer?.trim() === 'F' || member.insurer?.trim() === 'H') && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Add supplementary person</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5 }}>
            <TextField size="small" label="Covered name" value={sp.name} onChange={spSet('name')} slotProps={{ htmlInput: { maxLength: 60 } }} />
            <TextField size="small" label="Covered salutation" value={sp.salutation} onChange={spSet('salutation')} slotProps={{ htmlInput: { maxLength: 5 } }} />
            <TextField size="small" label="Covered IC / passport" value={sp.ic} onChange={spSet('ic')} slotProps={{ htmlInput: { maxLength: 30 } }} />
            <TextField size="small" type="date" label="Covered date of birth" value={sp.dob} onChange={spSet('dob')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select size="small" label="Covered sex" value={sp.sex} onChange={spSet('sex')}><MenuItem value="M">M - Male</MenuItem><MenuItem value="F">F - Female</MenuItem></TextField>
            <TextField size="small" label="Relationship code" value={sp.rel} onChange={spSet('rel')} slotProps={{ htmlInput: { maxLength: 1 } }} />
            <TextField size="small" label="Covered allergies" value={sp.allergies} onChange={spSet('allergies')} slotProps={{ htmlInput: { maxLength: 500 } }} />
            <TextField size="small" label="Covered exclusion" value={sp.exclusion} onChange={spSet('exclusion')} slotProps={{ htmlInput: { maxLength: 4000 } }} />
            <TextField size="small" label="Supplementary plan (if different)" value={sp.plan} onChange={spSet('plan')} slotProps={{ htmlInput: { maxLength: 4 } }} />
            <TextField size="small" type="number" label="Renewal discount %" value={sp.renew} onChange={spSet('renew')} />
            <TextField size="small" type="number" label="Policy discount %" value={sp.policy} onChange={spSet('policy')} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" type="date" label="Supplementary effective date" value={sp.effective} onChange={spSet('effective')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="Supplementary bordx date" value={sp.bordx} onChange={spSet('bordx')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Supplementary batch no" value={sp.batch} onChange={spSet('batch')} sx={{ width: 170 }} />
            <Button variant="outlined" disabled={quoteSp.isPending} onClick={() => { setMessage(null); quoteSp.mutate() }}>Calculate supplementary</Button>
          </Box>
          {spQuote && (
            <>
              <FieldGrid>
                <Field label="Cover id" value={spQuote.coverId} /><Field label="Age / band" value={`${spQuote.ageText} / ${spQuote.ageCode}`} /><Field label="Plan" value={spQuote.plan} />
                <Field label="Cover period" value={`${formatDate(spQuote.effectiveDate)} - ${formatDate(spQuote.expiryDate)}`} /><Field label="Annual limit" value={formatMoney(spQuote.annualLimit)} />
                <Field label="Premium" value={formatMoney(spQuote.premium)} /><Field label="MCO fee" value={formatMoney(spQuote.mco)} />
              </FieldGrid>
              <Box><Button variant="contained" onClick={() => setSpConfirming(true)} disabled={addSp.isPending}>Add supplementary person</Button></Box>
            </>
          )}
        </Paper>
      )}
      {member && form && (member.insurer?.trim() === 'F' || member.insurer?.trim() === 'H') && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Cancel supplementary person</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" label="Cover id to cancel" value={sc.cover} onChange={scSet('cover')} slotProps={{ htmlInput: { maxLength: 2 } }} sx={{ width: 150 }} />
            <TextField size="small" type="date" label="Supplementary cancel date" value={sc.effective} onChange={scSet('effective')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="Supplementary cancel bordx date" value={sc.bordx} onChange={scSet('bordx')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Supplementary cancel batch no" value={sc.batch} onChange={scSet('batch')} sx={{ width: 200 }} />
            <Button variant="outlined" disabled={quoteSc.isPending} onClick={() => { setMessage(null); quoteSc.mutate() }}>Calculate supplementary cancel</Button>
          </Box>
          {scQuote && (
            <>
              <FieldGrid>
                <Field label="Covered person" value={scQuote.name} /><Field label="Cover period" value={`${formatDate(scQuote.effectiveDate)} - ${formatDate(scQuote.expiryDate)}`} />
                <Field label="Premium on file" value={formatMoney(scQuote.premium)} /><Field label="MCO fee on file" value={formatMoney(scQuote.mcoFee)} />
                <Field label="Refund written" value={scQuote.refundWritten ? 'Yes' : 'No (plan status ' + scQuote.suppMcoStatus + ')'} />
                <Field label="Premium refund" value={formatMoney(scQuote.refund.premiumReduction)} /><Field label="MCO refund" value={formatMoney(scQuote.refund.mcoRefund)} />
              </FieldGrid>
              <Box><Button color="error" variant="contained" onClick={() => setScConfirming(true)} disabled={cancelSc.isPending}>Cancel supplementary person</Button></Box>
            </>
          )}
        </Paper>
      )}
      {member && form && (member.insurer?.trim() === 'F' || member.insurer?.trim() === 'H') && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Delete supplementary person</Typography>
          <Alert severity="warning">Deleting removes the covered person completely. A cover with cases, refunds or lifetime limits cannot be deleted; cancel it instead.</Alert>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" label="Cover id to delete" value={sd.cover} onChange={sdSet('cover')} slotProps={{ htmlInput: { maxLength: 2 } }} sx={{ width: 150 }} />
            <TextField size="small" type="date" label="Supplementary delete date" value={sd.effective} onChange={sdSet('effective')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="Supplementary delete bordx date" value={sd.bordx} onChange={sdSet('bordx')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Supplementary delete batch no" value={sd.batch} onChange={sdSet('batch')} sx={{ width: 200 }} />
            <Button variant="outlined" disabled={quoteSd.isPending} onClick={() => { setMessage(null); quoteSd.mutate() }}>Check supplementary delete</Button>
          </Box>
          {sdQuote && (
            <>
              <FieldGrid>
                <Field label="Covered person" value={sdQuote.name} /><Field label="Cover status" value={sdQuote.status} /><Field label="Cases" value={sdQuote.cases} />
                <Field label="Refund rows" value={sdQuote.refundRows} /><Field label="Lifetime-limit rows" value={sdQuote.lifetimeRows} /><Field label="Clinic / benefit rows" value={`${sdQuote.clinicRows} / ${sdQuote.benefitLimitRows}`} />
              </FieldGrid>
              {sdQuote.blockedReason ? <Alert severity="error">Cannot delete: this cover {sdQuote.blockedReason}.</Alert>
                : <Box><Button color="error" variant="contained" onClick={() => setSdConfirming(true)} disabled={deleteSd.isPending}>Delete supplementary person</Button></Box>}
            </>
          )}
        </Paper>
      )}
      <ConfirmDialog open={sdConfirming} busy={deleteSd.isPending} title="Delete supplementary person" message={`Do you want to permanently delete cover ${sd.cover} of ${member?.memberNumber}? The record is kept in the audit log.`} onConfirm={() => deleteSd.mutate()} onCancel={() => setSdConfirming(false)} />
      <ConfirmDialog open={scConfirming} busy={cancelSc.isPending} title="Cancel supplementary person" message={`Do you want to cancel cover ${sc.cover} of ${member?.memberNumber} effective ${formatDate(sc.effective)}?`} onConfirm={() => cancelSc.mutate()} onCancel={() => setScConfirming(false)} />
      <ConfirmDialog open={spConfirming} busy={addSp.isPending} title="Add supplementary person" message={`Do you want to add ${sp.name} to ${member?.memberNumber}? The fees shown are recorded.`} onConfirm={() => addSp.mutate()} onCancel={() => setSpConfirming(false)} />
      <ConfirmDialog open={seConfirming} busy={statusEndorse.isPending} title="Confirm endorsement" message={`Do you want to ${seLabel} ${member?.memberNumber}? Covered persons follow the same status.`} onConfirm={() => statusEndorse.mutate()} onCancel={() => setSeConfirming(false)} />
      <ConfirmDialog open={pcConfirming} busy={changePc.isPending} title="Change plan" message={`Do you want to change ${member?.memberNumber} to plan ${pc.plan}? The new fees are recorded and a refund is calculated from ${formatDate(pc.effective)}.`} onConfirm={() => changePc.mutate()} onCancel={() => setPcConfirming(false)} />
      <ConfirmDialog open={cxConfirming} busy={cancelCx.isPending} title="Cancel membership" message={`Do you want to cancel ${member?.memberNumber} effective ${formatDate(cx.cancelDate)}? The covered persons are cancelled too and the refund is recorded.`} onConfirm={() => cancelCx.mutate()} onCancel={() => setCxConfirming(false)} />
      <ConfirmDialog open={confirming} busy={save.isPending} title="Save amendment" message={`Do you want to save the amendment for ${member?.memberNumber}? An amendment history entry will be recorded.`} onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}






