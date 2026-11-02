import { Alert, Autocomplete, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { CaseOption } from '../../api/caseRegistration'
import { computeInvoice, invoiceApi, type InvoiceEntry, type InvoiceField, type InvoiceRequest, type InvoiceScreen } from '../../api/invoices'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Field, FieldGrid, RowsTable } from '../../components/DataTables'
import { DateField } from '../../components/DateField'
import { formatDate, formatMoney } from '../../lib/format'

type Form = Omit<InvoiceRequest, 'amounts' | 'excess' | 'initialAmount'> & { amounts: Record<string, string>; excess: string; initialAmount: string }

const empty = (stayType: string): Form => ({
  invoiceNo: '', invoiceDate: null, payTo: 'H', stayType, hospital: null, hospitalName: null, receiptMode: null, receiptDate: null, followUpDate: null,
  excess: '0', initialAmount: '', uhcNo: null, amounts: {}, chargedToMember: [], othersDescription: null, others2Description: null, othersNoCoPayDescription: null, notPayableRemark: null,
})

const num = (s: string | undefined) => (s == null || s.trim() === '' ? null : Number(s))
const text = (s: string | null) => (s == null || s.trim() === '' ? null : s.trim())

function fromEntry(e: InvoiceEntry, fields: InvoiceField[]): Form {
  return {
    invoiceNo: e.invoiceNo, invoiceDate: e.invoiceDate, payTo: e.payTo === 'M' ? 'M' : 'H', stayType: e.stayType ?? '', hospital: e.payTo === 'M' ? null : e.payee,
    hospitalName: e.hospitalName, receiptMode: e.receiptMode, receiptDate: e.receiptDate, followUpDate: e.followUpDate, excess: String(e.excess), initialAmount: e.initialAmount == null ? '' : String(e.initialAmount),
    uhcNo: e.uhcNo, chargedToMember: e.chargedToMember, othersDescription: e.othersDescription, others2Description: e.others2Description,
    othersNoCoPayDescription: e.othersNoCoPayDescription, notPayableRemark: e.notPayableRemark,
    amounts: Object.fromEntries(fields.filter((f) => f.kind !== 'Computed' && e.amounts[f.key]).map((f) => [f.key, String(e.amounts[f.key])])),
  }
}

