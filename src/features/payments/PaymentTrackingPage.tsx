import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paymentTrackingApi, trackingReports, type PaymentTrackingLine, type PaymentTrackingResult } from '../../api/payments'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'

const blank = { report: 'general', memberNo: '', memberName: '', healthType: '', payor: '', claimNoFrom: '', claimNoTo: '', hospital: '', pvNoFrom: '', pvNoTo: '', pvDateFrom: '',
  pvDateTo: '', dnCnFrom: '', dnCnTo: '', amountFrom: '', amountTo: '', bordxNoFrom: '', bordxNoTo: '', bordxDateFrom: '', bordxDateTo: '', accountMonthFrom: '', accountMonthTo: '',
  accountYearFrom: '', accountYearTo: '', status: '' }
type Search = typeof blank
const text = (s: string) => (s.trim() === '' ? null : s.trim())
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))

const lineHeaders = ['PV No', 'PV Date', 'Amount Paid', 'Member No', 'Member', 'Bordx No', 'Claim No', 'Hospital', 'Payor', 'DN/CN', 'Remark', 'Status', 'A/C Period']
const lineRow = (l: PaymentTrackingLine) => [l.pvNo, formatDate(l.pvDate), formatMoney(l.paid), l.memberNumber, l.memberName, l.bordxNo, `${l.caseNumber}-${l.version}`, l.hospital, l.payor,
  l.dnCn, l.remark, l.status === 'F' ? 'Full' : l.status === 'P' ? 'Partial' : '', l.accountMonth ? `${l.accountMonth}/${l.accountYear ?? ''}` : '']

