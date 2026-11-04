import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defaultPayee, hospitalPaymentApi, paymentKey, paymentStatusLabel, type HospitalPaymentLine, type HospitalPaymentSearch } from '../../api/payments'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ChequeRangeDialog } from './ChequeRangeDialog'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { csvBlob } from '../../lib/csv'
import { download, safeFileName } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'

const statuses: [string, string][] = [['all', '0 - All'], ['paid', '1 - Paid'], ['unpaid', '2 - Unpaid'], ['partial', '3 - Partial Paid'], ['paid-partial', '4 - Paid & Partial Paid'], ['unpaid-partial', '5 - Unpaid & Partial Paid']]
const wsStatuses: [string, string][] = [['AA', 'Accepted'], ['RR', 'Repudiated'], ['CC', 'Cancelled'], ['SA', 'Special Approval'], ['PP', 'Pay & Claim'], ['NN', 'Not Decided'], ['NA', 'Not Decided/Accepted'],
  ['NR', 'Not Decided/Repudiated'], ['PA', 'Pay&Claim/Accepted'], ['PR', 'Pay&Claim/Rejected'], ['AR', 'Accepted/Rejected'], ['RA', 'Rejected/Accepted'], ['BR', 'BTBG/Rejected'], ['AI', 'Accepted/Insurance']]
const blankSearch = { hospital: '', payor: '', healthType: '', worksheetStatus: '', status: 'all', claimNo: '', pvNoFrom: '', pvNoTo: '', withoutPv: false, pvDateFrom: '', pvDateTo: '',
  sunNoFrom: '', sunNoTo: '', sunDateFrom: '', sunDateTo: '', invoiceNoFrom: '', invoiceNoTo: '', invoiceDateFrom: '', invoiceDateTo: '', claimDateFrom: '', claimDateTo: '',
  bordxDateFrom: '', bordxDateTo: '', mrnFrom: '', mrnTo: '' }
type Search = typeof blankSearch
const blankHeader = { pvNo: '', pvDate: '', pvStatus: '', chequeNo: '', chequeDate: '', chequeAmount: '', accountMonth: '', accountYear: '', payee: '', wording: '', remark: '' }
type Header = typeof blankHeader
const blankCase = { paid: '', bankCharge: '', gainLoss: '', discount: '', misc: '', excess: '', medixPayment: '', contraCase: '', contraVersion: '', contraAmount: '', caseRemark: '' }
type CaseFields = typeof blankCase

const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))
const text = (s: string) => (s.trim() === '' ? null : s.trim())
const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))
const toSearch = (s: Search): HospitalPaymentSearch => ({
  hospital: text(s.hospital), payor: text(s.payor), healthType: text(s.healthType), worksheetStatus: text(s.worksheetStatus), status: s.status, claimNoFrom: text(s.claimNo), claimNoTo: null,
  pvNoFrom: text(s.pvNoFrom), pvNoTo: text(s.pvNoTo), withoutPv: s.withoutPv, pvDateFrom: text(s.pvDateFrom), pvDateTo: text(s.pvDateTo), sunNoFrom: text(s.sunNoFrom), sunNoTo: text(s.sunNoTo),
  sunDateFrom: text(s.sunDateFrom), sunDateTo: text(s.sunDateTo), invoiceNoFrom: text(s.invoiceNoFrom), invoiceNoTo: text(s.invoiceNoTo), invoiceDateFrom: text(s.invoiceDateFrom),
  invoiceDateTo: text(s.invoiceDateTo), claimDateFrom: text(s.claimDateFrom), claimDateTo: text(s.claimDateTo), bordxDateFrom: text(s.bordxDateFrom), bordxDateTo: text(s.bordxDateTo),
  mrnFrom: text(s.mrnFrom), mrnTo: text(s.mrnTo),
})
const headerOf = (l: HospitalPaymentLine): Header => ({ pvNo: l.pvNo ?? '', pvDate: l.pvDate ?? '', pvStatus: l.pvStatus === 'A' || l.pvStatus === 'C' ? l.pvStatus : '', chequeNo: l.chequeNo ?? '',
  chequeDate: l.chequeDate ?? '', chequeAmount: str(l.chequeAmount), accountMonth: str(l.accountMonth), accountYear: str(l.accountYear), payee: defaultPayee(l), wording: l.wording ?? '', remark: l.remark ?? '' })
