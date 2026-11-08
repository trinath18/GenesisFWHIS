import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { registrationApi, type RegistrationQuote, type RegistrationRequest, type RegistrationSupplementary } from '../../api/registration'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyRow as L, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox } from '../../components/legacyStyles'
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
  const [othersOpen, setOthersOpen] = useState(false)

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

  const box = legacyBox
  const T = (k: keyof Form, max?: number, extra: object = {}) => <TextField size="small" fullWidth sx={box} value={f[k]} onChange={setField(k)} slotProps={{ htmlInput: { maxLength: max } }} {...extra} />
  const Sel = (k: keyof Form, items: [string, string][], w: number | string = '100%') => (
    <TextField select size="small" sx={{ ...box, width: w }} value={f[k]} onChange={setField(k)}>{items.map(([c, l]) => <MenuItem key={c} value={c}>{l}</MenuItem>)}</TextField>
  )
  /** Pick from the list or type a value, like the legacy editable combo boxes (City/Town, State). */
  const Pick = (k: keyof Form, list: string[], max: number, required = false) => (
    <Autocomplete freeSolo size="small" options={list} inputValue={f[k]} onInputChange={(_, v) => setField(k)({ target: { value: v.toUpperCase().slice(0, max) } })} sx={{ width: '100%', minWidth: 0 }}
      renderInput={(p) => <TextField {...p} sx={box} required={required} placeholder="Pick or type" />} />
  )
  const codes = (list: { code: string; name: string | null }[] | undefined): [string, string][] => [['', ' '], ...(list ?? []).map((o): [string, string] => [o.code, `${o.code} - ${o.name ?? ''}`])]
  const D = (k: keyof Form) => <DateField sx={{ ...box, width: 140 }} value={f[k]} onChange={setDate(k)} />
  const ro = (v: string | number | null | undefined, w: number | string = '100%') => <TextField size="small" sx={{ ...box, width: w }} value={v ?? ''} slotProps={{ input: { readOnly: true } }} />
  const t = (label: string, w = 85) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0, ml: 1 }}>{label}</Typography>
  const ssel = (k: keyof Supp, label: string, items: [string, string][]) => (
    <TextField select size="small" label={label} value={sf[k]} onChange={(e) => setSf((x) => ({ ...x, [k]: e.target.value }))}>{items.map(([c, l]) => <MenuItem key={c} value={c}>{l}</MenuItem>)}</TextField>
  )
  const stext = (k: keyof Supp, label: string, max?: number) => <TextField size="small" label={label} value={sf[k]} onChange={(e) => setSf((x) => ({ ...x, [k]: e.target.value }))} slotProps={{ htmlInput: { maxLength: max } }} />
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5 } as const

  if (!started) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', mt: 4 }}>
        <Paper variant="outlined" sx={{ p: 0 }}>
          <Typography variant="subtitle1" sx={{ bgcolor: 'legacy.titleBar', color: 'legacy.titleBarText', textAlign: 'center', py: 0.5, fontWeight: 700, borderRadius: 1 }}>Membership Header</Typography>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Member Registration</LegacyTitle>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13 }}>Renewal (Y/N)</Typography>{Sel('renewal', [['N', 'N'], ['R', 'R'], ['T', 'T'], ['P', 'P']], 80)}
        <Typography sx={{ fontSize: 13, ml: 1 }}>Prev Mem No</Typography><Box sx={{ width: 190 }}>{T('prevMem', 30, { disabled: f.renewal !== 'R' })}</Box>
        <Typography sx={{ fontSize: 13, ml: 1 }}>Prev. Pol. Num</Typography><Box sx={{ width: 220 }}>{T('prevPol', 50, { disabled: f.renewal !== 'R' })}</Box>
      </Paper>
      <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.5 }}>
        <L label="Salutation" w={75}>{Sel('salutation', ['MR', 'MRS', 'MS', 'MISS', 'DR', 'DATO', 'DATIN', 'TAN SRI', 'PUAN'].map((v) => [v, v]), 110)}{t('Mem Name', 75)}{T('name', 60, { required: true })}{t('IC Num', 60)}<Box sx={{ width: 220, flexShrink: 0 }}>{T('ic', 30, { required: true })}</Box></L>
        <L label="Payor" w={75}>{ro(`${header.payor} - ${payorName}`, 260)}{t('Policy Num', 75)}{T('policy', 25, { required: true })}{t('Health Type', 75)}{ro(header.health, 80)}</L>
      </Paper>
      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 34, '& .MuiTab-root': { minHeight: 34, textTransform: 'none' } }}>
          <Tab label="Principal Details" /><Tab label={`Supplementary (${supp.length})`} />
        </Tabs>
        <Box sx={{ p: 1 }} hidden={tab !== 0}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' } }}>
            <Box>
              <L label="Address" w={85}>{T('a1', 50, { required: true })}</L>
              <L label="" w={85}>{T('a2', 50)}</L>
              <L label="" w={85}>{T('a3', 50)}</L>
              <L label="PostCode" w={85}><Box sx={{ width: 110, flexShrink: 0 }}>{T('post', 6, { required: true })}</Box>{t('City/Town')}{Pick('city', options.data?.cities ?? [], 50)}</L>
              <L label="State" w={85}>{Pick('state', options.data?.states ?? [], 50, true)}</L>
              <L label="Sex (M/F)" w={85}>{Sel('sex', [['M', 'M - Male'], ['F', 'F - Female']], 110)}{t('Take Over')}{Sel('takeover', [['N', 'N - None'], ['Y', 'Y - Take Over'], ['C', 'C - Conversion']])}</L>
              <L label="Birthdate" w={85}>{D('dob')}{t('Marital Status')}{Sel('marital', [['', ' '], ['S', 'S - Single'], ['M', 'M - Married']])}</L>
              <L label="Race" w={85}>{Sel('race', codes(options.data?.races), 130)}{t('Nationality')}{Sel('nationality', codes(options.data?.nationalities))}</L>
              <L label="Branch" w={85}>{T('branch', 100)}</L>
              <L label="Agent" w={85}>{T('agent', 30)}</L>
              <L label="Age Band" w={85}>{ro(quote ? `${quote.ageCode} (${quote.ageText})` : '', 110)}{t('Instl mode')}{Sel('installment', [['A', 'A - Annual'], ['Q', 'Q - Quarterly'], ['S', 'S - Semi Annual'], ['M', 'M - Monthly']])}</L>
            </Box>
            <Box>
              <L label="Ins Type" w={85}><Box sx={{ width: 110, flexShrink: 0 }}>{T('insurer', 1, { required: true })}</Box>{t('Plan Code', 75)}{T('plan', 4, { required: true })}</L>
              <L label="Eff Date" w={85}>{D('eff')}{t('Exp Date', 75)}{D('exp')}</L>
              <L label="Bordx. Date" w={85}>{ro(toDmy(header.bordx), 140)}{t('Batch Num', 75)}{ro(header.batch, 140)}</L>
              <L label="E'yee Num" w={85}>{T('employee', 30)}</L>
              <L label="Dept. Name" w={85}>{T('dept', 100)}</L>
              <L label="Grp Company" w={85}>{T('group', 300)}</L>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gap: 1, mt: 1, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
            <LegacyFrame title="Principal Warranty">{T('exclusion', 8000, { multiline: true, minRows: 3 })}</LegacyFrame>
            <LegacyFrame title="Remarks">{T('remarks', 4000, { multiline: true, minRows: 3 })}</LegacyFrame>
          </Box>
        </Box>
        <Box sx={{ p: 2, display: 'grid', gap: 2 }} hidden={tab !== 1}>
          {!insurerOk && <Alert severity="info">Supplementary persons can be added when the Ins Type is F or H (enter it on the Principal Details tab).</Alert>}
          <Box sx={grid}>
            {ssel('salutation', 'Covered salutation', ['', 'MR', 'MS', 'MDM', 'MRS'].map((v): [string, string] => [v, v || ' ']))}{stext('name', 'Covered name', 60)}{stext('ic', 'Covered IC / passport', 30)}
            <DateField label="Covered birth date" value={sf.dob} onChange={(iso) => setSf((x) => ({ ...x, dob: iso }))} />
            <TextField select size="small" label="Covered sex" value={sf.sex} onChange={(e) => setSf((x) => ({ ...x, sex: e.target.value }))}><MenuItem value="M">M - Male</MenuItem><MenuItem value="F">F - Female</MenuItem></TextField>
            {ssel('rel', 'Relationship', codes(options.data?.relationships))}{stext('allergies', 'Covered allergies', 500)}{stext('exclusion', 'Covered exclusion', 4000)}{stext('plan', 'Supplementary plan (if different)', 4)}
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
        <Box sx={{ m: 1, mt: 0, p: 1, display: 'flex', gap: 3, flexWrap: 'wrap', border: 1, borderColor: 'divider', fontSize: 13 }}>
          <span>Premium <strong>{quote ? formatMoney(quote.premium) : ''}</strong></span><span>MCO Fees <strong>{quote ? formatMoney(quote.mcoFee) : ''}</strong></span>
          <span>Ann Limit <strong>{quote ? formatMoney(quote.annualLimit) : ''}</strong></span>
          {quote && <span>Cover period <strong>{formatDate(quote.payorEffectiveDate)} - {formatDate(quote.payorExpiryDate)}</strong></span>}
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" variant="outlined" onClick={() => setOthersOpen(true)}>Others Details</Button>
        <Button size="small" variant="outlined" onClick={() => { setF(blankForm()); setSupp([]); setSf(blankSupp()); setQuote(null); setMessage(null) }}>Clear</Button>
        <Button size="small" variant="contained" disabled={calc.isPending} onClick={() => { setMessage(null); calc.mutate() }}>Save</Button>
        <Button size="small" variant="outlined" onClick={() => { setStarted(false); setQuote(null); setMessage(null) }}>Exit</Button>
      </Paper>
      <Dialog open={othersOpen} onClose={() => setOthersOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Others Details</DialogTitle>
        <DialogContent>
          <LegacyFrame>
            <L label="E-mail" w={110}>{T('email', 50)}</L>
            <L label="Tel (H)" w={110}>{T('telH', 12)}</L>
            <L label="Tel (M)" w={110}>{T('telM', 15)}</L>
            <L label="Tel (O)" w={110}>{T('telO', 15)}</L>
            <L label="Occupation" w={110}>{T('occupation', 2)}</L>
            <L label="Work Nature" w={110}>{T('work', 3)}</L>
            <L label="Allergies" w={110}>{T('allergies', 1000, { multiline: true, minRows: 2 })}</L>
          </LegacyFrame>
        </DialogContent>
        <DialogActions><Button onClick={() => setOthersOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={confirming} busy={register.isPending} title="Save registration"
        message={`Are you sure? ${f.name} will be registered${supp.length ? ` with ${supp.length} supplementary person(s)` : ''}. Premium ${quote ? formatMoney(quote.premium) : ''}, MCO fees ${quote ? formatMoney(quote.mcoFee) : ''}. A new membership number is generated.`}
        onConfirm={() => register.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
