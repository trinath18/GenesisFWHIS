import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { blankClaim, claimOf, defaultPaying, lineKey, payorReceiptApi, statusLabel, type PayorReceiptBordx, type PayorReceiptClaim, type PayorReceiptHeader, type PayorReceiptLine, type PayorReceiptSearch } from '../../api/payments'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { csvBlob } from '../../lib/csv'
import { download, safeFileName } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'

const statuses: [string, string][] = [['all', '0 - All'], ['paid', '1 - Paid'], ['unpaid', '2 - Unpaid'], ['partial', '3 - Partial']]
const blankSearch = { claimNo: '', scan: false, payor: '', status: 'all', receiptNoFrom: '', receiptNoTo: '', receiptDateFrom: '', receiptDateTo: '', claimDateFrom: '', claimDateTo: '',
  bordxDateFrom: '', bordxDateTo: '', bordxNoFrom: '', bordxNoTo: '', claimId: '' }
const blankHeader = { receiptNo: '', pvNo: '', receiptDate: '', accountMonth: '', accountYear: '', amount: '', chequeNo: '', chequeNoMr: '', payChequeDate: '', pvDate: '', bank: '', remark: '' }
type Header = typeof blankHeader
const blankCase = { paying: '', bankCharge: '', contraCase: '', contraVersion: '', contraAmount: '', gainLoss: '', misc: '', discount: '', writeOff: '', medixReceipt: '', caseRemark: '' }
type CaseFields = typeof blankCase

const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))
const text = (s: string) => (s.trim() === '' ? null : s.trim())
const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))
const toSearch = (s: typeof blankSearch, receiptNo?: string): PayorReceiptSearch => receiptNo
  ? { payor: null, claimNoFrom: null, claimNoTo: null, claimId: null, status: null, receiptNoFrom: receiptNo, receiptNoTo: receiptNo, receiptDateFrom: null, receiptDateTo: null, claimDateFrom: null,
      claimDateTo: null, bordxDateFrom: null, bordxDateTo: null, bordxNoFrom: null, bordxNoTo: null }
  : { payor: text(s.payor), claimNoFrom: text(s.claimNo), claimNoTo: null, claimId: text(s.claimId), status: s.status, receiptNoFrom: text(s.receiptNoFrom), receiptNoTo: text(s.receiptNoTo),
      receiptDateFrom: text(s.receiptDateFrom), receiptDateTo: text(s.receiptDateTo), claimDateFrom: text(s.claimDateFrom), claimDateTo: text(s.claimDateTo), bordxDateFrom: text(s.bordxDateFrom),
      bordxDateTo: text(s.bordxDateTo), bordxNoFrom: text(s.bordxNoFrom), bordxNoTo: text(s.bordxNoTo) }
const toHeader = (h: Header): PayorReceiptHeader => ({ receiptDate: text(h.receiptDate), amount: num(h.amount), chequeNo: text(h.chequeNo), chequeNoMr: text(h.chequeNoMr), payChequeDate: text(h.payChequeDate),
  pvDate: text(h.pvDate), bank: text(h.bank), remark: text(h.remark), accountMonth: num(h.accountMonth), accountYear: num(h.accountYear) })
const headerOf = (l: PayorReceiptLine): Header => ({ receiptNo: l.receiptNo ?? '', pvNo: l.pvNo ?? '', receiptDate: l.receiptDate ?? '', accountMonth: str(l.accountMonth), accountYear: str(l.accountYear),
  amount: str(l.receiptAmount), chequeNo: l.chequeNo ?? '', chequeNoMr: l.chequeNoMr ?? '', payChequeDate: l.payChequeDate ?? '', pvDate: l.pvDate ?? '', bank: l.bank ?? '', remark: l.receiptRemark ?? '' })
const fieldsOf = (c: PayorReceiptClaim): CaseFields => ({ paying: str(c.paying), bankCharge: str(c.bankCharge), contraCase: c.contraCase ?? '', contraVersion: c.contraVersion ?? '', contraAmount: str(c.contraAmount),
  gainLoss: str(c.gainLoss), misc: str(c.misc), discount: str(c.discount), writeOff: str(c.writeOff), medixReceipt: str(c.medixReceipt), caseRemark: c.caseRemark ?? '' })
