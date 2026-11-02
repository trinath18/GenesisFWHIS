import { Alert, Autocomplete, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CaseOption } from '../../api/caseRegistration'
import { computeInvoice, invoiceApi, procedureTotals, type InvoiceCaseProcedures, type InvoiceEntry, type InvoiceField, type InvoiceRequest, type InvoiceScreen, type MmaRate } from '../../api/invoices'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { formatDate, formatMoney } from '../../lib/format'
import { ScannedDocumentsTab } from '../cases/CaseTabs'
import { CaseSearchDialog } from '../cases/CaseSearchDialog'
import { ProcedureEntryDialog } from './ProcedureEntryDialog'

type Form = Omit<InvoiceRequest, 'amounts' | 'excess' | 'initialAmount'> & { amounts: Record<string, string>; excess: string; initialAmount: string }
type Mode = 'view' | 'new' | 'edit'

const empty = (stayType: string): Form => ({
  invoiceNo: '', invoiceDate: null, payTo: 'H', stayType, hospital: null, hospitalName: null, receiptMode: null, receiptDate: null, followUpDate: null,
  excess: '0', initialAmount: '', uhcNo: null, amounts: {}, chargedToMember: [], othersDescription: null, others2Description: null, othersNoCoPayDescription: null, notPayableRemark: null,
})

const num = (s: string | undefined) => (s == null || s.trim() === '' ? null : Number(s))
const text = (s: string | null) => (s == null || s.trim() === '' ? null : s.trim())
const money = (v: number | null | undefined) => (v == null ? '' : v.toFixed(2))
const round = (v: number) => Math.round(v * 100) / 100
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
/** Legacy Total shows "-" in the per-day rates, since rates do not add up. */
const rateKeys = new Set(['roomRate', 'icuRate', 'guardianRate', 'cashRate'])

function fromEntry(e: InvoiceEntry, fields: InvoiceField[]): Form {
  return {
    invoiceNo: e.invoiceNo, invoiceDate: e.invoiceDate, payTo: e.payTo === 'M' ? 'M' : 'H', stayType: e.stayType ?? '', hospital: e.payTo === 'M' ? null : e.payee,
    hospitalName: e.hospitalName, receiptMode: e.receiptMode, receiptDate: e.receiptDate, followUpDate: e.followUpDate, excess: String(e.excess), initialAmount: e.initialAmount == null ? '' : String(e.initialAmount),
    uhcNo: e.uhcNo, chargedToMember: e.chargedToMember, othersDescription: e.othersDescription, others2Description: e.others2Description,
    othersNoCoPayDescription: e.othersNoCoPayDescription, notPayableRemark: e.notPayableRemark,
    amounts: Object.fromEntries(fields.filter((f) => f.kind !== 'Computed' && e.amounts[f.key]).map((f) => [f.key, String(e.amounts[f.key])])),
  }
}

const box = { '& .MuiInputBase-input': { py: 0.4, px: 0.75, fontSize: 13 } } as const
const yellow = { ...box, '& .MuiInputBase-root': { bgcolor: '#fff9c4' } } as const
const cyan = { ...box, '& .MuiInputBase-root': { bgcolor: '#c8f4fb' } } as const
const blue = { color: 'primary.main', fontSize: 13 } as const

/** A label and its box(es) on one line, as on the legacy form. */
function L({ label, w = 110, children, color }: { label: string; w?: number; children: ReactNode; color?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 30 }}>
      <Typography sx={{ width: w, flexShrink: 0, fontSize: 13, ...(color ? blue : {}) }}>{label}</Typography>{children}
    </Box>
  )
}
function Frame({ children, disabled, title }: { children: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <Paper variant="outlined" title={title} sx={{ p: 1, display: 'grid', gap: 0.25, opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : undefined }}>{children}</Paper>
  )
}

/**
 * Legacy: Invoice > Invoice Processing (frmInvoice). The case across the top; the invoice header (patient, stay type, pay to, payee, cash type, treatment
 * mode, dates, excess and totals); the tabs Invoice Entry (the benefit frames and the case's invoices), Reimbursement Not Cover, Remarks, General Info and
 * Documents; and Total / Edit / Add / Remove / Cancel, the version and status of the selected invoice, Clear Inv / Clear All / Exit along the bottom.
 * As on the legacy form: HSS is the total of its breakdown, the surgical / anaesthetist / procedure fees come from the procedure entry (the ">" buttons,
 * whose doctors and procedures are saved with the invoice), only one set of taxes can be typed depending on the plan, the charged-to-member boxes are shown
 * but not editable, and Total shows every invoice of the case added together.
 */
