import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { registrationApi, type RegistrationQuote, type RegistrationRequest } from '../../api/registration'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Field, FieldGrid } from '../../components/DataTables'
import { formatDate, formatMoney } from '../../lib/format'

type Form = Record<'health' | 'payor' | 'bordx' | 'batch' | 'renewal' | 'prevMem' | 'prevPol' | 'takeover' | 'name' | 'salutation' | 'ic' | 'dob' | 'sex' | 'race' | 'nationality' | 'a1' | 'a2' | 'a3' | 'city' | 'state' | 'post'
  | 'email' | 'telH' | 'telM' | 'telO' | 'insurer' | 'plan' | 'policy' | 'eff' | 'exp' | 'group' | 'employee' | 'agent' | 'dept' | 'branch' | 'installment' | 'occupation' | 'work' | 'marital' | 'allergies' | 'exclusion' | 'remarks', string>

const empty: Form = Object.fromEntries(['health', 'payor', 'bordx', 'batch', 'prevMem', 'prevPol', 'name', 'salutation', 'ic', 'dob', 'sex', 'race', 'nationality', 'a1', 'a2', 'a3', 'city', 'state', 'post', 'email', 'telH', 'telM', 'telO', 'insurer', 'plan', 'policy', 'eff', 'exp', 'group', 'employee', 'agent', 'dept', 'branch', 'installment', 'occupation', 'work', 'marital', 'allergies', 'exclusion', 'remarks'].map((k) => [k, ''])
  .concat([['renewal', 'N'], ['takeover', 'N']])) as Form

const n = (s: string) => s.trim() || null