const caseOf = (l: HospitalPaymentLine): CaseFields => ({ paid: str(l.paid), bankCharge: str(l.bankCharge), gainLoss: str(l.gainLoss), discount: str(l.discount), misc: str(l.misc), excess: str(l.excess),
  medixPayment: str(l.medixPayment), contraCase: l.contraCase ?? '', contraVersion: l.contraVersion ?? '', contraAmount: str(l.contraAmount), caseRemark: l.caseRemark ?? '' })

const headers = ['Status', 'Hospital', 'Invoice No', 'Inv Date', 'Payable', 'Paid', 'O/S', 'Payable to Mbr', 'Claim No', 'Bordx No', 'Member', 'Admitted', 'Discharged', 'PV No', 'PV Date',
  'Cheque No', 'Cheque Date', 'Cheque Amt', 'A/C Period', 'Remark', 'Receipt No', 'Receipt Amt', 'Bank Chg', 'Gain/Loss', 'Discount', 'Misc', 'Contra Case', 'Contra Amt', 'Case Remark',
  'Excess', 'Medix Pay', 'WS Status', 'SUN No', 'SUN Date', 'WS Date', 'Bordx Date', 'Orig Inv', 'Payee', 'MRN', 'Claim ID']
const row = (l: HospitalPaymentLine) => [paymentStatusLabel(l.status), l.hospital, l.invoiceNos, formatDate(l.invoiceDate), formatMoney(l.payable), formatMoney(l.paid), formatMoney(l.outstanding),
  formatMoney(l.payableToMember), `${l.caseNumber}-${l.version}`, l.bordxNo, l.memberName, formatDate(l.admitted), formatDate(l.discharged), l.pvNo, formatDate(l.pvDate), l.chequeNo,
  formatDate(l.chequeDate), formatMoney(l.chequeAmount), l.accountMonth ? `${String(l.accountMonth).padStart(2, '0')}/${l.accountYear ?? ''}` : '', l.remark, l.receiptNo, formatMoney(l.receiptAmount),
  formatMoney(l.bankCharge), formatMoney(l.gainLoss), formatMoney(l.discount), formatMoney(l.misc), l.contraCase ? `${l.contraCase}-${l.contraVersion ?? ''}` : '', formatMoney(l.contraAmount),
  l.caseRemark, formatMoney(l.excess), formatMoney(l.medixPayment), l.worksheetStatus, l.sunNo, formatDate(l.sunDate), formatDate(l.claimDate), formatDate(l.bordxDate),
  l.originalInvoiceStatus === 'Y' ? formatDate(l.originalInvoiceDate) || 'Y' : '', l.payee ?? l.hospitalPayee, l.mrn, l.claimId]
const numeric = new Set([4, 5, 6, 7, 17, 21, 22, 23, 24, 25, 27, 29, 30])

/**
 * Legacy: Payment > To Hospital (FrmPaymentHospital). Lists the claims payable to hospitals with their payment vouchers; pick a voucher line, Edit and Update
 * to correct it. With `enquiry` it is Payment > Enquiry > Payment To Hospital (FrmEnquiryPaymentHospital): the same listing, read only.
 */
