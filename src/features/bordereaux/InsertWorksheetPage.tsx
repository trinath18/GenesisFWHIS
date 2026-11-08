import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { claimKey, insertWorksheetApi, mixProblem, type BordxOption, type CreateBordxResult, type PendingBordxClaim } from '../../api/bordx'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { formatDate, formatMoney } from '../../lib/format'
import { scanCode } from '../../lib/scanCodes'

const blank = { claimNo: '', version: '', admittedFrom: '', admittedTo: '', dischargedFrom: '', dischargedTo: '', noAdmitDate: false, noDischargeDate: false }
const text = (s: string) => (s.trim() === '' ? null : s.trim())
const headers = ['Chk', 'Payor', 'Claim No', 'Pay To', 'Payable to Hosp', 'Total Approved', 'Bordx Amt', 'DOA', 'DOD', 'Patient', 'Hospital', 'Group Company', 'Plan', 'ICD', 'BTBG', 'Claimability']

/**
 * Legacy: Claim Bordx > Worksheet > Insert Worksheet (FrmWksBordx). Lists the closed claims not yet on a bordereau; tick claims and click Bordx to put them on
 * a new bordereau (Multiple Claims: one for all, the legacy default; Single Claim: one each). Claims failing a legacy check are shown red and cannot be ticked.
 */