/** Legacy: Membership > Registration (frmMemberEntry + frmNewMBMReg05). Principal members only; supplementary persons, lifetime-limit and clinic plans are not supported yet. */
export function RegistrationPage() {
  const options = useQuery({ queryKey: ['registration-options'], queryFn: registrationApi.options })
  const [f, setF] = useState<Form>(empty)
  const [quote, setQuote] = useState<RegistrationQuote | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [lastBatch, setLastBatch] = useState<number | null>(null)
  const set = (k: keyof Form) => (e: { target: { value: string } }) => { setF((x) => ({ ...x, [k]: e.target.value })); setQuote(null) }

  const request = (): RegistrationRequest => ({
    healthCode: f.health, payorCode: f.payor, bordxDate: n(f.bordx), batchNo: f.batch ? Number(f.batch) : null, renewal: f.renewal, previousMemberNo: n(f.prevMem), previousPolicyNo: n(f.prevPol), takeover: f.takeover,
    name: f.name, salutation: n(f.salutation), icBcPp: f.ic, dateOfBirth: n(f.dob), sex: f.sex, race: n(f.race), nationality: n(f.nationality), address1: f.a1, address2: n(f.a2), address3: n(f.a3), city: n(f.city),
    state: f.state, postCode: f.post, email: n(f.email), telHome: n(f.telH), telMobile: n(f.telM), telOffice: n(f.telO), insurer: f.insurer, plan: f.plan, policyNo: f.policy, payorEffectiveDate: n(f.eff), payorExpiryDate: n(f.exp),
    groupCompany: n(f.group), employeeNo: n(f.employee), agentCode: n(f.agent), department: n(f.dept), branch: n(f.branch), installmentMode: n(f.installment), occupation: n(f.occupation), workNature: n(f.work),
    maritalStatus: n(f.marital), allergies: n(f.allergies), exclusion: n(f.exclusion), remarks: n(f.remarks),
  })
  const calc = useMutation({
    mutationFn: () => registrationApi.quote(request()),
    onSuccess: (q) => { setQuote(q); setMessage(q.duplicateMemberNo ? { severity: 'warning', text: `Warning: this IC / BC / passport already belongs to member ${q.duplicateMemberNo}.` } : null) },
    onError: (e) => { setQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const register = useMutation({
    mutationFn: () => registrationApi.register(request()),
    onSuccess: (r) => {
      setConfirming(false); setQuote(null)
      setMessage({ severity: r.crossReferenceSaved ? 'success' : 'warning', text: `Record saved, your membership number is: ${r.memberNumber}` + (r.crossReferenceSaved ? '' : ' (the maintenance cross reference could not be saved; please tell IT)') })
      setF((x) => ({ ...empty, health: x.health, payor: x.payor, bordx: x.bordx, batch: x.batch, insurer: x.insurer, plan: x.plan, eff: x.eff, exp: x.exp, renewal: x.renewal }))
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const payors = (options.data?.payors ?? []).filter((p) => !f.health || p.health === f.health)
  const refreshBatch = (payor: string, bordx: string) => { if (payor && bordx) void registrationApi.lastBatch(payor, bordx).then((r) => setLastBatch(r.lastBatch)).catch(() => setLastBatch(null)) }
  const text = (k: keyof Form, label: string, max?: number, extra: object = {}) => <TextField size="small" label={label} value={f[k]} onChange={set(k)} slotProps={{ htmlInput: { maxLength: max } }} {...extra} />

  return (
    <>
      <Typography variant="h5" gutterBottom>Membership Registration</Typography>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2 }}>
        <Typography variant="subtitle1">Batch</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField select size="small" label="Health plan" value={f.health} onChange={(e) => { setF((x) => ({ ...x, health: e.target.value, payor: '' })); setQuote(null) }} sx={{ width: 240 }}>
            {(options.data?.healthPlans ?? []).map((h) => <MenuItem key={h.code} value={h.code}>{h.code} - {h.description}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Payor" value={f.payor} onChange={(e) => { set('payor')(e); refreshBatch(e.target.value, f.bordx) }} sx={{ width: 300 }}>
            {payors.map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="Bordx date" value={f.bordx} onChange={(e) => { set('bordx')(e); refreshBatch(f.payor, e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="number" label="Batch no" value={f.batch} onChange={set('batch')} sx={{ width: 120 }} helperText={lastBatch === null ? ' ' : `Last batch: ${lastBatch}`} />
        </Box>
        <Typography variant="subtitle1">Principal details</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 1.5 }}>
          <TextField select size="small" label="Renewal" value={f.renewal} onChange={set('renewal')}>{['N', 'R', 'T', 'P'].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
          {f.renewal === 'R' && text('prevMem', 'Previous membership no', 30)}
          {f.renewal === 'R' && text('prevPol', 'Previous policy no', 50)}
          <TextField select size="small" label="Take over" value={f.takeover} onChange={set('takeover')}><MenuItem value="N">N - None</MenuItem><MenuItem value="Y">Y - Take Over</MenuItem><MenuItem value="C">C - Conversion</MenuItem></TextField>
          {text('salutation', 'Salutation', 5)}{text('name', 'Name', 60, { required: true })}{text('ic', 'IC / BC / Passport', 30, { required: true })}
          <TextField size="small" type="date" label="Date of birth" required value={f.dob} onChange={set('dob')} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField select size="small" label="Sex" required value={f.sex} onChange={set('sex')}><MenuItem value="M">M - Male</MenuItem><MenuItem value="F">F - Female</MenuItem></TextField>
          {text('race', 'Race code', 2)}{text('nationality', 'Nationality code', 2)}
          {text('a1', 'Address 1', 50, { required: true })}{text('a2', 'Address 2', 50)}{text('a3', 'Address 3', 50)}{text('city', 'City', 50)}{text('state', 'State', 50, { required: true })}{text('post', 'Post code', 6, { required: true })}
          {text('email', 'E-mail', 50)}{text('telH', 'Tel (home)', 12)}{text('telM', 'Tel (mobile)', 15)}{text('telO', 'Tel (office)', 15)}
        </Box>
        <Typography variant="subtitle1">Policy</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 1.5 }}>
          {text('insurer', 'Insured code', 1, { required: true })}{text('plan', 'Plan code', 4, { required: true })}{text('policy', 'Policy no', 25, { required: true })}
          <TextField size="small" type="date" label="Payor effective date" required value={f.eff} onChange={set('eff')} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="Payor expiry date" required value={f.exp} onChange={set('exp')} slotProps={{ inputLabel: { shrink: true } }} />
          {text('group', 'Group company', 300)}{text('employee', 'Employee no', 30)}{text('agent', 'Agent code', 30)}{text('dept', 'Department', 100)}{text('branch', 'Branch', 100)}
          <TextField select size="small" label="Installment mode" value={f.installment} onChange={set('installment')}><MenuItem value="">(none)</MenuItem><MenuItem value="A">A - Annually</MenuItem><MenuItem value="Q">Q - Quarterly</MenuItem><MenuItem value="S">S - Semi Annual</MenuItem><MenuItem value="M">M - Monthly</MenuItem></TextField>
          {text('occupation', 'Occupation code', 2)}{text('work', 'Work nature code', 3)}{text('marital', 'Marital status', 1)}{text('allergies', 'Allergies', 1000)}{text('exclusion', 'Exclusion', 8000)}{text('remarks', 'Remarks', 4000)}
        </Box>
        <Box><Button variant="outlined" disabled={calc.isPending} onClick={() => { setMessage(null); calc.mutate() }}>Calculate registration</Button></Box>
        {quote && (
          <>
            <FieldGrid>
              <Field label="Age / band" value={`${quote.ageText} / ${quote.ageCode} (${quote.adultChild === 'C' ? 'child' : 'adult'})`} /><Field label="Member type" value={quote.memberType} />
              <Field label="Cover period" value={`${formatDate(quote.payorEffectiveDate)} - ${formatDate(quote.payorExpiryDate)}`} /><Field label="Annual limit" value={formatMoney(quote.annualLimit)} />
              <Field label="Basic premium" value={formatMoney(quote.basicPremium)} /><Field label="Premium" value={formatMoney(quote.premium)} />
              <Field label="Basic MCO fee" value={formatMoney(quote.basicMco)} /><Field label="MCO fee" value={formatMoney(quote.mcoFee)} />
            </FieldGrid>
            <Box><Button variant="contained" onClick={() => setConfirming(true)} disabled={register.isPending}>Register member</Button></Box>
          </>
        )}
      </Paper>
      <ConfirmDialog open={confirming} busy={register.isPending} title="Register member" message={`Do you want to register ${f.name}? A new membership number is generated.`} onConfirm={() => register.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}