export function HospitalPaymentPage({ enquiry = false }: { enquiry?: boolean }) {
  const navigate = useNavigate()
  const options = useQuery({ queryKey: ['hospital-payment-options', enquiry], queryFn: () => hospitalPaymentApi.options(enquiry) })
  const [s, setS] = useState(blankSearch)
  const [lines, setLines] = useState<HospitalPaymentLine[]>([])
  const [truncated, setTruncated] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [h, setH] = useState<Header>(blankHeader)
  const [c, setC] = useState<CaseFields>(blankCase)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [chequeRange, setChequeRange] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const fail = (e: unknown) => { setConfirm(false); setMessage({ severity: 'error', text: (e as Error).message }) }
  const print = useMutation({
    mutationFn: ({ pvNo, kind }: { pvNo: string; kind: 'voucher' | 'letter' | 'cheque' }) => hospitalPaymentApi.print(pvNo, kind),
    onSuccess: (blob, { pvNo, kind }) => download(blob, `${kind === 'letter' ? 'Letter' : kind === 'cheque' ? 'Cheque' : 'PV'}-${safeFileName(pvNo)}.pdf`), onError: fail,
  })
  const line = lines.find((l) => paymentKey(l) === selected) ?? null

  const select = (l: HospitalPaymentLine) => { setSelected(paymentKey(l)); setEditing(false); setH(l.pvNo ? headerOf(l) : blankHeader); setC(l.pvNo ? caseOf(l) : blankCase) }
  const search = useMutation({
    mutationFn: () => hospitalPaymentApi.search(toSearch(s), enquiry),
    onSuccess: (r) => {
      setLines(r.lines); setTruncated(r.truncated); setSelected(null); setEditing(false); setH(blankHeader); setC(blankCase)
      setMessage(r.lines.length === 0 ? { severity: 'warning', text: 'No record found!' } : r.truncated ? { severity: 'warning', text: 'Only the first 5,000 lines are shown: narrow the search.' } : null)
    }, onError: fail,
  })
  const update = useMutation({
    mutationFn: () => hospitalPaymentApi.update(h.pvNo, {
      pvDate: text(h.pvDate), pvStatus: text(h.pvStatus), chequeNo: text(h.chequeNo), chequeDate: text(h.chequeDate), chequeAmount: num(h.chequeAmount), payee: text(h.payee), remark: text(h.remark),
      accountMonth: num(h.accountMonth), accountYear: num(h.accountYear),
    }, { caseNumber: line!.caseNumber, version: line!.version, paid: num(c.paid) ?? 0, bankCharge: num(c.bankCharge), gainLoss: num(c.gainLoss), discount: num(c.discount), misc: num(c.misc),
      excess: num(c.excess), medixPayment: num(c.medixPayment), contraCase: text(c.contraCase), contraVersion: text(c.contraVersion), contraAmount: num(c.contraAmount), caseRemark: text(c.caseRemark) }),
    onSuccess: (r) => {
      setConfirm(false); setEditing(false); setLines(r.lines); setTruncated(false); setMessage({ severity: 'success', text: 'Record updated !' })
      const again = r.lines.find((l) => line && l.caseNumber === line.caseNumber && l.version === line.version) ?? r.lines[0]
      if (again) select(again)
    }, onError: fail,
  })
  const tryUpdate = () => {
    setMessage(null)
    const problem = !text(h.payee) ? 'Please Enter Payee!' : !h.pvDate ? 'Please Enter PV Date! ' : !text(h.chequeNo) ? 'Please Enter Cheque No!' : !h.chequeDate ? 'Please Enter Cheque Date! '
      : num(h.chequeAmount) === null ? 'Please Enter Cheque Amt!' : !!text(c.contraCase) !== !!text(c.contraVersion) ? 'Invalid Contra Case..., Please Keyin Contra Case No. or Contra Version ' : null
    if (problem) setMessage({ severity: 'error', text: problem })
    else setConfirm(true)
  }

  const set = (k: keyof Search) => (e: { target: { value: string } }) => setS((x) => ({ ...x, [k]: e.target.value }))
  const setDate = (k: keyof Search) => (v: string) => setS((x) => ({ ...x, [k]: v }))
  const setHead = (k: keyof Header) => (e: { target: { value: string } }) => setH((x) => ({ ...x, [k]: e.target.value }))
  const setCase = (k: keyof CaseFields) => (e: { target: { value: string } }) => setC((x) => ({ ...x, [k]: e.target.value }))
  const range = (label: string, from: keyof Search, to: keyof Search, dates = false) => (
    <LegacyRow label={label} w={95}>
      {dates ? <DateField sx={{ ...box, width: 110 }} value={s[from] as string} onChange={setDate(from)} /> : <TextField size="small" sx={{ ...box, width: 110 }} value={s[from]} onChange={set(from)} />}
      <Typography sx={{ fontSize: 13 }}>To</Typography>
      {dates ? <DateField sx={{ ...box, width: 110 }} value={s[to] as string} onChange={setDate(to)} /> : <TextField size="small" sx={{ ...box, width: 110 }} value={s[to]} onChange={set(to)} />}
    </LegacyRow>
  )
  const choice = (label: string, k: keyof Search, items: [string, string][], w = 210) => (
    <LegacyRow label={label} w={95}>
      <TextField select size="small" sx={{ ...box, width: w }} value={s[k]} onChange={set(k)}><MenuItem value="">&nbsp;</MenuItem>{items.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}</TextField>
    </LegacyRow>
  )
  const field = (label: string, value: string, onChange: (e: { target: { value: string } }) => void, open: boolean, w = 130, right = false) => (
    <LegacyRow label={label} w={95}><TextField size="small" sx={{ ...box, width: w }} value={value} onChange={onChange} disabled={!open} slotProps={right ? { htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } } } : undefined} /></LegacyRow>
  )
  const info = (label: string, value: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Typography sx={{ fontSize: 13 }}>{label}</Typography>
      <TextField size="small" sx={{ ...yellow, width: 120 }} value={value} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} /></Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>{enquiry ? 'Enquiry - Payment to Hospital' : 'Payment to Hospital'}</LegacyTitle>
      {options.isError && <Alert severity="error">{(options.error as Error).message}</Alert>}
      {!enquiry && <Alert severity="info">New payment vouchers are made by Receipt &gt; Payor when the payor's receipt pays the claim. Here you can find vouchers and correct them.</Alert>}
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', columnGap: 2 }}>
          {choice('Hospital', 'hospital', (options.data?.hospitals ?? []).map((x) => [x.code, x.name]), 230)}
          {choice('Payor', 'payor', (options.data?.payors ?? []).map((x) => [x.code, `${x.code} - ${x.name}`]))}
          {choice('Health Type', 'healthType', (options.data?.healthTypes ?? []).map((x) => [x.code, `${x.code} - ${x.name}`]))}
          {choice('WS Status', 'worksheetStatus', wsStatuses.map(([v, t]) => [v, `${v} - ${t}`]))}
          <LegacyRow label="Payment" w={95}>
            <TextField select size="small" sx={{ ...box, width: 210 }} value={s.status} onChange={set('status')}>{statuses.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}</TextField>
          </LegacyRow>
          <LegacyRow label="Claim No" w={95}><TextField size="small" sx={{ ...box, width: 130 }} value={s.claimNo} onChange={set('claimNo')} /></LegacyRow>
          <LegacyRow label="PV No" w={95}>
            <TextField size="small" sx={{ ...box, width: 100 }} value={s.pvNoFrom} onChange={set('pvNoFrom')} /><Typography sx={{ fontSize: 13 }}>To</Typography>
            <TextField size="small" sx={{ ...box, width: 100 }} value={s.pvNoTo} onChange={set('pvNoTo')} />
            <FormControlLabel sx={{ ml: 0 }} control={<Checkbox size="small" sx={{ p: 0.25 }} checked={s.withoutPv} onChange={(e) => setS((x) => ({ ...x, withoutPv: e.target.checked }))} />} label={<Typography sx={{ fontSize: 13 }}>None</Typography>} />
          </LegacyRow>
          {range('PV Date', 'pvDateFrom', 'pvDateTo', true)}
          {range('SUN No', 'sunNoFrom', 'sunNoTo')}
          {range('SUN Date', 'sunDateFrom', 'sunDateTo', true)}
          {range('Invoice No', 'invoiceNoFrom', 'invoiceNoTo')}
          {range('Invoice Date', 'invoiceDateFrom', 'invoiceDateTo', true)}
          {range('WS Date', 'claimDateFrom', 'claimDateTo', true)}
          {range('Bordx Date', 'bordxDateFrom', 'bordxDateTo', true)}
          {range('MRN No', 'mrnFrom', 'mrnTo')}
        </Box>
      </LegacyFrame>

      <Paper variant="outlined" sx={{ maxHeight: '38vh', overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
          '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& td.n': { textAlign: 'right' }, '& tr.sel td': { bgcolor: 'action.focus' } }}>
          <thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={paymentKey(l)} className={selected === paymentKey(l) ? 'sel' : undefined} onClick={() => select(l)} style={{ cursor: 'pointer' }}>
                {row(l).map((v, i) => <td key={i} className={numeric.has(i) ? 'n' : undefined}>{v}</td>)}
              </tr>
            ))}
            {lines.length === 0 && <tr><td colSpan={headers.length}>Enter the search and click Search.</td></tr>}
          </tbody>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {info('Record(s)', String(lines.length) + (truncated ? '+' : ''))}
        {info('Total Payable', formatMoney(lines.reduce((a, l) => a + l.payable, 0)))}
        {info('Total Paid', formatMoney(lines.reduce((a, l) => a + l.paid, 0)))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 1 }}>
        <LegacyFrame title="Payment Voucher">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', columnGap: 1.5 }}>
            <LegacyRow label="PV No" w={95}><TextField size="small" sx={{ ...yellow, width: 130 }} value={h.pvNo} slotProps={{ input: { readOnly: true } }} /></LegacyRow>
            <LegacyRow label="PV Date" w={95}><DateField sx={{ ...box, width: 130 }} value={h.pvDate} onChange={(v) => setH((x) => ({ ...x, pvDate: v }))} disabled={!editing} /></LegacyRow>
            <LegacyRow label="PV Status" w={95}>
              <TextField select size="small" sx={{ ...box, width: 130 }} value={h.pvStatus} onChange={setHead('pvStatus')} disabled={!editing}>
                <MenuItem value="">(unchanged)</MenuItem><MenuItem value="A">A - Active</MenuItem><MenuItem value="C">C - Cancelled</MenuItem>
              </TextField>
            </LegacyRow>
            {field('Cheque No', h.chequeNo, setHead('chequeNo'), editing)}
            <LegacyRow label="Cheque Date" w={95}><DateField sx={{ ...box, width: 130 }} value={h.chequeDate} onChange={(v) => setH((x) => ({ ...x, chequeDate: v }))} disabled={!editing} /></LegacyRow>
            {field('Cheque Amt', h.chequeAmount, setHead('chequeAmount'), editing, 130, true)}
            <LegacyRow label="A/C Period" w={95}>
              <TextField size="small" sx={{ ...box, width: 50 }} value={h.accountMonth} onChange={setHead('accountMonth')} disabled={!editing} slotProps={{ htmlInput: { 'aria-label': 'Account month' } }} />
              <TextField size="small" sx={{ ...box, width: 70 }} value={h.accountYear} onChange={setHead('accountYear')} disabled={!editing} slotProps={{ htmlInput: { 'aria-label': 'Account year' } }} />
            </LegacyRow>
          </Box>
          {field('Payee', h.payee, setHead('payee'), editing, 360)}
          <LegacyRow label="Amt (words)" w={95}><TextField size="small" sx={{ ...yellow, flex: 1 }} value={h.wording} slotProps={{ input: { readOnly: true } }} helperText={editing ? 'Written from the cheque amount on Update.' : undefined} /></LegacyRow>
          <LegacyRow label="Remark" w={95}><TextField size="small" sx={{ ...box, flex: 1 }} value={h.remark} onChange={setHead('remark')} disabled={!editing} slotProps={{ htmlInput: { maxLength: 200 } }} /></LegacyRow>
        </LegacyFrame>

        <LegacyFrame title="Case">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', columnGap: 1.5 }}>
            <LegacyRow label="Claim No" w={95}><TextField size="small" sx={{ ...yellow, width: 130 }} value={line ? `${line.caseNumber}-${line.version}` : ''} slotProps={{ input: { readOnly: true } }} /></LegacyRow>
            {field('Amount Paid', c.paid, setCase('paid'), editing, 130, true)}
            {field('Bank Charges', c.bankCharge, setCase('bankCharge'), editing, 130, true)}
            {field('Gain / Loss', c.gainLoss, setCase('gainLoss'), editing, 130, true)}
            {field('Discount', c.discount, setCase('discount'), editing, 130, true)}
            {field('Misc Diff', c.misc, setCase('misc'), editing, 130, true)}
            {field('Excess', c.excess, setCase('excess'), editing, 130, true)}
            {field('Medix Pay', c.medixPayment, setCase('medixPayment'), editing, 130, true)}
            <LegacyRow label="Contra Case" w={95}>
              <TextField size="small" sx={{ ...box, width: 100 }} value={c.contraCase} onChange={setCase('contraCase')} disabled={!editing} />
              <TextField size="small" sx={{ ...box, width: 40 }} value={c.contraVersion} onChange={setCase('contraVersion')} disabled={!editing} slotProps={{ htmlInput: { 'aria-label': 'Contra version' } }} />
            </LegacyRow>
            {field('Contra Amt', c.contraAmount, setCase('contraAmount'), editing, 130, true)}
          </Box>
          <LegacyRow label="Case Remark" w={95}><TextField size="small" sx={{ ...box, flex: 1 }} value={c.caseRemark} onChange={setCase('caseRemark')} disabled={!editing} slotProps={{ htmlInput: { maxLength: 200 } }} /></LegacyRow>
        </LegacyFrame>
      </Box>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" disabled={search.isPending} onClick={() => { setMessage(null); search.mutate() }}>Search</Button>
          {!editing && !enquiry && <Button size="small" variant="outlined" disabled={!line?.pvNo} onClick={() => { setEditing(true); setMessage(null) }}>Edit</Button>}
          {editing && <Button size="small" variant="contained" color="warning" disabled={update.isPending} onClick={tryUpdate}>Update</Button>}
          {editing && <Button size="small" variant="outlined" onClick={() => line && select(line)}>Cancel</Button>}
          {!enquiry && <Button size="small" variant="outlined" disabled={!line?.pvNo || print.isPending} onClick={() => line?.pvNo && print.mutate({ pvNo: line.pvNo, kind: 'voucher' })}>Print PV</Button>}
          {!enquiry && <Button size="small" variant="outlined" disabled={!line?.pvNo || print.isPending} onClick={() => line?.pvNo && print.mutate({ pvNo: line.pvNo, kind: 'letter' })}>Print CV</Button>}
          {!enquiry && <Button size="small" variant="outlined" disabled={!line?.pvNo || print.isPending || editing} onClick={() => line?.pvNo && print.mutate({ pvNo: line.pvNo, kind: 'cheque' })}>Print Cheque</Button>}
          {!enquiry && <Button size="small" variant="outlined" onClick={() => setChequeRange(true)}>Print Cheque Range</Button>}
          <Button size="small" variant="outlined" disabled={lines.length === 0} onClick={() => download(csvBlob(headers, lines.map(row)), 'PaymentToHospital.csv')}>Export to Excel</Button>
          <Button size="small" variant="outlined" onClick={() => { setS(blankSearch); setLines([]); setSelected(null); setH(blankHeader); setC(blankCase); setEditing(false); setMessage(null); setTruncated(false) }}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>

      <ConfirmDialog open={confirm} busy={update.isPending} title="Payment to Hospital" message={`Do you want to update voucher ${h.pvNo} and claim ${line ? `${line.caseNumber}-${line.version}` : ''}?`}
        onConfirm={() => update.mutate()} onCancel={() => setConfirm(false)} />
      {!enquiry && <ChequeRangeDialog open={chequeRange} onClose={() => setChequeRange(false)} />}
    </Box>
  )
}