/** Legacy: Invoice > Invoice Processing (frmInvoice). Records a case's hospital or member invoices, with every benefit amount, against the next worksheet version. */
export function InvoiceProcessingPage() {
  const options = useQuery({ queryKey: ['invoice-options'], queryFn: invoiceApi.options })
  const [caseNo, setCaseNo] = useState('')
  const [screen, setScreen] = useState<InvoiceScreen | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [removing, setRemoving] = useState<InvoiceEntry | null>(null)
  const [remarks, setRemarks] = useState('')
  const [hospitalSearch, setHospitalSearch] = useState('')
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null)
  const fail = (e: unknown) => setMessage({ severity: 'error', text: (e as Error).message })

  const hospitals = useQuery({ queryKey: ['invoice-hospitals', hospitalSearch], queryFn: () => invoiceApi.hospitals(hospitalSearch), enabled: form?.payTo === 'H' && hospitalSearch.trim().length >= 2 })
  const fields = useMemo(() => options.data?.fields ?? [], [options.data])
  const groups = useMemo(() => [...new Set(fields.map((f) => f.group))], [fields])
  const enteredAmounts = useMemo(() => Object.fromEntries(Object.entries(form?.amounts ?? {}).map(([k, v]) => [k, num(v)])), [form?.amounts])
  const live = useMemo(() => (fields.length ? computeInvoice(fields, enteredAmounts) : null), [fields, enteredAmounts])

  const load = useMutation({
    mutationFn: (no: string) => invoiceApi.get(no),
    onSuccess: (s) => { setScreen(s); setRemarks(s.remarks ?? ''); setForm(null); setEditing(null) },
    onError: (e) => { setScreen(null); fail(e) },
  })
  const reload = () => screen && load.mutate(screen.case.caseNumber)

  const request = (f: Form): InvoiceRequest => ({
    ...f, invoiceNo: f.invoiceNo.trim(), hospital: f.payTo === 'H' ? f.hospital : null, hospitalName: text(f.hospitalName), uhcNo: text(f.uhcNo), receiptMode: f.receiptMode || null,
    excess: num(f.excess), initialAmount: num(f.initialAmount), amounts: Object.fromEntries(Object.entries(f.amounts).map(([k, v]) => [k, num(v)])),
    othersDescription: text(f.othersDescription), others2Description: text(f.others2Description), othersNoCoPayDescription: text(f.othersNoCoPayDescription), notPayableRemark: text(f.notPayableRemark),
  })
  const save = useMutation({
    mutationFn: () => editing == null ? invoiceApi.create(screen!.case.caseNumber, request(form!)) : invoiceApi.update(screen!.case.caseNumber, editing, request(form!)),
    onSuccess: (e) => {
      setMessage({ severity: 'success', text: `Invoice ${e.invoiceNo} saved: ${formatMoney(e.amount)} (worksheet version ${e.version}).${e.inWorksheet ? ' It is in a saved worksheet: recalculate it in Worksheet Adjustment.' : ''}` })
      reload()
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

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const setAmount = (key: string, value: string) => setForm((f) => (f ? { ...f, amounts: { ...f.amounts, [key]: value } } : f))
  const totals = screen?.invoices.reduce((t, i) => ({ amount: t.amount + i.amount, pay: t.pay + i.payAmount }), { amount: 0, pay: 0 })
  const generic = form?.payTo === 'H' && !!form.hospital && (options.data?.genericHospitals ?? []).includes(form.hospital)
  const hospitalOptions: CaseOption[] = [...(hospitals.data ?? []), ...(form?.hospital && !(hospitals.data ?? []).some((h) => h.code === form.hospital) ? [{ code: form.hospital, name: form.hospital }] : [])]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Invoice Processing</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {options.isError && <Alert severity="error">{(options.error as Error).message}</Alert>}

      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" label="Case Num" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} slotProps={{ htmlInput: { maxLength: 20 } }}
          onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) { setMessage(null); load.mutate(caseNo) } }} />
        <Button variant="contained" disabled={!caseNo.trim() || load.isPending} onClick={() => { setMessage(null); load.mutate(caseNo) }}>Show</Button>
        {screen && <Chip label={`New invoices go to worksheet version ${screen.nextVersion}`} />}
      </Paper>

      {screen && (
        <>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <FieldGrid>
              <Field label="Case Num" value={screen.case.caseNumber} /><Field label="Mem Num" value={screen.case.memberNumber} /><Field label="Mem Name" value={screen.case.memberName} />
              <Field label="Policy Num" value={screen.case.policyNo} /><Field label="Plan" value={screen.case.planCode} /><Field label="Hospital" value={screen.case.hospitalName ?? screen.case.hospitalCode} />
              <Field label="DOA" value={formatDate(screen.case.admitted)} /><Field label="DOD" value={screen.case.discharged ? formatDate(screen.case.discharged) : <Typography color="error" variant="body2">Not discharged</Typography>} />
            </FieldGrid>
          </Paper>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>Invoices{totals && screen.invoices.length > 0 ? ` — total ${formatMoney(totals.amount)}, payable ${formatMoney(totals.pay)}` : ''}</Typography>
            <Button variant="contained" disabled={!options.data || !!form} onClick={() => { setEditing(null); setForm(empty(screen.case.stayType?.[0] ?? 'I')) }}>Add Invoice</Button>
          </Box>
          <RowsTable rows={screen.invoices} empty="No invoices for this case." columns={[
            { header: 'Inv Num', cell: (r) => r.invoiceNo }, { header: 'Inv Date', cell: (r) => formatDate(r.invoiceDate) }, { header: 'Pay To', cell: (r) => (r.payTo === 'M' ? 'Member' : 'Hospital') },
            { header: 'Payee', cell: (r) => r.hospitalName ?? r.payeeName }, { header: 'Amount', align: 'right', cell: (r) => formatMoney(r.amount) },
            { header: 'Excess', align: 'right', cell: (r) => formatMoney(r.excess) }, { header: 'Payable', align: 'right', cell: (r) => formatMoney(r.payAmount) },
            { header: 'WS Ver', cell: (r) => r.version }, { header: 'Status', cell: (r) => (r.inBordx ? 'Bordx' : r.inWorksheet ? 'Worksheet' : 'Open') },
            { header: 'Entered', cell: (r) => `${r.enteredBy ?? ''} ${formatDate(r.enteredDate)}` },
            { header: '', cell: (r) => (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button size="small" disabled={r.inBordx || !!form} title={r.inBordx ? 'On a bordereau' : r.inWorksheet ? 'In a worksheet: use Worksheet Adjustment afterwards' : ''} onClick={() => { setEditing(r.index); setForm(fromEntry(r, fields)) }}>Edit</Button>
                <Button size="small" color="error" disabled={r.inWorksheet || !!form} title={r.inWorksheet ? 'Used in a worksheet' : ''} onClick={() => setRemoving(r)}>Remove</Button>
              </Box>) },
          ]} />

          {form && options.data && (
            <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle1">{editing == null ? 'New invoice' : `Edit invoice ${form.invoiceNo}`}</Typography>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
                <TextField select size="small" label="Pay To" required value={form.payTo} onChange={(e) => set({ payTo: e.target.value as 'H' | 'M', hospital: null, hospitalName: null, excess: '0' })}>
                  <MenuItem value="H">H - Hospital (Cashless)</MenuItem><MenuItem value="M">M - Member (Reimbursement)</MenuItem>
                </TextField>
                <TextField select size="small" label="Stay Type" required value={form.stayType} onChange={(e) => set({ stayType: e.target.value })}>
                  {options.data.stayTypes.map((o) => <MenuItem key={o.code} value={o.code}>{o.code} - {o.name}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Inv Num" required value={form.invoiceNo} onChange={(e) => set({ invoiceNo: e.target.value })} slotProps={{ htmlInput: { maxLength: 20 } }} />
                <DateField label="Inv Date" required value={form.invoiceDate ?? ''} onChange={(v) => set({ invoiceDate: v || null })} />
                {form.payTo === 'H' ? (
                  <Autocomplete size="small" options={hospitalOptions} value={hospitalOptions.find((h) => h.code === form.hospital) ?? null}
                    getOptionLabel={(o) => `${o.code} - ${o.name}`} isOptionEqualToValue={(a, b) => a.code === b.code} filterOptions={(x) => x}
                    onInputChange={(_, v, reason) => { if (reason === 'input') setHospitalSearch(v) }} onChange={(_, v) => set({ hospital: v?.code ?? null })}
                    noOptionsText={hospitalSearch.trim().length < 2 ? 'Type 2+ characters' : 'No hospitals'}
                    renderInput={(p) => <TextField {...p} label="Hospital to be paid" required />} />
                ) : <TextField size="small" label="Payee" value="Member" disabled />}
                <TextField size="small" label="Hosp Name" required={generic} value={form.hospitalName ?? ''} onChange={(e) => set({ hospitalName: e.target.value })}
                  helperText={generic ? 'Enter the real hospital or clinic name' : undefined} slotProps={{ htmlInput: { maxLength: 100 } }} />
                <TextField size="small" label="Excess" type="number" required={form.payTo === 'H'} disabled={form.payTo === 'M'} value={form.excess} onChange={(e) => set({ excess: e.target.value })} />
                <TextField size="small" label="Initial Inv Amt" type="number" required value={form.initialAmount} onChange={(e) => set({ initialAmount: e.target.value })} />
                <TextField select size="small" label="Receipt Mode" required={form.payTo === 'M'} value={form.receiptMode ?? ''} onChange={(e) => set({ receiptMode: e.target.value || null })}>
                  <MenuItem value="">&nbsp;</MenuItem>
                  {options.data.receiptModes.map((o) => <MenuItem key={o.code} value={o.code}>{o.code} - {o.name}</MenuItem>)}
                </TextField>
                <DateField label="Receipt Date (DIR)" required={form.payTo === 'M'} value={form.receiptDate ?? ''} onChange={(v) => set({ receiptDate: v || null })} />
                <DateField label="Fol. Date" value={form.followUpDate ?? ''} onChange={(v) => set({ followUpDate: v || null })} />
                <TextField size="small" label="IRM" value={form.uhcNo ?? ''} onChange={(e) => set({ uhcNo: e.target.value })} slotProps={{ htmlInput: { maxLength: 10 } }} />
              </Box>

              {groups.map((g) => (
                <Box key={g}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{g}</Typography>
                  <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' } }}>
                    {fields.filter((f) => f.group === g).map((f) => f.kind === 'Computed'
                      ? <TextField key={f.key} size="small" label={f.label} value={formatMoney(live?.amounts[f.key] ?? 0)} disabled slotProps={{ inputLabel: { shrink: true } }} />
                      : <TextField key={f.key} size="small" type="number" label={f.label} value={form.amounts[f.key] ?? ''} onChange={(e) => setAmount(f.key, e.target.value)}
                          slotProps={{ htmlInput: { min: 0, step: f.kind === 'Days' ? 1 : 0.01 } }} />)}
                    {g === 'Others' && <>
                      <TextField size="small" label="Others description" value={form.othersDescription ?? ''} onChange={(e) => set({ othersDescription: e.target.value })} slotProps={{ htmlInput: { maxLength: 100 } }} />
                      <TextField size="small" label="Others 2 description" value={form.others2Description ?? ''} onChange={(e) => set({ others2Description: e.target.value })} slotProps={{ htmlInput: { maxLength: 100 } }} />
                      <TextField size="small" label="No co-pay description" value={form.othersNoCoPayDescription ?? ''} onChange={(e) => set({ othersNoCoPayDescription: e.target.value })} slotProps={{ htmlInput: { maxLength: 50 } }} />
                    </>}
                    {g === 'Reimbursement not payable' && <TextField size="small" label="Remark" value={form.notPayableRemark ?? ''} onChange={(e) => set({ notPayableRemark: e.target.value })} slotProps={{ htmlInput: { maxLength: 80 } }} />}
                  </Box>
                  {g === 'Others' && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                      {options.data!.flags.map((fl) => (
                        <FormControlLabel key={fl.key} label={fl.label} control={<Checkbox size="small" checked={form.chargedToMember.includes(fl.key)}
                          onChange={(e) => set({ chargedToMember: e.target.checked ? [...form.chargedToMember, fl.key] : form.chargedToMember.filter((k) => k !== fl.key) })} />} />
                      ))}
                    </Box>
                  )}
                </Box>
              ))}

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle1">Invoice amount {formatMoney(live?.total ?? 0)}</Typography>
                <Typography>Payable {formatMoney((live?.total ?? 0) - (form.payTo === 'H' ? num(form.excess) ?? 0 : 0))}</Typography>
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => { setForm(null); setEditing(null) }} disabled={save.isPending}>Cancel</Button>
                <Button variant="contained" disabled={save.isPending} onClick={() => { setMessage(null); save.mutate() }}>{editing == null ? 'Save' : 'Update'}</Button>
              </Box>
            </Paper>
          )}

          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <TextField size="small" label="Remarks" multiline minRows={2} fullWidth value={remarks} onChange={(e) => setRemarks(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
            <Button variant="outlined" disabled={saveRemarks.isPending} onClick={() => saveRemarks.mutate()}>Save Remarks</Button>
          </Paper>
        </>
      )}

      <ConfirmDialog open={!!removing} busy={remove.isPending} title="Remove invoice" message={`Remove invoice ${removing?.invoiceNo} (${formatMoney(removing?.amount)})?`}
        onConfirm={() => removing && remove.mutate(removing)} onCancel={() => setRemoving(null)} />
    </Box>
  )
}