export function InsertWorksheetPage() {
  const navigate = useNavigate()
  const [s, setS] = useState(blank)
  const [option, setOption] = useState<BordxOption>('Multiple')
  const [claims, setClaims] = useState<PendingBordxClaim[]>([])
  const [truncated, setTruncated] = useState(false)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [created, setCreated] = useState<CreateBordxResult | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const fail = (e: unknown) => { setConfirm(false); setMessage({ severity: 'error', text: (e as Error).message }) }

  const selected = claims.filter((c) => ticked.has(claimKey(c)))
  const search = useMutation({
    mutationFn: () => insertWorksheetApi.pending({
      claimNo: text(s.claimNo), version: text(s.version) === null ? null : Number(s.version), admittedFrom: text(s.admittedFrom), admittedTo: text(s.admittedTo),
      dischargedFrom: text(s.dischargedFrom), dischargedTo: text(s.dischargedTo), noAdmitDate: s.noAdmitDate, noDischargeDate: s.noDischargeDate,
    }),
    onSuccess: (r) => {
      setClaims(r.claims); setTruncated(r.truncated); setTicked(new Set()); setCreated(null)
      setMessage(r.claims.length === 0 ? { severity: 'warning', text: 'No record found!' } : r.truncated ? { severity: 'warning', text: 'Only the first 5,000 claims are shown: narrow the search.' } : null)
    }, onError: fail,
  })
  const create = useMutation({
    mutationFn: () => insertWorksheetApi.create(option, selected.map((c) => ({ caseNumber: c.caseNumber, version: c.version }))),
    onSuccess: (r) => {
      setConfirm(false); setCreated(r); setTicked(new Set())
      setClaims((all) => all.filter((c) => !r.claims.some((d) => claimKey(d) === claimKey(c))))
      setMessage({ severity: 'success', text: `Record Saved! ${r.bordereaux.map((b) => `${b.bordxNo} (${b.claims} claim(s), ${formatMoney(b.amount)})`).join(', ')}` })
    }, onError: fail,
  })

  const runSearch = () => {
    setMessage(null)
    // Legacy CmdSearch_Click: an "LO" barcode scanned into the claim box opens another screen (SearchForm) instead of searching.
    const scan = scanCode(s.claimNo)
    if (scan) { setS((x) => ({ ...x, claimNo: '' })); return 'route' in scan ? navigate(scan.route) : setMessage({ severity: 'error', text: scan.error }) }
    search.mutate()
  }

  const toggle = (c: PendingBordxClaim) => {
    if (c.problem) { setMessage({ severity: 'error', text: `${claimKey(c)}: ${c.problem}` }); return }
    const next = new Set(ticked)
    if (next.has(claimKey(c))) next.delete(claimKey(c)); else next.add(claimKey(c))
    setTicked(next)
  }
  const checkAll = () => setTicked(new Set(claims.filter((c) => !c.problem).map(claimKey)))
  const tryCreate = () => {
    setMessage(null)
    if (selected.length === 0) return setMessage({ severity: 'error', text: 'Please select at least one record to be updated! ' })
    const mix = mixProblem(option, selected)
    if (mix) return setMessage({ severity: 'error', text: mix })
    setConfirm(true)
  }
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setS((x) => ({ ...x, [k]: e.target.value }))
  const dates = (label: string, from: 'admittedFrom' | 'dischargedFrom', to: 'admittedTo' | 'dischargedTo', none: 'noAdmitDate' | 'noDischargeDate') => (
    <LegacyRow label={label} w={95}>
      <DateField sx={{ ...box, width: 110 }} value={s[from]} onChange={(v) => setS((x) => ({ ...x, [from]: v }))} /><Typography sx={{ fontSize: 13 }}>To</Typography>
      <DateField sx={{ ...box, width: 110 }} value={s[to]} onChange={(v) => setS((x) => ({ ...x, [to]: v }))} />
      <FormControlLabel sx={{ ml: 0 }} control={<Checkbox size="small" sx={{ p: 0.25 }} checked={s[none]} onChange={(e) => setS((x) => ({ ...x, [none]: e.target.checked }))} />} label={<Typography sx={{ fontSize: 13 }}>Empty</Typography>} />
    </LegacyRow>
  )
  const info = (label: string, value: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Typography sx={{ fontSize: 13 }}>{label}</Typography>
      <TextField size="small" sx={{ ...yellow, width: 120 }} value={value} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} /></Box>
  )
  const table = { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
    '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& td.n': { textAlign: 'right' } } as const

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Insert Worksheet into Bordx</LegacyTitle>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', columnGap: 2 }}>
          <LegacyRow label="Claim No" w={95}>
            <TextField size="small" sx={{ ...box, width: 130 }} value={s.claimNo} onChange={set('claimNo')} />
            <TextField size="small" sx={{ ...box, width: 50 }} value={s.version} onChange={set('version')} slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-label': 'Version' } }} />
          </LegacyRow>
          <LegacyRow label="Bordx Option" w={95}>
            <TextField select size="small" sx={{ ...box, width: 170 }} value={option} onChange={(e) => setOption(e.target.value as BordxOption)}>
              <MenuItem value="Multiple">Multiple Claims</MenuItem><MenuItem value="Single">Single Claim</MenuItem>
            </TextField>
          </LegacyRow>
          {dates('Admitted', 'admittedFrom', 'admittedTo', 'noAdmitDate')}
          {dates('Discharged', 'dischargedFrom', 'dischargedTo', 'noDischargeDate')}
        </Box>
      </LegacyFrame>

      <Paper variant="outlined" sx={{ maxHeight: '45vh', overflow: 'auto' }}>
        <Box component="table" sx={table}>
          <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {claims.map((c) => (
              <Box component="tr" key={claimKey(c)} title={c.problem ?? undefined} sx={c.problem ? { color: 'error.main' } : undefined}>
                <td><Checkbox size="small" sx={{ p: 0 }} checked={ticked.has(claimKey(c))} onChange={() => toggle(c)} slotProps={{ input: { 'aria-label': `Tick ${claimKey(c)}` } }} /></td>
                <td>{c.payor}</td><td>{claimKey(c)}</td><td>{c.payTo}</td><td className="n">{formatMoney(c.payableToHospital)}</td><td className="n">{formatMoney(c.totalApproved)}</td>
                <td className="n">{formatMoney(c.bordxAmount)}</td><td>{formatDate(c.admitted)}</td><td>{formatDate(c.discharged)}</td><td>{c.patient}</td><td>{c.hospital}</td>
                <td>{c.groupCompany}</td><td>{c.plan}</td><td>{c.icd}</td><td>{c.btbg}</td><td>{c.claimability}</td>
              </Box>
            ))}
            {claims.length === 0 && <tr><td colSpan={headers.length}>Click Search to list the claims waiting for a bordereau.</td></tr>}
          </tbody>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {info('Record(s)', String(claims.length) + (truncated ? '+' : ''))}
        {info('Total Approved', formatMoney(claims.reduce((a, c) => a + c.totalApproved, 0)))}
        {info('Selected', String(selected.length))}
        {info('Bordx Amt', formatMoney(selected.reduce((a, c) => a + c.bordxAmount, 0)))}
        {claims.some((c) => c.problem) && <Typography sx={{ fontSize: 13, color: 'error.main' }}>Claims in red cannot be put on a bordereau (point at one for the reason).</Typography>}
      </Box>

      {created && (
        <LegacyFrame title="Bordereaux created">
          <Paper variant="outlined" sx={{ maxHeight: '25vh', overflow: 'auto' }}>
            <Box component="table" sx={table}>
              <thead><tr><th>Claim No</th><th>Bordx No</th><th>Bordx Date</th><th>Amount</th></tr></thead>
              <tbody>{created.claims.map((c) => <tr key={claimKey(c)}><td>{claimKey(c)}</td><td>{c.bordxNo}</td><td>{formatDate(c.bordxDate)}</td><td className="n">{formatMoney(c.amount)}</td></tr>)}</tbody>
            </Box>
          </Paper>
        </LegacyFrame>
      )}

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" disabled={search.isPending} onClick={runSearch}>Search</Button>
          <Button size="small" variant="outlined" disabled={claims.length === 0} onClick={checkAll}>Check All</Button>
          <Button size="small" variant="contained" color="warning" disabled={selected.length === 0 || create.isPending} onClick={tryCreate}>Bordx</Button>
          <Button size="small" variant="outlined" onClick={() => { setS(blank); setClaims([]); setTicked(new Set()); setCreated(null); setMessage(null); setTruncated(false) }}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>

      <ConfirmDialog open={confirm} busy={create.isPending} title="Insert Worksheet"
        message={`Do you want to update the record? ${selected.length} claim(s), ${formatMoney(selected.reduce((a, c) => a + c.bordxAmount, 0))}, ${option === 'Multiple' ? 'on one new bordereau' : 'each on its own new bordereau'}.`}
        onConfirm={() => create.mutate()} onCancel={() => setConfirm(false)} />
    </Box>
  )
}