export function InvoiceProcessingPage() {
  const navigate = useNavigate()
  const options = useQuery({ queryKey: ['invoice-options'], queryFn: invoiceApi.options })
  const [caseNo, setCaseNo] = useState('')
  const [screen, setScreen] = useState<InvoiceScreen | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [mode, setMode] = useState<Mode>('view')
  const [selected, setSelected] = useState<number | null>(null)
  const [removing, setRemoving] = useState<InvoiceEntry | null>(null)
  const [remarks, setRemarks] = useState('')
  const [hospitalSearch, setHospitalSearch] = useState('')
  const [tab, setTab] = useState(0)
  const [searching, setSearching] = useState(false)
  const [hss, setHss] = useState(false)
  const [totals, setTotals] = useState(false)
  const [otherHospital, setOtherHospital] = useState(false)
  // The procedure entry: the case's doctors and procedures, the MMA rates looked up so far, and whether they were changed (only then saved with the invoice).
  const [procs, setProcs] = useState<{ value: InvoiceCaseProcedures; rates: Record<string, MmaRate>; changed: boolean } | null>(null)
  const [procEntry, setProcEntry] = useState<'S' | 'N' | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null)
  const fail = (e: unknown) => setMessage({ severity: 'error', text: (e as Error).message })

  const fields = useMemo(() => options.data?.fields ?? [], [options.data])
  const byKey = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f])), [fields])
  const hospitals = useQuery({ queryKey: ['invoice-hospitals', hospitalSearch], queryFn: () => invoiceApi.hospitals(hospitalSearch), enabled: mode !== 'view' && form?.payTo === 'H' && hospitalSearch.trim().length >= 2 })
  const enteredAmounts = useMemo(() => Object.fromEntries(Object.entries(form?.amounts ?? {}).map(([k, v]) => [k, num(v)])), [form?.amounts])
  const live = useMemo(() => (fields.length && form ? computeInvoice(fields, enteredAmounts) : null), [fields, enteredAmounts, form])

  const load = useMutation({
    mutationFn: (no: string) => invoiceApi.get(no),
    onSuccess: (s) => {
      setScreen(s); setRemarks(s.remarks ?? ''); setForm(null); setMode('view'); setSelected(null); setTotals(false); setCaseNo(s.case.caseNumber)
      setProcs(s.procedures ? { value: s.procedures, rates: s.rates ?? {}, changed: false } : null)
    },
    onError: (e) => { setScreen(null); fail(e) },
  })
  const go = (no?: string) => { setMessage(null); load.mutate((no ?? caseNo).trim()) }
  const reload = () => screen && load.mutate(screen.case.caseNumber)

  const request = (f: Form): InvoiceRequest => ({
    ...f, invoiceNo: f.invoiceNo.trim(), hospital: f.payTo === 'H' ? f.hospital : null, hospitalName: text(f.hospitalName), uhcNo: text(f.uhcNo), receiptMode: f.receiptMode || null,
    excess: num(f.excess), initialAmount: num(f.initialAmount), amounts: Object.fromEntries(Object.entries(f.amounts).map(([k, v]) => [k, num(v)])),
    othersDescription: text(f.othersDescription), others2Description: text(f.others2Description), othersNoCoPayDescription: text(f.othersNoCoPayDescription), notPayableRemark: text(f.notPayableRemark),
    procedures: procs?.changed ? procs.value : null,
  })
  const save = useMutation({
    mutationFn: () => mode === 'new' ? invoiceApi.create(screen!.case.caseNumber, request(form!)) : invoiceApi.update(screen!.case.caseNumber, selected!, request(form!)),
    onSuccess: (e) => {
      setMessage({ severity: 'success', text: `Invoice ${e.invoiceNo} saved: ${formatMoney(e.amount)} (worksheet version ${e.version}).${e.inWorksheet ? ' It is in a saved worksheet: recalculate it in Worksheet Adjustment.' : ''}` })
      // Legacy SaveClaim saves the Remarks tab with the invoice.
      if (remarks !== (screen?.remarks ?? '')) invoiceApi.saveRemarks(screen!.case.caseNumber, remarks).then(reload, fail)
      else reload()
    },
    onError: fail,
  })
  const remove = useMutation({
    mutationFn: (e: InvoiceEntry) => invoiceApi.remove(screen!.case.caseNumber, e.index),
    onSuccess: () => { setRemoving(null); setMessage({ severity: 'success', text: 'Invoice removed.' }); reload() },
    onError: (e) => { setRemoving(null); fail(e) },
  })
  const saveRemarks = useMutation({
    mutationFn: () => invoiceApi.saveRemarks(screen!.case.caseNumber, remarks),
    onSuccess: () => setMessage({ severity: 'success', text: 'Remarks saved.' }), onError: fail,
  })

  const editing = mode !== 'view'
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const setAmount = (key: string, value: string) => setForm((f) => {
    if (!f) return f
    const amounts = { ...f.amounts, [key]: value }
    // Legacy frmHSSDetails: the HSS box is the total of its breakdown.
    if (key.startsWith('hss')) amounts.services = String(round(fields.filter((x) => x.key.startsWith('hss')).reduce((s, x) => s + (num(amounts[x.key]) ?? 0), 0)))
    return { ...f, amounts }
  })
  const sel = screen?.invoices.find((i) => i.index === selected) ?? null
  const pick = (e: InvoiceEntry) => { if (editing) return; setTotals(false); setSelected(e.index); setForm(fromEntry(e, fields)) }
  const startNew = () => { setTotals(false); setSelected(null); setMode('new'); setForm(empty(screen!.case.stayType?.[0] ?? 'I')); setTab(0) }
  const cancel = () => {
    setMode('view'); setForm(sel ? fromEntry(sel, fields) : null)
    setProcs(screen?.procedures ? { value: screen.procedures, rates: screen.rates ?? {}, changed: false } : null)
  }
  /** Legacy frmMMAEntry Save: the actual fee totals go into the invoice (surgical and anaesthetist fees, or the procedure fee). */
  const saveProcedures = (value: InvoiceCaseProcedures, rates: Record<string, MmaRate>) => {
    const t = procedureTotals(value)
    setProcs({ value, rates, changed: true })
    setForm((x) => (x ? { ...x, amounts: { ...x.amounts, ...(procEntry === 'S' ? { surgeonFee: String(t.surgeon), anaesFee: String(t.anaesthetist) } : { procedureFee: String(t.nonSurgical) }) } } : x))
    setProcEntry(null)
  }
  const clearAll = () => { setScreen(null); setForm(null); setMode('view'); setSelected(null); setTotals(false); setCaseNo(''); setMessage(null); setRemarks('') }
  const clearInvoice = () => {
    if (editing) setForm((x) => (x ? { ...empty(x.stayType), payTo: x.payTo } : x))
    else { setForm(null); setSelected(null); setTotals(false) }
  }
  const f = form
  const generic = f?.payTo === 'H' && !!f.hospital && (options.data?.genericHospitals ?? []).includes(f.hospital)
  const hospitalOptions: CaseOption[] = [...(hospitals.data ?? []), ...(f?.hospital && !(hospitals.data ?? []).some((h) => h.code === f.hospital) ? [{ code: f.hospital, name: sel?.payeeName ?? f.hospital }] : [])]
  // Legacy txtModal: a surgical case has no non-surgical frame and the other way round.
  const modality = screen?.case.modality?.trim() ?? ''
  const total = live?.total ?? 0
  const pay = total - (f?.payTo === 'H' ? num(f.excess) ?? 0 : 0)
  const lastVersion = screen ? Math.max(screen.nextVersion, ...screen.invoices.map((i) => i.version ?? 0)) : null
  // Legacy CmdAdd / CmdEdit: plans 2-5 take the new taxes in the R & B, ICU and guardian lines, other plans the old Tax line. HSS comes from its breakdown.
  const newTaxPlan = /^[2-5]/.test(screen?.case.planCode?.trim() ?? '')
  const locked = new Set(['services', 'surgeonFee', 'anaesFee', 'procedureFee', ...(newTaxPlan ? ['rbTaxOld', 'icuTaxOld', 'lodgerTaxOld'] : ['roomTax', 'icuTax', 'guardianTax'])])

  /** Legacy CmdTotal: every invoice of the case added together, the invoice numbers and dates listed. */
  const tv = useMemo(() => {
    if (!totals || !screen) return null
    const inv = screen.invoices
    const list = (xs: (string | null)[]) => xs.filter((x) => x).join(',')
    const sum = (g: (i: InvoiceEntry) => number) => round(inv.reduce((s, i) => s + g(i), 0))
    return {
      amounts: Object.fromEntries(fields.map((x) => [x.key, sum((i) => i.amounts[x.key] ?? 0)])),
      text: { invoiceNo: list(inv.map((i) => i.invoiceNo)), othersDescription: list(inv.map((i) => i.othersDescription)) } as Partial<Record<keyof Form, string>>,
      invoiceDates: list(inv.map((i) => formatDate(i.invoiceDate))), followUpDates: list(inv.map((i) => formatDate(i.followUpDate))),
      total: sum((i) => i.amount), pay: sum((i) => i.payAmount), paid: sum((i) => i.paidByMember),
    }
  }, [totals, screen, fields])
  const shown = !!f || !!tv

  /** Legacy txtInvDate_LostFocus / cboINVStayType_Click: pre- and post-treatment dates; a member's invoice over 60 days before admission is not covered at all. */
  const dateWarning = useMemo(() => {
    if (!editing || !f?.invoiceDate || !screen) return null
    const { admitted, discharged } = screen.case
    if (f.stayType === 'F' && discharged && f.invoiceDate < discharged) return { text: 'Post Treatment: Invoice date should not be earlier than discharge date!', blocked: false }
    if (f.stayType === 'P' && admitted) {
      if (f.invoiceDate > admitted) return { text: 'Pre-Hospitalisation: Invoice date should not be later than admission date!', blocked: false }
      if (f.payTo === 'M' && days(f.invoiceDate, admitted) > 60) return { text: 'More than 60 days before admitted! All invoices would not be covered anymore!', blocked: true }
    }
    return null
  }, [editing, f?.invoiceDate, f?.stayType, f?.payTo, screen])
  const blocked = !!dateWarning?.blocked

  /** Legacy txtInvDate_LostFocus: the receipt date follows the invoice date, and so does the follow-up date of a post-treatment (F) invoice. */
  const setInvoiceDate = (v: string) => set({ invoiceDate: v || null, ...(v ? { receiptDate: v, ...(f?.stayType === 'F' ? { followUpDate: v } : {}) } : {}) })
  const saveChecked = () => {
    setMessage(null)
    // Legacy SaveClaim: "Different Hospital. Do you want to Proceed?" when a hospital invoice is not for the case's hospital.
    const caseHospital = screen?.case.hospitalCode?.trim()
    if (f?.payTo === 'H' && f.hospital && caseHospital && f.hospital.trim() !== caseHospital) setOtherHospital(true)
    else save.mutate()
  }

  /** One amount box bound to a catalog field; computed fields show the live formula and cannot be typed in. */
  const A = (key: string, w = 80, bold = false) => {
    const fld = byKey[key]
    if (!fld) return null
    const computed = fld.kind === 'Computed'
    const value = tv ? (rateKeys.has(key) ? '-' : money(tv.amounts[key] ?? 0)) : computed ? money(live?.amounts[key] ?? null) : f?.amounts[key] ?? ''
    const readOnly = computed || !editing || locked.has(key)
    return (
      <TextField key={key} size="small" sx={{ ...box, width: w, ...(bold ? { '& input': { fontWeight: 600 } } : {}), ...(editing && readOnly ? { '& .MuiInputBase-root': { bgcolor: 'action.hover' } } : {}) }}
        title={fld.label} value={value} disabled={!shown} onChange={(e) => setAmount(key, e.target.value)}
        slotProps={{ input: { readOnly }, htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' }, 'aria-label': fld.label } }} />
    )
  }
  const T = (k: keyof Form, w: number, max: number) => (
    <TextField size="small" sx={{ ...box, width: w }} value={tv ? tv.text[k] ?? '' : (f?.[k] as string | null) ?? ''} disabled={!shown} onChange={(e) => set({ [k]: e.target.value } as Partial<Form>)}
      slotProps={{ input: { readOnly: !editing }, htmlInput: { maxLength: max } }} />
  )
  const flag = (k: string) => (
    <Checkbox size="small" sx={{ p: 0.25 }} disabled checked={f?.chargedToMember.includes(k) ?? false} title={options.data?.flags.find((x) => x.key === k)?.label}
      onChange={(e) => f && set({ chargedToMember: e.target.checked ? [...f.chargedToMember, k] : f.chargedToMember.filter((x) => x !== k) })} />
  )
  const right = (node: ReactNode) => <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>{node}</Box>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <Paper square sx={{ bgcolor: 'grey.800', color: 'common.white', py: 0.5, textAlign: 'center' }}><Typography sx={{ fontWeight: 700 }}>Invoice Processing</Typography></Paper>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {options.isError && <Alert severity="error">{(options.error as Error).message}</Alert>}
      {dateWarning && <Alert severity={dateWarning.blocked ? 'error' : 'warning'}>{dateWarning.text}</Alert>}

      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13 }}>Case Num</Typography>
        <TextField size="small" sx={{ ...box, width: 140 }} value={caseNo} onChange={(e) => setCaseNo(e.target.value)} slotProps={{ htmlInput: { maxLength: 20 } }}
          onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) go() }} />
        <Button size="small" variant="outlined" disabled={!caseNo.trim() || load.isPending || editing} onClick={() => go()}>Go</Button>
        <Button size="small" variant="outlined" disabled={editing} onClick={() => setSearching(true)}>Search</Button>
        <Button size="small" variant="outlined" disabled={!screen} onClick={() => navigate('/membership/enquiry')}>MBM Enq</Button>
        <Button size="small" variant="outlined" disabled={!screen} onClick={() => navigate('/cases/inquiry')}>Case Enq</Button>
        <Typography sx={{ fontSize: 13, ml: 1 }}>DOA</Typography>
        <TextField size="small" sx={{ ...box, width: 110 }} value={screen ? formatDate(screen.case.admitted) : ''} slotProps={{ input: { readOnly: true } }} />
        <Typography sx={{ fontSize: 13 }}>DOD</Typography>
        <TextField size="small" sx={{ ...box, width: 110 }} value={screen ? (screen.case.discharged ? formatDate(screen.case.discharged) : 'Not discharged') : ''} slotProps={{ input: { readOnly: true } }}
          error={!!screen && !screen.case.discharged} />
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 13 }}>Exc Paid</Typography>
        <TextField size="small" sx={{ ...box, width: 100 }} value={tv ? money(tv.paid) : sel ? money(sel.paidByMember) : ''} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} />
      </Paper>
      <CaseSearchDialog open={searching} onClose={() => setSearching(false)} onPick={(no) => { setSearching(false); setCaseNo(no); go(no) }} />

      <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2.2fr 1.2fr 1.2fr 1.2fr' } }}>
        <Box>
          <L label="Patient" w={70}><TextField size="small" fullWidth sx={box} value={screen?.case.patientName ?? screen?.case.memberName ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
          <L label="Stay Type" w={70}>
            <TextField select size="small" fullWidth sx={box} value={f?.stayType ?? ''} disabled={!editing} onChange={(e) => set({ stayType: e.target.value })}>
              {(options.data?.stayTypes ?? []).map((o) => <MenuItem key={o.code} value={o.code}>{o.code} - {o.name}</MenuItem>)}
            </TextField>
          </L>
          <L label="Pay To" w={70}>
            <TextField select size="small" fullWidth sx={box} value={f?.payTo ?? 'H'} disabled={!editing} onChange={(e) => set({ payTo: e.target.value as 'H' | 'M', hospital: null, hospitalName: null, excess: '0' })}>
              <MenuItem value="H">H - Hospital</MenuItem><MenuItem value="M">M - Member</MenuItem>
            </TextField>
          </L>
          <L label="Payee" w={70}>
            {f?.payTo === 'M' ? <TextField size="small" fullWidth sx={box} value="Member" disabled />
              : editing ? (
                <Autocomplete size="small" fullWidth options={hospitalOptions} value={hospitalOptions.find((h) => h.code === f?.hospital) ?? null}
                  getOptionLabel={(o) => `${o.code} - ${o.name}`} isOptionEqualToValue={(a, b) => a.code === b.code} filterOptions={(x) => x}
                  onInputChange={(_, v, reason) => { if (reason === 'input') setHospitalSearch(v) }} onChange={(_, v) => set({ hospital: v?.code ?? null })}
                  noOptionsText={hospitalSearch.trim().length < 2 ? 'Type 2+ characters' : 'No hospitals'} renderInput={(p) => <TextField {...p} sx={box} placeholder="Hospital to be paid" />} />
              ) : <TextField size="small" fullWidth sx={box} value={sel ? `${sel.payee ?? ''} - ${sel.payeeName ?? ''}` : ''} slotProps={{ input: { readOnly: true } }} />}
          </L>
          {(generic || (f?.hospitalName ?? '') !== '') && <L label="Hosp Name" w={70}>{T('hospitalName', 300, 100)}</L>}
        </Box>
        <Box>
          <L label="Cash Type" w={80}><TextField size="small" sx={box} value={f ? (f.payTo === 'M' ? 'Reimbursement' : 'Cashless') : ''} disabled slotProps={{ input: { readOnly: true } }} /></L>
          <L label="Treat. Mode" w={80}><TextField size="small" sx={box} value={{ S: 'S - Surgical', N: 'N - Non-Surgical', B: 'B - Both' }[modality] ?? modality} slotProps={{ input: { readOnly: true } }} /></L>
          <L label="Fol. Date" w={80}>{tv ? <TextField size="small" sx={box} value={tv.followUpDates} slotProps={{ input: { readOnly: true } }} />
            : <DateField sx={box} value={f?.followUpDate ?? ''} disabled={!editing} onChange={(v) => set({ followUpDate: v || null })} />}</L>
          <L label="Inv Num" w={80}>{T('invoiceNo', 150, 20)}</L>
        </Box>
        <Box>
          <L label="DIR" w={60}><DateField sx={box} value={f?.receiptDate ?? ''} disabled={!editing} onChange={(v) => set({ receiptDate: v || null })} /></L>
          <L label="IRM" w={60}>
            <TextField select size="small" fullWidth sx={box} value={f?.receiptMode ?? ''} disabled={!editing} onChange={(e) => set({ receiptMode: e.target.value || null })}>
              <MenuItem value="">&nbsp;</MenuItem>
              {(options.data?.receiptModes ?? []).map((o) => <MenuItem key={o.code} value={o.code}>{o.code} - {o.name}</MenuItem>)}
            </TextField>
          </L>
          <L label="Excess" w={60}>
            <TextField size="small" sx={{ ...box, width: 110 }} value={f?.excess ?? ''} disabled={!f || f.payTo === 'M'} onChange={(e) => set({ excess: e.target.value })}
              slotProps={{ input: { readOnly: !editing }, htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } } }} />
          </L>
          <L label="Inv Date" w={60}>{tv ? <TextField size="small" sx={box} value={tv.invoiceDates} slotProps={{ input: { readOnly: true } }} />
            : <DateField sx={box} value={f?.invoiceDate ?? ''} disabled={!editing} onChange={setInvoiceDate} />}</L>
        </Box>
        <Box>
          <L label="Total Inv" w={95}><TextField size="small" sx={{ ...cyan, width: 120 }} value={tv ? money(tv.total) : f ? money(total) : ''} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} /></L>
          <L label="Inv Pay. Amt" w={95}><TextField size="small" sx={{ ...cyan, width: 120 }} value={tv ? money(tv.pay) : f ? money(pay) : ''} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} /></L>
          <L label="Initial Inv Amt" w={95}>
            <TextField size="small" sx={{ ...box, width: 120 }} value={f?.initialAmount ?? ''} disabled={!f} onChange={(e) => set({ initialAmount: e.target.value })}
              slotProps={{ input: { readOnly: !editing }, htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } } }} />
          </L>
          <L label="Rev Bordx" w={95}>
            {/* Legacy cboRevBordx is never saved (picking Y only re-saved the invoice); the UHC box behind it is hidden. */}
            <TextField select size="small" sx={{ ...box, width: 120 }} value="" disabled title="Not used by the legacy form">
              <MenuItem value="">&nbsp;</MenuItem><MenuItem value="N">N - No</MenuItem><MenuItem value="Y">Y - Yes</MenuItem>
            </TextField>
          </L>
        </Box>
      </Paper>

      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 34, '& .MuiTab-root': { minHeight: 34, textTransform: 'none' } }}>
          <Tab label="Invoice Entry" /><Tab label="Reimbursement Not Cover" /><Tab label="Remarks" /><Tab label="General Info" /><Tab label="Documents" />
        </Tabs>
        <Box sx={{ p: 1 }}>
          {tab === 0 && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
                <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>
                  <Frame disabled={blocked}>
                    <L label="R & B" w={45}><Typography sx={blue}>Days</Typography>{A('boardDays', 55)}<Typography sx={blue}>Lmt</Typography>{A('roomRate', 75)}<Typography sx={blue}>Tax</Typography>{A('roomTax', 65)}<Typography sx={blue}>Amt</Typography>{A('roomAmount', 80)}{right(A('roomTotal', 90, true))}</L>
                    <L label="Gross RB" w={70}>{right(A('grossRoomBoard', 90))}</L>
                    <L label="ICU" w={45}><Typography sx={blue}>Days</Typography>{A('icuDays', 55)}<Typography sx={blue}>Lmt</Typography>{A('icuRate', 75)}<Typography sx={blue}>Tax</Typography>{A('icuTax', 65)}<Typography sx={blue}>Amt</Typography>{A('icuAmount', 80)}{right(A('icuTotal', 90, true))}</L>
                    <L label="HSS" w={45}>{A('services', 110)}<Button size="small" variant="outlined" sx={{ minWidth: 30, px: 0 }} disabled={!shown} onClick={() => setHss(true)} title="Hospital supplies & services breakdown">&gt;</Button>
                      <Typography sx={{ fontSize: 13 }}>MRI</Typography>{A('mri', 90)}<Typography sx={{ fontSize: 13 }}>OT</Typography>{A('theatre', 90)}</L>
                  </Frame>
                  <Frame disabled={blocked || (editing && modality === 'N')} title={editing && modality === 'N' ? 'Non-surgical case (Treat. Mode N)' : undefined}>
                    <L label="Pre-Hosp" w={70}><Typography sx={blue}>X-Ray</Typography>{A('preXray', 70)}<Typography sx={blue}>Lab</Typography>{A('preLab', 70)}<Typography sx={blue}>Oth</Typography>{A('preOthers', 70)}{right(A('preDiagnostic', 90, true))}</L>
                    <L label="Pre-Hos Spec" w={95}>{right(A('preSpecialist', 90))}</L>
                    <L label="Surgical" w={70}><Typography sx={blue}>Fee</Typography>{A('surgeonFee', 70)}<Button size="small" variant="outlined" sx={{ minWidth: 30, px: 0 }} disabled={!procs} title="Surgical procedures entry" onClick={() => setProcEntry('S')}>&gt;</Button><Typography sx={blue}>Phy</Typography>{A('surgeonPhysician', 70)}<Typography sx={blue}>Post</Typography>{A('surgeonPost', 70)}<Typography sx={blue}>Ward</Typography>{A('surgeonWard', 70)}{right(A('surgical', 90, true))}</L>
                    <L label="Ana Fees" w={70}><Typography sx={blue}>Fee</Typography>{A('anaesFee', 70)}<Typography sx={blue}>Cons</Typography>{A('anaesConsultation', 70)}<Typography sx={blue}>Ward</Typography>{A('anaesWard', 70)}{right(A('anaesthetist', 90, true))}</L>
                  </Frame>
                  <Frame disabled={blocked || (editing && modality === 'S')} title={editing && modality === 'S' ? 'Surgical case (Treat. Mode S)' : undefined}>
                    <L label="Pre-Hos" w={70}><Typography sx={blue}>X-Ray</Typography>{A('nsPreXray', 70)}<Typography sx={blue}>Lab</Typography>{A('nsPreLab', 70)}<Typography sx={blue}>Oth</Typography>{A('nsPreOthers', 70)}{right(A('nsPreDiagnostic', 90, true))}</L>
                    <L label="Pre-Hos Spec" w={95}>{right(A('nsPreSpecialist', 90))}</L>
                    <L label="Phy Fees" w={70}><Typography sx={blue}>Days</Typography>{A('physicianVisitDays', 50)}<Typography sx={blue}>Ward</Typography>{A('physicianWard', 70)}<Typography sx={blue}>Fee</Typography>{A('physicianFee', 70)}<Typography sx={blue}>Proc</Typography>{A('procedureFee', 70)}<Button size="small" variant="outlined" sx={{ minWidth: 30, px: 0 }} disabled={!procs} title="Non-surgical procedures entry" onClick={() => setProcEntry('N')}>&gt;</Button>{right(A('inHospitalPhysician', 90, true))}</L>
                    <L label="Post Hos Treat" w={95}>{right(A('nsPostTreatment', 90))}</L>
                  </Frame>
                </Box>
                <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>
                  <Frame disabled={blocked}>
                    <L label="Accident" w={70}>{A('accidentEmergency', 80)}<Typography sx={{ fontSize: 13 }}>Post-Treat</Typography>{A('accidentPostTreatment', 80)}{right(A('accidentPostAmount', 90))}</L>
                    <L label="Ambulance Fee" w={200}>{right(A('ambulance', 90))}</L>
                    <L label="Outpatient Physiotherapy Treatment" w={240}>{right(A('physiotherapy', 90))}</L>
                    <L label="Kidney Dialysis" w={110}>{A('kidneyMonths', 60)}<Typography sx={blue}>Month(s)</Typography>{right(A('kidney', 90))}</L>
                    <L label="Cancer Treatment" w={200}>{right(A('cancer', 90))}</L>
                    <L label="Home Nursing Care" w={200}>{right(A('homeNursing', 90))}</L>
                  </Frame>
                  <Frame disabled={blocked}>
                    <L label="Organ Trans" w={120}>{right(<>{A('organ', 90)}<Box sx={{ width: 26 }} /></>)}</L>
                    <L label="Medical Rpt" w={120}>{right(<>{A('medicalReport', 90)}{flag('medicalReportByMember')}</>)}</L>
                    <L label="Tel. Charges" w={120}>{right(<>{A('phone', 90)}{flag('phoneByMember')}</>)}</L>
                    <L label="Gua. Allow." w={75}><Typography sx={blue}>Days</Typography>{A('guardianDays', 45)}<Typography sx={blue}>Rate</Typography>{A('guardianRate', 60)}<Typography sx={blue}>Tax</Typography>{A('guardianTax', 55)}<Typography sx={blue}>Amt</Typography>{A('guardianAmount', 70)}
                      {right(<>{A('guardianTotal', 90, true)}{flag('guardianByMember')}</>)}</L>
                    <L label="Admin/Reg." w={120}>{right(<>{A('admin', 90)}{flag('adminByMember')}</>)}</L>
                    <L label="Tax" w={40}><Typography sx={blue}>R&amp;B</Typography>{A('rbTaxOld', 65)}<Typography sx={blue}>ICU</Typography>{A('icuTaxOld', 65)}<Typography sx={blue}>Lodger</Typography>{A('lodgerTaxOld', 65)}{right(<>{A('tax', 90, true)}<Box sx={{ width: 26 }} /></>)}</L>
                    <L label="Others" w={120}>{T('othersDescription', 200, 100)}{right(<>{A('others1', 90)}{flag('othersByMember')}</>)}</L>
                    <L label="Others (No Co-Pay)" w={120}>{T('othersNoCoPayDescription', 200, 50)}{right(<>{A('othersNoCoPay', 90)}<Box sx={{ width: 26 }} /></>)}</L>
                    <L label="GH Income" w={75}><Typography sx={blue}>Rate</Typography>{A('cashRate', 70)}<Typography sx={blue}>Days</Typography>{A('cashDays', 50)}{right(<>{A('cashAllowance', 90, true)}<Box sx={{ width: 26 }} /></>)}</L>
                  </Frame>
                </Box>
              </Box>

              <Box sx={{ border: '1px solid', borderColor: 'divider', maxHeight: 220, overflow: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.75, py: 0.25, whiteSpace: 'nowrap', textAlign: 'left' }, '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0 } }}>
                  <thead><tr>{['Bordx', 'WS', 'WS No', 'Inv No', 'Inv Date', 'INV Amount', 'Pay To', 'Payee', 'Fol. Up Date', 'Prepared By', 'Prepared Date', 'MRI'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {screen?.invoices.map((r) => (
                      <Box component="tr" key={r.index} onClick={() => pick(r)} sx={{ cursor: editing ? 'default' : 'pointer', bgcolor: r.index === selected ? 'action.selected' : undefined, '&:hover': { bgcolor: 'action.hover' } }}>
                        <td>{r.inBordx ? 'True' : 'False'}</td><td>{r.inWorksheet ? 'True' : 'False'}</td><td>{r.version}</td><td>{r.invoiceNo}</td><td>{formatDate(r.invoiceDate)}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(r.amount)}</td><td>{r.payTo}</td><td>{r.payeeName}</td><td>{formatDate(r.followUpDate)}</td><td>{r.enteredBy}</td><td>{formatDate(r.enteredDate)}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(r.amounts.mri ?? 0)}</td>
                      </Box>
                    ))}
                    {screen && screen.invoices.length === 0 && <tr><td colSpan={12}>No invoices for this case. Click Add to enter one.</td></tr>}
                  </tbody>
                </Box>
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Frame disabled={blocked}>
              <Typography variant="subtitle2">Reimbursement Not-Payable</Typography>
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1.6fr' }, maxWidth: 1000 }}>
                <Box>
                  {([['Pre-hosp > 60', 'notPreOver60'], ['GP fee', 'notGp'], ['Pre - Medicine', 'notPreMedicine'], ['Medical Report', 'notMedicalReport']] as const).map(([l, k]) => <L key={k} label={l} w={150}>{A(k, 100)}</L>)}
                </Box>
                <Box>
                  {([['Pre-hosp Specialist Fee > 1', 'notPreSpecialist'], ['Post Hosp > 31 days', 'notPostOver31'], ['Not Same Physician', 'notSamePhysician']] as const).map(([l, k]) => <L key={k} label={l} w={190}>{right(A(k, 100))}</L>)}
                  <L label="Others" w={70}>{T('notPayableRemark', 240, 80)}{right(A('notOthers', 100))}</L>
                </Box>
              </Box>
            </Frame>
          )}

          {tab === 2 && (
            <Box sx={{ display: 'grid', gap: 1, maxWidth: 800 }}>
              <TextField label="Remarks" multiline minRows={4} value={remarks} disabled={!screen} onChange={(e) => setRemarks(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
              <Box><Button variant="outlined" disabled={!screen || saveRemarks.isPending} onClick={() => saveRemarks.mutate()}>Save Remarks</Button></Box>
            </Box>
          )}

          {tab === 3 && (screen ? (
            <Box sx={{ display: 'grid', gap: 0.5, maxWidth: 600 }}>
              {([[['Mem Num', screen.case.memberNumber], ['Policy Num', screen.case.policyNo]], [['Mem Name', screen.case.memberName]],
                [['Eff Date', formatDate(screen.case.policyEffective)], ['Exp Date', formatDate(screen.case.policyExpiry)]],
                [['Pol Status', screen.case.policyStatus], ['Patient DOB', formatDate(screen.case.memberDob)]], [['Hospital', screen.case.hospitalName]]] as [string, string | null | undefined][][]).map((row) => (
                <Box key={row[0][0]} sx={{ display: 'flex', gap: 2 }}>
                  {row.map(([l, v]) => (
                    <Box key={l} sx={{ flex: 1 }}>
                      <L label={l} w={90}><TextField size="small" fullWidth sx={l === 'Pol Status' ? { ...yellow, '& input': { color: 'error.main' } } : box} value={v ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          ) : <Typography color="text.secondary">Show a case first.</Typography>)}

          {tab === 4 && (screen ? <ScannedDocumentsTab number={screen.case.caseNumber} /> : <Typography color="text.secondary">Show a case first.</Typography>)}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="outlined" disabled={!screen || editing || screen.invoices.length === 0} onClick={() => { setSelected(null); setForm(null); setTotals(true) }}>Total</Button>
        {mode === 'edit'
          ? <Button variant="contained" disabled={save.isPending} onClick={saveChecked}>Update</Button>
          : <Button variant="outlined" disabled={!sel || editing || sel.inBordx} title={sel?.inBordx ? 'On a bordereau' : sel?.inWorksheet ? 'In a worksheet: run Worksheet Adjustment afterwards' : ''}
              onClick={() => { setMode('edit'); setTab(0) }}>Edit</Button>}
        {mode === 'new'
          ? <Button variant="contained" disabled={save.isPending} onClick={saveChecked}>Save</Button>
          : <Button variant="outlined" disabled={!screen || !options.data || editing} onClick={startNew}>Add</Button>}
        <Button variant="outlined" color="error" disabled={!sel || editing || sel.inWorksheet} title={sel?.inWorksheet ? 'Used in a worksheet' : ''} onClick={() => sel && setRemoving(sel)}>Remove</Button>
        <Button variant="outlined" disabled={!editing || save.isPending} onClick={cancel}>Cancel</Button>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 13 }}>Ver</Typography>
        <TextField size="small" sx={{ ...yellow, width: 50 }} value={sel?.version ?? (mode === 'new' ? screen?.nextVersion ?? '' : '')} slotProps={{ input: { readOnly: true } }} />
        <Typography sx={{ fontSize: 13 }}>of</Typography>
        <TextField size="small" sx={{ ...yellow, width: 50 }} value={lastVersion ?? ''} slotProps={{ input: { readOnly: true } }} />
        <Typography sx={{ fontSize: 13 }}>Bordx?</Typography>
        <TextField size="small" sx={{ ...yellow, width: 55 }} value={sel ? (sel.inBordx ? 'Yes' : 'No') : ''} slotProps={{ input: { readOnly: true } }} />
        <Typography sx={{ fontSize: 13 }}>WS?</Typography>
        <TextField size="small" sx={{ ...yellow, width: 55 }} value={sel ? (sel.inWorksheet ? 'Yes' : 'No') : ''} slotProps={{ input: { readOnly: true } }} />
        <Button variant="outlined" disabled={!screen || save.isPending} onClick={clearInvoice}>Clear Inv</Button>
        <Button variant="outlined" disabled={editing} onClick={clearAll}>Clear All</Button>
        <Button variant="outlined" onClick={() => navigate('/')}>Exit</Button>
      </Paper>

      <Dialog open={hss} onClose={() => setHss(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Hospital Supplies &amp; Services</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 0.5 }}>
          {fields.filter((x) => x.key.startsWith('hss')).map((x) => <L key={x.key} label={x.label} w={170}>{right(A(x.key, 110))}</L>)}
          <Typography variant="caption" color="text.secondary">HSS on the form is the total of this breakdown.</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setHss(false)}>Close</Button></DialogActions>
      </Dialog>
      {procEntry && procs && screen && (
        <ProcedureEntryDialog kind={procEntry} caseNumber={screen.case.caseNumber} value={procs.value} rates={procs.rates} editable={editing && !!form}
          onSave={saveProcedures} onClose={() => setProcEntry(null)} />
      )}
      <ConfirmDialog open={otherHospital} busy={save.isPending} title="Invoice Processing" message="Different Hospital. Do you want to Proceed?"
        onConfirm={() => { setOtherHospital(false); save.mutate() }} onCancel={() => setOtherHospital(false)} />
      <ConfirmDialog open={!!removing} busy={remove.isPending} title="Remove invoice" message={`Remove invoice ${removing?.invoiceNo} (${formatMoney(removing?.amount)})?`}
        onConfirm={() => removing && remove.mutate(removing)} onCancel={() => setRemoving(null)} />
    </Box>
  )
}
