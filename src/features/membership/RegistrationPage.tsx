import { Alert, Box, Button, MenuItem, Paper, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { registrationApi, type RegistrationQuote, type RegistrationRequest, type RegistrationSupplementary } from '../../api/registration'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { formatDate, formatMoney } from '../../lib/format'
import { toDmy } from '../../lib/dates'

type Form = Record<'renewal' | 'prevMem' | 'prevPol' | 'takeover' | 'name' | 'salutation' | 'ic' | 'dob' | 'sex' | 'race' | 'nationality' | 'a1' | 'a2' | 'a3' | 'city' | 'state' | 'post'
  | 'email' | 'telH' | 'telM' | 'telO' | 'insurer' | 'plan' | 'policy' | 'eff' | 'exp' | 'group' | 'employee' | 'agent' | 'dept' | 'branch' | 'installment' | 'occupation' | 'work' | 'marital' | 'allergies' | 'exclusion' | 'remarks', string>
type Supp = Record<'name' | 'salutation' | 'ic' | 'dob' | 'sex' | 'rel' | 'allergies' | 'exclusion' | 'plan' | 'eff' | 'exp' | 'renew' | 'policy', string>

const blankForm = (): Form => ({ renewal: 'N', takeover: 'N', salutation: 'MR', prevMem: '', prevPol: '', name: '', ic: '', dob: '', sex: '', race: '', nationality: '', a1: '', a2: '', a3: '', city: '', state: '', post: '', email: '', telH: '', telM: '', telO: '',
  insurer: '', plan: '', policy: '', eff: '', exp: '', group: '', employee: '', agent: '', dept: '', branch: '', installment: 'A', occupation: '', work: '', marital: '', allergies: '', exclusion: '', remarks: '' })
const blankSupp = (): Supp => ({ name: '', salutation: '', ic: '', dob: '', sex: '', rel: '', allergies: '', exclusion: '', plan: '', eff: '', exp: '', renew: '', policy: '' })
const n = (s: string) => s.trim() || null

/** Legacy: Membership > Registration. Step 1 is the Membership Header dialog (frmMemberEntry); "Next" opens the registration screen (frmNewMBMReg05) with the header fixed. */
export function RegistrationPage() {
  const options = useQuery({ queryKey: ['registration-options'], queryFn: registrationApi.options })
  const [header, setHeader] = useState({ health: '', payor: '', bordx: '', batch: '1' })
  const [lastBatch, setLastBatch] = useState(0)
  const [started, setStarted] = useState(false)
  const [f, setF] = useState<Form>(blankForm)
  const [supp, setSupp] = useState<Supp[]>([])
  const [sf, setSf] = useState<Supp>(blankSupp)
  const [tab, setTab] = useState(0)
  const [quote, setQuote] = useState<RegistrationQuote | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)

  const healthPlans = options.data?.healthPlans ?? []
  const health = header.health || healthPlans.find((h) => h.code === 'S')?.code || healthPlans[0]?.code || ''
  const payors = (options.data?.payors ?? []).filter((p) => p.health === health)
  const payorName = options.data?.payors.find((p) => p.code === header.payor)?.name ?? ''
  const refreshBatch = (payor: string, bordx: string) => { if (payor && bordx) void registrationApi.lastBatch(payor, bordx).then((r) => setLastBatch(r.lastBatch)).catch(() => setLastBatch(0)); else setLastBatch(0) }

  const next = () => {
    if (!health) return setMessage({ severity: 'error', text: 'Please enter Health Code' })
    if (!header.payor) return setMessage({ severity: 'error', text: 'Please enter Payor Code' })
    if (!header.bordx) return setMessage({ severity: 'error', text: 'Please enter a valid Bordx Date (dd/mm/yyyy)' })
    if (!header.batch) return setMessage({ severity: 'error', text: 'Please enter Batch No' })
    setHeader((h) => ({ ...h, health })); setMessage(null); setStarted(true)
  }

  const setField = (k: keyof Form) => (e: { target: { value: string } }) => { setF((x) => ({ ...x, [k]: e.target.value })); setQuote(null) }
  const setDate = (k: keyof Form) => (iso: string) => { setF((x) => ({ ...x, [k]: iso })); setQuote(null) }
  const insurerOk = f.insurer === 'F' || f.insurer === 'H'

  const request = (): RegistrationRequest => ({
    healthCode: header.health, payorCode: header.payor, bordxDate: n(header.bordx), batchNo: header.batch ? Number(header.batch) : null, renewal: f.renewal, previousMemberNo: n(f.prevMem), previousPolicyNo: n(f.prevPol), takeover: f.takeover,
    name: f.name, salutation: n(f.salutation), icBcPp: f.ic, dateOfBirth: n(f.dob), sex: f.sex, race: n(f.race), nationality: n(f.nationality), address1: f.a1, address2: n(f.a2), address3: n(f.a3), city: n(f.city),
    state: f.state, postCode: f.post, email: n(f.email), telHome: n(f.telH), telMobile: n(f.telM), telOffice: n(f.telO), insurer: f.insurer, plan: f.plan, policyNo: f.policy, payorEffectiveDate: n(f.eff), payorExpiryDate: n(f.exp),
    groupCompany: n(f.group), employeeNo: n(f.employee), agentCode: n(f.agent), department: n(f.dept), branch: n(f.branch), installmentMode: n(f.installment), occupation: n(f.occupation), workNature: n(f.work),
    maritalStatus: n(f.marital), allergies: n(f.allergies), exclusion: n(f.exclusion), remarks: n(f.remarks),
    supplementary: supp.map((s): RegistrationSupplementary => ({ name: s.name, salutation: n(s.salutation), icBcPp: s.ic, dateOfBirth: n(s.dob), sex: s.sex, relationship: s.rel, allergies: n(s.allergies), exclusion: n(s.exclusion),
      supplementaryPlan: n(s.plan), effectiveDate: n(s.eff), expiryDate: n(s.exp), renewalDiscount: s.renew ? Number(s.renew) : null, policyDiscount: s.policy ? Number(s.policy) : null })),
  })

  const calc = useMutation({
    mutationFn: () => registrationApi.quote(request()),
    onSuccess: (q) => { setQuote(q); setConfirming(true); if (q.duplicateMemberNo) setMessage({ severity: 'warning', text: `Warning: this IC / BC / passport already belongs to member ${q.duplicateMemberNo}.` }); else setMessage(null) },
    onError: (e) => { setQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const register = useMutation({
    mutationFn: () => registrationApi.register(request()),
    onSuccess: (r) => {
      setConfirming(false); setQuote(null); setSupp([]); setSf(blankSupp()); setTab(0)
      setMessage({ severity: r.crossReferenceSaved ? 'success' : 'warning', text: `Record saved, your membership number is: ${r.memberNumber}` + (r.crossReferenceSaved ? '' : ' (the maintenance cross reference could not be saved; please tell IT)') })
      setF((x) => ({ ...blankForm(), insurer: x.insurer, plan: x.plan, eff: x.eff, exp: x.exp, renewal: x.renewal }))
      refreshBatch(header.payor, header.bordx)
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })

  const text = (k: keyof Form, label: string, max?: number, extra: object = {}) => <TextField size="small" label={label} value={f[k]} onChange={setField(k)} slotProps={{ htmlInput: { maxLength: max } }} {...extra} />
  const stext = (k: keyof Supp, label: string, max?: number) => <TextField size="small" label={label} value={sf[k]} onChange={(e) => setSf((x) => ({ ...x, [k]: e.target.value }))} slotProps={{ htmlInput: { maxLength: max } }} />
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5 } as const

  if (!started) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', mt: 4 }}>
        <Paper variant="outlined" sx={{ p: 0 }}>
          <Typography variant="subtitle1" sx={{ bgcolor: 'grey.800', color: 'common.white', textAlign: 'center', py: 0.5, fontWeight: 700 }}>Membership Header</Typography>
          <Box sx={{ p: 2, display: 'grid', gap: 1.5 }}>
            {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
            <TextField select size="small" label="Health Type" value={health} onChange={(e) => { setHeader((h) => ({ ...h, health: e.target.value, payor: '' })); setLastBatch(0) }}>
              {healthPlans.map((h) => <MenuItem key={h.code} value={h.code}>{h.code} - {h.description}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Payor" value={header.payor} onChange={(e) => { setHeader((h) => ({ ...h, payor: e.target.value })); refreshBatch(e.target.value, header.bordx) }}>
              {payors.map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <DateField label="Bordx. Date (dd/mm/yyyy)" value={header.bordx} onChange={(iso) => { setHeader((h) => ({ ...h, bordx: iso })); refreshBatch(header.payor, iso) }} />
              <TextField size="small" label="Last Batch No" value={lastBatch} disabled sx={{ width: 140 }} />
            </Box>
            <TextField size="small" type="number" label="Batch No" value={header.batch} onChange={(e) => setHeader((h) => ({ ...h, batch: e.target.value }))} sx={{ width: 160 }} />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={next}>Next</Button>
              <Button variant="outlined" onClick={() => { setHeader({ health: '', payor: '', bordx: '', batch: '1' }); setLastBatch(0); setMessage(null) }}>Cancel</Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    )
  }

  const charged = (quote?.supplementary ?? [])
  return (
    <>
      <Typography variant="h5" gutterBottom>Member Registration</Typography>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, ...grid }}>
        <TextField select size="small" label="Renewal (Y/N)" value={f.renewal} onChange={setField('renewal')}>{['N', 'R', 'T', 'P'].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
        {f.renewal === 'R' && text('prevMem', 'Prev Mem No', 30)}
        {f.renewal === 'R' && text('prevPol', 'Prev. Pol. Num', 50)}
      </Paper>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, ...grid }}>
        <TextField select size="small" label="Salutation" value={f.salutation} onChange={setField('salutation')}>{['MR', 'MRS', 'MS', 'MISS', 'DR', 'DATO', 'DATIN', 'TAN SRI', 'PUAN'].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
        {text('name', 'Mem Name', 60, { required: true })}{text('ic', 'IC Num', 30, { required: true })}
        <TextField size="small" label="Payor" value={`${header.payor} - ${payorName}`} disabled />{text('policy', 'Policy Num', 25, { required: true })}<TextField size="small" label="Health Type" value={header.health} disabled />
      </Paper>
      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}><Tab label="Principal Details" /><Tab label={`Supplementary (${supp.length})`} /></Tabs>
        <Box sx={{ p: 2 }} hidden={tab !== 0}>
          <Box sx={grid}>
            {text('a1', 'Address', 50, { required: true })}{text('a2', 'Address 2', 50)}{text('a3', 'Address 3', 50)}{text('post', 'PostCode', 6, { required: true })}{text('city', 'City/Town', 50)}{text('state', 'State', 50, { required: true })}
            <TextField select size="small" label="Sex (M/F)" required value={f.sex} onChange={setField('sex')}><MenuItem value="M">M - Male</MenuItem><MenuItem value="F">F - Female</MenuItem></TextField>
            <DateField label="Birthdate" required value={f.dob} onChange={setDate('dob')} />
            {text('race', 'Race', 2)}{text('nationality', 'Nationality', 2)}{text('branch', 'Branch', 100)}{text('agent', 'Agent', 30)}
            <TextField select size="small" label="Take Over" value={f.takeover} onChange={setField('takeover')}><MenuItem value="N">N - None</MenuItem><MenuItem value="Y">Y - Take Over</MenuItem><MenuItem value="C">C - Conversion</MenuItem></TextField>
            {text('marital', 'Marital Status', 1)}{text('occupation', 'Occupation', 2)}{text('work', 'Work Nature', 3)}
            <TextField select size="small" label="Instl mode" value={f.installment} onChange={setField('installment')}><MenuItem value="A">A - Annual</MenuItem><MenuItem value="Q">Q - Quarterly</MenuItem><MenuItem value="S">S - Semi Annual</MenuItem><MenuItem value="M">M - Monthly</MenuItem></TextField>
            {text('insurer', 'Ins Type', 1, { required: true })}{text('plan', 'Plan Code', 4, { required: true })}
            <DateField label="Eff Date" required value={f.eff} onChange={setDate('eff')} /><DateField label="Exp Date" required value={f.exp} onChange={setDate('exp')} />
            <TextField size="small" label="Bordx. Date" value={toDmy(header.bordx)} disabled /><TextField size="small" label="Batch Num" value={header.batch} disabled />
            {text('employee', "E'yee Num", 30)}{text('dept', 'Dept. Name', 100)}{text('group', 'Grp Company', 300)}{text('email', 'E-mail', 50)}{text('telH', 'Tel (home)', 12)}{text('telM', 'Tel (mobile)', 15)}{text('telO', 'Tel (office)', 15)}
            {text('allergies', 'Allergies', 1000)}{text('exclusion', 'Principal Warranty / Exclusion', 8000)}{text('remarks', 'Remarks', 4000)}
          </Box>
        </Box>
        <Box sx={{ p: 2, display: 'grid', gap: 2 }} hidden={tab !== 1}>
          {!insurerOk && <Alert severity="info">Supplementary persons can be added when the Ins Type is F or H (enter it on the Principal Details tab).</Alert>}
          <Box sx={grid}>
            {stext('salutation', 'Covered salutation', 5)}{stext('name', 'Covered name', 60)}{stext('ic', 'Covered IC / passport', 30)}
            <DateField label="Covered birth date" value={sf.dob} onChange={(iso) => setSf((x) => ({ ...x, dob: iso }))} />
            <TextField select size="small" label="Covered sex" value={sf.sex} onChange={(e) => setSf((x) => ({ ...x, sex: e.target.value }))}><MenuItem value="M">M - Male</MenuItem><MenuItem value="F">F - Female</MenuItem></TextField>
            {stext('rel', 'Relationship code', 1)}{stext('allergies', 'Covered allergies', 500)}{stext('exclusion', 'Covered exclusion', 4000)}{stext('plan', 'Supplementary plan (if different)', 4)}
            <DateField label="Supplementary effective date" value={sf.eff} onChange={(iso) => setSf((x) => ({ ...x, eff: iso }))} /><DateField label="Supplementary expiry date" value={sf.exp} onChange={(iso) => setSf((x) => ({ ...x, exp: iso }))} />
            {stext('renew', 'Renewal discount %')}{stext('policy', 'Policy discount %')}
          </Box>
          <Box><Button variant="outlined" disabled={!insurerOk} onClick={() => {
            if (!sf.name.trim() || !sf.ic.trim() || !sf.rel.trim() || !sf.dob || !sf.sex) return setMessage({ severity: 'error', text: 'Please enter the covered name, identification, relationship, birth date and sex.' })
            setSupp((l) => [...l, sf]); setSf(blankSupp()); setQuote(null); setMessage(null)
          }}>Add</Button></Box>
          <Table size="small">
            <TableHead><TableRow><TableCell>Cover</TableCell><TableCell>Name</TableCell><TableCell>IC</TableCell><TableCell>Birth date</TableCell><TableCell>Sex</TableCell><TableCell>Rel</TableCell><TableCell>Plan</TableCell><TableCell>Band</TableCell><TableCell align="right">Limit</TableCell><TableCell align="right">Premium</TableCell><TableCell align="right">MCO</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {supp.map((s, i) => { const c = charged[i]; return (
                <TableRow key={`${s.ic}-${i}`}>
                  <TableCell>{String(i + 1).padStart(2, '0')}</TableCell><TableCell>{s.name}</TableCell><TableCell>{s.ic}</TableCell><TableCell>{toDmy(s.dob)}</TableCell><TableCell>{s.sex}</TableCell><TableCell>{s.rel}</TableCell><TableCell>{s.plan || f.plan}</TableCell>
                  <TableCell>{c ? `${c.ageCode} (${c.adultChild})` : ''}</TableCell><TableCell align="right">{c ? formatMoney(c.annualLimit) : ''}</TableCell><TableCell align="right">{c ? formatMoney(c.premium) : ''}</TableCell><TableCell align="right">{c ? formatMoney(c.mco) : ''}</TableCell>
                  <TableCell><Button size="small" color="error" onClick={() => { setSupp((l) => l.filter((_, j) => j !== i)); setQuote(null) }}>Remove</Button></TableCell>
                </TableRow>) })}
              {supp.length === 0 && <TableRow><TableCell colSpan={12}>No supplementary persons added.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ m: 2, mt: 0, p: 1, display: 'flex', gap: 3, flexWrap: 'wrap', bgcolor: 'grey.100', border: 1, borderColor: 'divider' }}>
          <span>Premium <strong>{quote ? formatMoney(quote.premium) : ''}</strong></span><span>MCO Fees <strong>{quote ? formatMoney(quote.mcoFee) : ''}</strong></span>
          <span>Ann Limit <strong>{quote ? formatMoney(quote.annualLimit) : ''}</strong></span><span>Age Band <strong>{quote ? `${quote.ageCode} (${quote.ageText})` : ''}</strong></span>
          {quote && <span>Cover period <strong>{formatDate(quote.payorEffectiveDate)} - {formatDate(quote.payorExpiryDate)}</strong></span>}
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1.5 }}>
        <Button variant="outlined" onClick={() => { setF(blankForm()); setSupp([]); setSf(blankSupp()); setQuote(null); setMessage(null) }}>Clear</Button>
        <Button variant="contained" disabled={calc.isPending} onClick={() => { setMessage(null); calc.mutate() }}>Save</Button>
        <Button variant="outlined" onClick={() => { setStarted(false); setQuote(null); setMessage(null) }}>Exit</Button>
      </Box>
      <ConfirmDialog open={confirming} busy={register.isPending} title="Save registration"
        message={`Are you sure? ${f.name} will be registered${supp.length ? ` with ${supp.length} supplementary person(s)` : ''}. Premium ${quote ? formatMoney(quote.premium) : ''}, MCO fees ${quote ? formatMoney(quote.mcoFee) : ''}. A new membership number is generated.`}
        onConfirm={() => register.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}