/** Legacy: Payment > Payment Tracking (FrmPaymentTracking), report type Hospital: the hospital payment vouchers as a general listing or grouped (the legacy "Report" choices). */
export function PaymentTrackingPage() {
  const navigate = useNavigate()
  const options = useQuery({ queryKey: ['payment-tracking-options'], queryFn: paymentTrackingApi.options })
  const [s, setS] = useState<Search>(blank)
  const [result, setResult] = useState<PaymentTrackingResult | null>(null)
  const [message, setMessage] = useState<{ severity: 'error' | 'warning'; text: string } | null>(null)
  const report = trackingReports.find((r) => r.value === (result?.report ?? s.report)) ?? trackingReports[0]

  const search = useMutation({
    mutationFn: () => paymentTrackingApi.search({
      report: s.report, memberNo: text(s.memberNo), memberName: text(s.memberName), healthType: text(s.healthType), payor: text(s.payor), claimNoFrom: text(s.claimNoFrom),
      claimNoTo: text(s.claimNoTo), hospital: text(s.hospital), pvNoFrom: text(s.pvNoFrom), pvNoTo: text(s.pvNoTo), pvDateFrom: text(s.pvDateFrom), pvDateTo: text(s.pvDateTo),
      dnCnFrom: text(s.dnCnFrom), dnCnTo: text(s.dnCnTo), amountFrom: num(s.amountFrom), amountTo: num(s.amountTo), bordxNoFrom: text(s.bordxNoFrom), bordxNoTo: text(s.bordxNoTo),
      bordxDateFrom: text(s.bordxDateFrom), bordxDateTo: text(s.bordxDateTo), accountMonthFrom: num(s.accountMonthFrom), accountMonthTo: num(s.accountMonthTo),
      accountYearFrom: num(s.accountYearFrom), accountYearTo: num(s.accountYearTo), status: text(s.status),
    }),
    onSuccess: (r) => {
      setResult(r)
      setMessage(r.count === 0 ? { severity: 'warning', text: 'No record found!' } : r.truncated ? { severity: 'warning', text: `Only the first ${r.report === 'general' ? '5,000' : '50,000'} vouchers are included: narrow the search.` } : null)
    },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })

  const groupHeaders = [report.key, ...(report.date ? [report.date] : []), 'No of Case', 'Amount Paid']
  const groupRows = (result?.groups ?? []).map((g) => [g.key ?? '(none)', ...(report.date ? [formatDate(g.date)] : []), String(g.cases), formatMoney(g.paid)])
  const general = !result || result.report === 'general'
  const headers = general ? lineHeaders : groupHeaders
  const rows = general ? (result?.lines ?? []).map(lineRow) : groupRows
  const numeric = general ? new Set([2]) : new Set([headers.length - 2, headers.length - 1])

  const set = (k: keyof Search) => (e: { target: { value: string } }) => setS((x) => ({ ...x, [k]: e.target.value }))
  const range = (label: string, from: keyof Search, to: keyof Search, kind: 'text' | 'date' | 'number' = 'text', w = 110) => (
    <LegacyRow label={label} w={95}>
      {kind === 'date' ? <DateField sx={{ ...box, width: w }} value={s[from]} onChange={(v) => setS((x) => ({ ...x, [from]: v }))} />
        : <TextField size="small" sx={{ ...box, width: w }} value={s[from]} onChange={set(from)} slotProps={kind === 'number' ? { htmlInput: { inputMode: 'decimal' } } : undefined} />}
      <Typography sx={{ fontSize: 13 }}>To</Typography>
      {kind === 'date' ? <DateField sx={{ ...box, width: w }} value={s[to]} onChange={(v) => setS((x) => ({ ...x, [to]: v }))} />
        : <TextField size="small" sx={{ ...box, width: w }} value={s[to]} onChange={set(to)} slotProps={kind === 'number' ? { htmlInput: { inputMode: 'decimal' } } : undefined} />}
    </LegacyRow>
  )
  const info = (label: string, value: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Typography sx={{ fontSize: 13 }}>{label}</Typography>
      <TextField size="small" sx={{ ...yellow, width: 130 }} value={value} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} /></Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Payment Tracking</LegacyTitle>
      {options.isError && <Alert severity="error">{(options.error as Error).message}</Alert>}
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', columnGap: 2 }}>
          <LegacyRow label="Report" w={95}>
            <TextField select size="small" sx={{ ...box, width: 230 }} value={s.report} onChange={set('report')}>{trackingReports.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}</TextField>
          </LegacyRow>
          <LegacyRow label="Member No" w={95}><TextField size="small" sx={{ ...box, width: 150 }} value={s.memberNo} onChange={set('memberNo')} /></LegacyRow>
          <LegacyRow label="Member Name" w={95}><TextField size="small" sx={{ ...box, width: 230 }} value={s.memberName} onChange={set('memberName')} /></LegacyRow>
          <LegacyRow label="Health Type" w={95}>
            <TextField select size="small" sx={{ ...box, width: 150 }} value={s.healthType} onChange={set('healthType')}>
              <MenuItem value="">&nbsp;</MenuItem><MenuItem value="S">S - Sihat</MenuItem><MenuItem value="N">N - Non-Sihat</MenuItem>
            </TextField>
          </LegacyRow>
          <LegacyRow label="Payor" w={95}>
            <TextField select size="small" sx={{ ...box, width: 230 }} value={s.payor} onChange={set('payor')}>
              <MenuItem value="">&nbsp;</MenuItem>{(options.data?.payors ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
            </TextField>
          </LegacyRow>
          <LegacyRow label="Hospital" w={95}>
            <TextField select size="small" sx={{ ...box, width: 230 }} value={s.hospital} onChange={set('hospital')}>
              <MenuItem value="">&nbsp;</MenuItem>{(options.data?.hospitals ?? []).map((h) => <MenuItem key={h.code} value={h.code}>{h.name}</MenuItem>)}
            </TextField>
          </LegacyRow>
          {range('Claim No', 'claimNoFrom', 'claimNoTo')}
          {range('PV No', 'pvNoFrom', 'pvNoTo')}
          {range('PV Date', 'pvDateFrom', 'pvDateTo', 'date')}
          {range('DN/CN No', 'dnCnFrom', 'dnCnTo')}
          {range('Amount', 'amountFrom', 'amountTo', 'number')}
          {range('Bordx No', 'bordxNoFrom', 'bordxNoTo')}
          {range('Bordx Date', 'bordxDateFrom', 'bordxDateTo', 'date')}
          {range('A/C Month', 'accountMonthFrom', 'accountMonthTo', 'number', 60)}
          {range('A/C Year', 'accountYearFrom', 'accountYearTo', 'number', 70)}
          <LegacyRow label="Status" w={95}>
            <TextField select size="small" sx={{ ...box, width: 150 }} value={s.status} onChange={set('status')}>
              <MenuItem value="">&nbsp;</MenuItem><MenuItem value="F">F - Full</MenuItem><MenuItem value="P">P - Partial</MenuItem>
            </TextField>
          </LegacyRow>
        </Box>
      </LegacyFrame>

      <Paper variant="outlined" sx={{ maxHeight: '48vh', overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
          '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& td.n': { textAlign: 'right' } }}>
          <thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={numeric.has(j) ? 'n' : undefined}>{v}</td>)}</tr>)}
            {rows.length === 0 && <tr><td colSpan={headers.length}>Choose the report, enter the search and click Search.</td></tr>}
          </tbody>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {info('Record(s)', result ? String(general ? result.lines.length : result.groups.length) : '0')}
        {info('Vouchers', result ? String(result.count) + (result.truncated ? '+' : '') : '0')}
        {info('Total Amt', formatMoney(result?.total ?? 0))}
      </Box>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" disabled={search.isPending} onClick={() => { setMessage(null); search.mutate() }}>Search</Button>
          <Button size="small" variant="outlined" disabled={rows.length === 0} onClick={() => download(csvBlob(headers, rows), `PaymentTracking-${report.value}.csv`)}>Export</Button>
          <Button size="small" variant="outlined" onClick={() => { setS(blank); setResult(null); setMessage(null) }}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>
    </Box>
  )
}