const claimFrom = (l: PayorReceiptLine, f: CaseFields): PayorReceiptClaim => ({ caseNumber: l.caseNumber, version: l.version, paying: num(f.paying) ?? 0, bankCharge: num(f.bankCharge),
  contraCase: text(f.contraCase), contraVersion: text(f.contraVersion), contraAmount: num(f.contraAmount), gainLoss: num(f.gainLoss), misc: num(f.misc), discount: num(f.discount),
  writeOff: num(f.writeOff), medixReceipt: num(f.medixReceipt), caseRemark: text(f.caseRemark) })

const bordxHeaders = ['Chk', 'Status', 'Bordx No', 'Payor', 'Bordx Date', 'Claims', 'Amount', 'Received', 'O/S', 'Paying', 'Receipt No', 'Receipt Date', 'Cheque No', 'PV No']
const bordxStatus = (b: PayorReceiptBordx) => (b.status === 'F' ? 'Full' : b.status === 'P' ? 'Partial' : '')

const headers = ['Chk', 'Status', 'Bordx No', 'Claim No', 'Amount', 'Amt Receipt', 'O/S', 'Paying', 'Receipt No', 'Receipt Date', 'Bank Chg', 'Contra Case', 'Contra Amt', 'Gain/Loss', 'Misc',
  'Discount', 'Write Off', 'Medix Rec', 'Case Remark', 'Rec Amt', 'Acc Mth', 'Acc Yr', 'Remark', 'PV No', 'PV Date', 'Cheque No', 'WS Date', 'Bordx Date', 'Claim ID']

/**
 * Legacy: Receipt > Payor (FrmReceiptPayor, "Receipt from PAYOR"). Tick the claims a payor's cheque pays, adjust each one in "Update Case", then Save; or pick
 * a receipt line to Edit it. With `manual` it is Receipt > Payor (Manual) (FrmReceiptPayorManual): the receipt and PV numbers are typed, no hospital payment
 * or case remark is written, and whole bordereaux can be receipted (bordereau mode, the legacy form's default).
 */
export function PayorReceiptPage({ manual = false }: { manual?: boolean }) {
  const navigate = useNavigate()
  const options = useQuery({ queryKey: ['payor-receipt-options'], queryFn: payorReceiptApi.options })
  const [s, setS] = useState(blankSearch)
  const [lines, setLines] = useState<PayorReceiptLine[]>([])
  const [truncated, setTruncated] = useState(false)
  const [mode, setMode] = useState<'ws' | 'bordx'>(manual ? 'bordx' : 'ws')
  const [bordx, setBordx] = useState<PayorReceiptBordx[]>([])
  const [tickedBordx, setTickedBordx] = useState<Set<string>>(new Set())
  const [ticked, setTicked] = useState<Map<string, { row: string; claim: PayorReceiptClaim }>>(new Map())
  const [selected, setSelected] = useState<string | null>(null)
  const [h, setH] = useState<Header>(blankHeader)
  const [c, setC] = useState<CaseFields>(blankCase)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<'save' | 'update' | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)
  const fail = (e: unknown) => { setConfirm(null); setMessage({ severity: 'error', text: (e as Error).message }) }
  const printPv = useMutation({
    mutationFn: (pvNo: string) => payorReceiptApi.printVoucher(pvNo),
    onSuccess: (blob, pvNo) => download(blob, `PV-${safeFileName(pvNo)}.pdf`), onError: fail,
  })

  const line = lines.find((l) => lineKey(l) === selected) ?? null
  const byBordx = mode === 'bordx'
  // Legacy lstBordx_ItemCheck: a ticked bordereau pays what its claims still owe.
  const selectedAmount = byBordx ? bordx.filter((b) => tickedBordx.has(b.bordxNo)).reduce((a, b) => a + b.outstanding, 0) : [...ticked.values()].reduce((a, t) => a + t.claim.paying, 0)
  const selectedCount = byBordx ? tickedBordx.size : ticked.size
  const claimKey = (l: PayorReceiptLine) => `${l.caseNumber}-${l.version}`
  const tickOf = (l: PayorReceiptLine) => { const t = ticked.get(claimKey(l)); return t?.row === lineKey(l) ? t.claim : null }
  const showResult = (r: { receiptNo: string; lines: PayorReceiptLine[] }, text: string) => {
    setLines(r.lines); setTruncated(false); setTicked(new Map()); setTickedBordx(new Set()); setMode('ws'); setEditing(false); setConfirm(null); setMessage({ severity: 'success', text })
    const first = r.lines[0]; setSelected(first ? lineKey(first) : null); setH(first ? headerOf(first) : blankHeader); setC(first ? fieldsOf(claimOf(first)) : blankCase)
  }

  const search = useMutation({
    mutationFn: () => payorReceiptApi.search(toSearch(s)),
    onSuccess: (r) => {
      // "Use Scan" adds the claims to the list instead of replacing it.
      const next = s.scan ? [...lines, ...r.lines.filter((l) => !lines.some((x) => lineKey(x) === lineKey(l)))] : r.lines
      setLines(next); setTruncated(r.truncated); if (!s.scan) { setTicked(new Map()); setSelected(null) }
      setMessage(r.lines.length === 0 ? { severity: 'warning', text: 'No record found !' } : r.truncated ? { severity: 'warning', text: 'Only the first 5,000 lines are shown: narrow the search.' } : null)
    }, onError: fail,
  })
  const searchBordx = useMutation({
    mutationFn: () => payorReceiptApi.searchBordx(toSearch(s)),
    onSuccess: (r) => {
      setBordx(r.bordereaux); setTickedBordx(new Set()); setTruncated(r.truncated)
      setMessage(r.bordereaux.length === 0 ? { severity: 'warning', text: 'No record found!' } : r.truncated ? { severity: 'warning', text: 'Only the bordereaux of the first 5,000 lines are shown: narrow the search.' } : null)
    }, onError: fail,
  })
  const save = useMutation({
    mutationFn: () => manual
      ? payorReceiptApi.saveManual(h.receiptNo.trim(), text(h.pvNo), toHeader(h), byBordx ? null : [...ticked.values()].map((t) => t.claim), byBordx ? [...tickedBordx] : null)
      : payorReceiptApi.save(toHeader(h), [...ticked.values()].map((t) => t.claim)),
    onSuccess: (r) => showResult(r, `Record Saved... Receipt No ${r.receiptNo}${r.pvNo ? `, PV No ${r.pvNo}` : ''}`), onError: fail,
  })
  const tickBordx = (b: PayorReceiptBordx) => {
    const next = new Set(tickedBordx)
    if (next.has(b.bordxNo)) { next.delete(b.bordxNo); setTickedBordx(next); return }
    if (b.status === 'F' && !options.data?.authorised) { setMessage({ severity: 'error', text: 'Record has been paid !' }); return }
    if (b.status === 'P') { setMessage({ severity: 'error', text: 'Record has been Partial Paid ! Please Pay by Receipt Type - Worksheet !' }); return }
    if (next.size === 0 && !manual) setH(blankHeader)
    next.add(b.bordxNo); setTickedBordx(next)
  }
  const update = useMutation({ mutationFn: () => payorReceiptApi.update(h.receiptNo, toHeader(h), claimFrom(line!, c)), onSuccess: (r) => showResult(r, 'Record Updated...'), onError: fail })

  const select = (l: PayorReceiptLine) => {
    setSelected(lineKey(l)); setEditing(false)
    const t = tickOf(l)
    if (t) setC(fieldsOf(t))
    else { setC(l.receiptNo ? fieldsOf(claimOf(l)) : blankCase); if (ticked.size === 0) setH(l.receiptNo ? headerOf(l) : blankHeader) }
  }
  const tick = (l: PayorReceiptLine) => {
    const claim = claimKey(l)
    const next = new Map(ticked)
    if (next.has(claim)) { next.delete(claim); setTicked(next); setC(blankCase); return }
    if (l.status === 'F' && !options.data?.authorised) { setMessage({ severity: 'error', text: 'Record has been paid !' }); return }
    if (next.size === 0 && h.receiptNo && !manual) setH(blankHeader)
    const t = blankClaim(l, defaultPaying(l))
    next.set(claim, { row: lineKey(l), claim: t }); setTicked(next); setSelected(lineKey(l)); setEditing(false); setC(fieldsOf(t))
  }
  const updateCase = () => {
    if (!line) return
    const claim = claimKey(line)
    if (!tickOf(line)) { setMessage({ severity: 'error', text: 'Please select a record ! ' }); return }
    if (!!text(c.contraCase) !== !!text(c.contraVersion)) { setMessage({ severity: 'error', text: 'Invalid Contra Case..., Please Keyin Contra Case No. or Contra Version ' }); return }
    if (text(c.contraCase) && num(c.contraAmount) === null) { setMessage({ severity: 'error', text: 'Please Keyin Contra Case Amount ' }); return }
    const t = claimFrom(line, c)
    setTicked(new Map(ticked).set(claim, { row: lineKey(line), claim: t }))
    setMessage(t.paying > line.amount ? { severity: 'warning', text: 'Over Paid ! Updated .... ' } : { severity: 'info', text: 'Updated .... ' })
  }
  const trySave = () => {
    setMessage(null)
    const amount = num(h.amount)
    if (selectedCount === 0) return setMessage({ severity: 'error', text: 'Please select at least one record to be updated! ' })
    if (manual && !text(h.receiptNo)) return setMessage({ severity: 'error', text: 'Please Enter Receipt No' })
    if (amount === null) return setMessage({ severity: 'error', text: 'Please Enter Receipt Amt!' })
    if (!text(h.chequeNo)) return setMessage({ severity: 'error', text: 'Please Enter Cheque No!' })
    if (!h.receiptDate) return setMessage({ severity: 'error', text: 'Please Enter Receipt Date' })
    if (amount !== selectedAmount && !text(h.remark)) return setMessage({ severity: 'error', text: 'Receipt Amt & Checked Amt Are Different! Please Fill in Remark.' })
    if (!manual && !text(h.bank)) return setMessage({ severity: 'error', text: 'Please Enter Bank Name ' })
    setConfirm('save')
  }
  const exportList = () => download(csvBlob(headers.slice(1), lines.map((l) => {
    const t = tickOf(l)
    return [statusLabel(l, t?.paying ?? null), l.bordxNo, `${l.caseNumber}-${l.version}`, l.amount.toFixed(2), l.received.toFixed(2), l.outstanding.toFixed(2), t ? t.paying.toFixed(2) : '', l.receiptNo,
      formatDate(l.receiptDate), l.bankCharge, l.contraCase ? `${l.contraCase}-${l.contraVersion ?? ''}` : '', l.contraAmount, l.gainLoss, l.misc, l.discount, l.writeOff, l.medixReceipt, l.caseRemark,
      l.receiptAmount, l.accountMonth, l.accountYear, l.receiptRemark, l.pvNo, formatDate(l.pvDate), l.chequeNo, formatDate(l.claimDate), formatDate(l.bordxDate), l.claimId]
  })), 'ReceiptPayor.csv')

  const setSearch = (k: keyof typeof blankSearch) => (e: { target: { value: string } }) => setS((x) => ({ ...x, [k]: e.target.value }))
  const setHead = (k: keyof Header) => (e: { target: { value: string } }) => setH((x) => ({ ...x, [k]: e.target.value }))
  const setCase = (k: keyof CaseFields) => (e: { target: { value: string } }) => setC((x) => ({ ...x, [k]: e.target.value }))
  const headerOpen = selectedCount > 0 || editing
  const numbersOpen = manual && selectedCount > 0 && !editing
  const caseOpen = (!!line && !!tickOf(line)) || editing
  const date = (label: string, value: string, onChange: (iso: string) => void, disabled = false) => <LegacyRow label={label} w={95}><DateField sx={{ ...box, width: 130 }} value={value} onChange={onChange} disabled={disabled} /></LegacyRow>
  const field = (label: string, value: string, onChange: (e: { target: { value: string } }) => void, disabled: boolean, w = 130, numeric = false) => (
    <LegacyRow label={label} w={95}><TextField size="small" sx={{ ...box, width: w }} value={value} onChange={onChange} disabled={disabled} slotProps={numeric ? { htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } } } : undefined} /></LegacyRow>
  )
  const info = (label: string, value: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Typography sx={{ fontSize: 13 }}>{label}</Typography>
      <TextField size="small" sx={{ ...yellow, width: 120 }} value={value} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} /></Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>{manual ? 'Receipt from PAYOR (Manual)' : 'Receipt from PAYOR'}</LegacyTitle>
      {options.isError && <Alert severity="error">{(options.error as Error).message}</Alert>}
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', columnGap: 2 }}>
          {manual && (
            <LegacyRow label="Receipt Type" w={95}>
              <TextField select size="small" sx={{ ...box, width: 130 }} value={mode} onChange={(e) => { setMode(e.target.value as 'ws' | 'bordx'); setTicked(new Map()); setTickedBordx(new Set()); setEditing(false) }}>
                <MenuItem value="bordx">Bordereau</MenuItem><MenuItem value="ws">Worksheet</MenuItem>
              </TextField>
            </LegacyRow>
          )}
          <LegacyRow label="Claim No" w={95}>
            <TextField size="small" sx={{ ...box, width: 130 }} value={s.claimNo} onChange={setSearch('claimNo')} />
            <FormControlLabel sx={{ ml: 0.5 }} control={<Checkbox size="small" sx={{ p: 0.25 }} checked={s.scan} onChange={(e) => setS((x) => ({ ...x, scan: e.target.checked }))} />} label={<Typography sx={{ fontSize: 13 }}>Use Scan</Typography>} />
          </LegacyRow>
          <LegacyRow label="Payor" w={95}>
            <TextField select size="small" sx={{ ...box, width: 210 }} value={s.payor} onChange={setSearch('payor')}>
              <MenuItem value="">&nbsp;</MenuItem>{(options.data?.payors ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
            </TextField>
          </LegacyRow>
          <LegacyRow label="Payment Status" w={95}>
            <TextField select size="small" sx={{ ...box, width: 130 }} value={s.status} onChange={setSearch('status')}>{statuses.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}</TextField>
          </LegacyRow>
          <LegacyRow label="Receipt No" w={95}>
            <TextField size="small" sx={{ ...box, width: 100 }} value={s.receiptNoFrom} onChange={setSearch('receiptNoFrom')} /><Typography sx={{ fontSize: 13 }}>To</Typography>
            <TextField size="small" sx={{ ...box, width: 100 }} value={s.receiptNoTo} onChange={setSearch('receiptNoTo')} />
          </LegacyRow>
          <LegacyRow label="Receipt Date" w={95}>
            <DateField sx={{ ...box, width: 110 }} value={s.receiptDateFrom} onChange={(v) => setS((x) => ({ ...x, receiptDateFrom: v }))} /><Typography sx={{ fontSize: 13 }}>To</Typography>
            <DateField sx={{ ...box, width: 110 }} value={s.receiptDateTo} onChange={(v) => setS((x) => ({ ...x, receiptDateTo: v }))} />
          </LegacyRow>
          <LegacyRow label="WS Date" w={95}>
            <DateField sx={{ ...box, width: 110 }} value={s.claimDateFrom} onChange={(v) => setS((x) => ({ ...x, claimDateFrom: v }))} /><Typography sx={{ fontSize: 13 }}>To</Typography>
            <DateField sx={{ ...box, width: 110 }} value={s.claimDateTo} onChange={(v) => setS((x) => ({ ...x, claimDateTo: v }))} />
          </LegacyRow>
          <LegacyRow label="Bordx Date" w={95}>
            <DateField sx={{ ...box, width: 110 }} value={s.bordxDateFrom} onChange={(v) => setS((x) => ({ ...x, bordxDateFrom: v }))} /><Typography sx={{ fontSize: 13 }}>To</Typography>
            <DateField sx={{ ...box, width: 110 }} value={s.bordxDateTo} onChange={(v) => setS((x) => ({ ...x, bordxDateTo: v }))} />
          </LegacyRow>
          <LegacyRow label="Bordx No" w={95}>
            <TextField size="small" sx={{ ...box, width: 100 }} value={s.bordxNoFrom} onChange={setSearch('bordxNoFrom')} /><Typography sx={{ fontSize: 13 }}>To</Typography>
            <TextField size="small" sx={{ ...box, width: 100 }} value={s.bordxNoTo} onChange={setSearch('bordxNoTo')} />
          </LegacyRow>
          <LegacyRow label="Claim ID" w={95}><TextField size="small" sx={{ ...box, width: 130 }} value={s.claimId} onChange={setSearch('claimId')} /></LegacyRow>
        </Box>
      </LegacyFrame>

      {byBordx ? (
      <Paper variant="outlined" sx={{ maxHeight: '38vh', overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
          '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& td.n': { textAlign: 'right' } }}>
          <thead><tr>{bordxHeaders.map((x) => <th key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {bordx.map((b) => {
              const t = tickedBordx.has(b.bordxNo)
              return (
                <tr key={b.bordxNo}>
                  <td><Checkbox size="small" sx={{ p: 0 }} checked={t} onChange={() => tickBordx(b)} slotProps={{ input: { 'aria-label': `Tick ${b.bordxNo}` } }} /></td>
                  <td>{t ? 'Full' : bordxStatus(b)}</td><td>{b.bordxNo}</td><td>{b.payor}</td><td>{formatDate(b.bordxDate)}</td><td className="n">{b.claims}</td><td className="n">{formatMoney(b.amount)}</td>
                  <td className="n">{formatMoney(b.received)}</td><td className="n">{formatMoney(t ? 0 : b.outstanding)}</td><td className="n">{t ? formatMoney(b.outstanding) : ''}</td><td>{b.receiptNos}</td>
                  <td>{formatDate(b.receiptDate)}</td><td>{b.chequeNo}</td><td>{b.pvNo}</td>
                </tr>
              )
            })}
            {bordx.length === 0 && <tr><td colSpan={bordxHeaders.length}>Enter the search and click Search.</td></tr>}
          </tbody>
        </Box>
      </Paper>
      ) : (
      <Paper variant="outlined" sx={{ maxHeight: '38vh', overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
          '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& td.n': { textAlign: 'right' }, '& tr.sel td': { bgcolor: 'action.focus' } }}>
          <thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {lines.map((l) => {
              const t = tickOf(l)
              const other = !t && ticked.has(claimKey(l))
              return (
                <tr key={lineKey(l)} className={selected === lineKey(l) ? 'sel' : undefined} onClick={() => select(l)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}><Checkbox size="small" sx={{ p: 0 }} checked={!!t} disabled={other} onChange={() => tick(l)} slotProps={{ input: { 'aria-label': `Tick ${l.caseNumber}-${l.version}` } }} /></td>
                  <td>{statusLabel(l, t ? t.paying : null)}</td><td>{l.bordxNo}</td><td>{l.caseNumber}-{l.version}</td><td className="n">{formatMoney(l.amount)}</td><td className="n">{formatMoney(l.received)}</td>
                  <td className="n">{formatMoney(t ? l.amount - l.totalReceived - t.paying : l.outstanding)}</td><td className="n">{t ? formatMoney(t.paying) : ''}</td><td>{l.receiptNo}</td><td>{formatDate(l.receiptDate)}</td>
                  <td className="n">{formatMoney(l.bankCharge)}</td><td>{l.contraCase ? `${l.contraCase}-${l.contraVersion ?? ''}` : ''}</td><td className="n">{formatMoney(l.contraAmount)}</td><td className="n">{formatMoney(l.gainLoss)}</td>
                  <td className="n">{formatMoney(l.misc)}</td><td className="n">{formatMoney(l.discount)}</td><td className="n">{formatMoney(l.writeOff)}</td><td className="n">{formatMoney(l.medixReceipt)}</td><td>{l.caseRemark}</td>
                  <td className="n">{formatMoney(l.receiptAmount)}</td><td>{l.accountMonth}</td><td>{l.accountYear}</td><td>{l.receiptRemark}</td><td>{l.pvNo}</td><td>{formatDate(l.pvDate)}</td><td>{l.chequeNo}</td>
                  <td>{formatDate(l.claimDate)}</td><td>{formatDate(l.bordxDate)}</td><td>{l.claimId}</td>
                </tr>
              )
            })}
            {lines.length === 0 && <tr><td colSpan={headers.length}>Enter the search and click Search.</td></tr>}
          </tbody>
        </Box>
      </Paper>
      )}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {info('Record(s)', String(byBordx ? bordx.length : lines.length) + (truncated ? '+' : ''))}
        {info('Total Amt', formatMoney(byBordx ? bordx.reduce((a, b) => a + b.amount, 0) : lines.reduce((a, l) => a + l.amount, 0)))}
        {info('Total Received', formatMoney(byBordx ? bordx.reduce((a, b) => a + b.received, 0) : lines.reduce((a, l) => a + l.received, 0)))}
        {info('Selected Amt', formatMoney(selectedAmount))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 1 }}>
        <LegacyFrame title="Receipt / PV">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', columnGap: 1.5 }}>
            <LegacyRow label="Receipt No" w={95}><TextField size="small" sx={{ ...(numbersOpen ? box : yellow), width: 130 }} value={h.receiptNo} onChange={setHead('receiptNo')} slotProps={{ input: { readOnly: !numbersOpen }, htmlInput: { maxLength: 15 } }} /></LegacyRow>
            <LegacyRow label="PV No" w={95}><TextField size="small" sx={{ ...(numbersOpen ? box : yellow), width: 130 }} value={h.pvNo} onChange={setHead('pvNo')} slotProps={{ input: { readOnly: !numbersOpen }, htmlInput: { maxLength: 20 } }} /></LegacyRow>
            {date('Receipt Date', h.receiptDate, (v) => setH((x) => ({ ...x, receiptDate: v, ...(v ? { accountMonth: String(Number(v.slice(5, 7))), accountYear: v.slice(0, 4) } : {}) })), !headerOpen)}
            <LegacyRow label="A/C Period" w={95}>
              <TextField size="small" sx={{ ...box, width: 50 }} value={h.accountMonth} onChange={setHead('accountMonth')} disabled={!headerOpen} />
              <TextField size="small" sx={{ ...box, width: 70 }} value={h.accountYear} onChange={setHead('accountYear')} disabled={!headerOpen} />
            </LegacyRow>
            {field('Rec Amt', h.amount, setHead('amount'), !headerOpen, 130, true)}
            {field('Cheque No (MC)', h.chequeNo, setHead('chequeNo'), !headerOpen)}
            {field('Cheque No (MR)', h.chequeNoMr, setHead('chequeNoMr'), !headerOpen)}
            {date('Pay Chq Date', h.payChequeDate, (v) => setH((x) => ({ ...x, payChequeDate: v })), !headerOpen)}
            {date('PV Date', h.pvDate, (v) => setH((x) => ({ ...x, pvDate: v })), !headerOpen)}
            <LegacyRow label="Bank" w={95}>
              <TextField select size="small" sx={{ ...box, width: 200 }} value={h.bank} onChange={setHead('bank')} disabled={!headerOpen}>
                <MenuItem value="">&nbsp;</MenuItem>{[...new Set([...(options.data?.banks ?? []), ...(h.bank ? [h.bank] : [])])].map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
            </LegacyRow>
          </Box>
          <LegacyRow label="Remark" w={95}><TextField size="small" sx={{ ...box, flex: 1 }} value={h.remark} onChange={setHead('remark')} disabled={!headerOpen} slotProps={{ htmlInput: { maxLength: 200 } }} /></LegacyRow>
        </LegacyFrame>

        <LegacyFrame title="Update Case">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', columnGap: 1.5 }}>
            <LegacyRow label="Claim No" w={95}><TextField size="small" sx={{ ...yellow, width: 130 }} value={line ? `${line.caseNumber}-${line.version}` : ''} slotProps={{ input: { readOnly: true } }} /></LegacyRow>
            {field('Amount Paid', c.paying, setCase('paying'), !caseOpen, 130, true)}
            {field('Bank Charge', c.bankCharge, setCase('bankCharge'), !caseOpen, 130, true)}
            <LegacyRow label="Contra Case" w={95}>
              <TextField size="small" sx={{ ...box, width: 100 }} value={c.contraCase} onChange={setCase('contraCase')} disabled={!caseOpen} />
              <TextField size="small" sx={{ ...box, width: 40 }} value={c.contraVersion} onChange={setCase('contraVersion')} disabled={!caseOpen} slotProps={{ htmlInput: { 'aria-label': 'Contra version' } }} />
            </LegacyRow>
            {field('Contra Amt', c.contraAmount, setCase('contraAmount'), !caseOpen, 130, true)}
            {field('Gain / Loss', c.gainLoss, setCase('gainLoss'), !caseOpen, 130, true)}
            {field('Misc', c.misc, setCase('misc'), !caseOpen, 130, true)}
            {field('Discount', c.discount, setCase('discount'), !caseOpen, 130, true)}
            {field('Write Off', c.writeOff, setCase('writeOff'), !caseOpen, 130, true)}
            {field('Medix Rec', c.medixReceipt, setCase('medixReceipt'), !caseOpen, 130, true)}
          </Box>
          <LegacyRow label="Case Remark" w={95}><TextField size="small" sx={{ ...box, flex: 1 }} value={c.caseRemark} onChange={setCase('caseRemark')} disabled={!caseOpen} slotProps={{ htmlInput: { maxLength: 200 } }} /></LegacyRow>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><Button size="small" variant="outlined" disabled={!caseOpen || editing} onClick={updateCase}>Update Case</Button></Box>
        </LegacyFrame>
      </Box>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" disabled={search.isPending || searchBordx.isPending} onClick={() => { setMessage(null); if (byBordx) searchBordx.mutate(); else search.mutate() }}>Search</Button>
          <Button size="small" variant="contained" color="warning" disabled={selectedCount === 0 || save.isPending} onClick={trySave}>Save</Button>
          {!editing && <Button size="small" variant="outlined" disabled={byBordx || ticked.size > 0 || !line?.receiptNo} onClick={() => { setEditing(true); setMessage(null) }}>Edit</Button>}
          {editing && <Button size="small" variant="contained" color="warning" disabled={update.isPending} onClick={() => setConfirm('update')}>Update</Button>}
          {!manual && <Button size="small" variant="outlined" disabled={!h.pvNo.trim() || printPv.isPending} onClick={() => printPv.mutate(h.pvNo.trim())}>Print PV</Button>}
          <Button size="small" variant="outlined" disabled={byBordx || lines.length === 0} onClick={exportList}>Export to Excel</Button>
          <Button size="small" variant="outlined" onClick={() => { setS(blankSearch); setLines([]); setBordx([]); setTickedBordx(new Set()); setTicked(new Map()); setSelected(null); setH(blankHeader); setC(blankCase); setEditing(false); setMessage(null); setTruncated(false) }}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>

      <ConfirmDialog open={confirm === 'save'} busy={save.isPending} title="Receipt from PAYOR"
        message={`Save receipt ${manual ? `${h.receiptNo.trim()} ` : ''}of ${formatMoney(num(h.amount))} for ${selectedCount} ${byBordx ? 'bordereau(x)' : 'claim(s)'} (paying ${formatMoney(selectedAmount)})?`} onConfirm={() => save.mutate()} onCancel={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === 'update'} busy={update.isPending} title="Receipt from PAYOR"
        message={`Update receipt ${h.receiptNo} and claim ${line ? `${line.caseNumber}-${line.version}` : ''}?`} onConfirm={() => update.mutate()} onCancel={() => setConfirm(null)} />
    </Box>
  )
}
