import { Alert, Box, Button, MenuItem, Paper, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { caseAuditReviewApi, type CaseAuditRequest, type CaseAuditView } from '../../api/caseMenu'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { Field, FieldGrid, RowsTable } from '../../components/DataTables'
import { formatDate, formatMoney } from '../../lib/format'

type Form = Record<'status' | 'discountType' | 'invoiceNo' | 'invoiceDate' | 'invoiceAmount' | 'letterSent' | 'hospitalReply' | 'visitDate' | 'visitTime' | 'officer' | 'visitRemarks' | 'discountReceived' | 'dateToClaims' | 'openDate' | 'answer' | 'remarks' | 'reviewAudit', string>
const blank: Form = { status: '', discountType: '', invoiceNo: '', invoiceDate: '', invoiceAmount: '', letterSent: '', hospitalReply: '', visitDate: '', visitTime: '', officer: '', visitRemarks: '', discountReceived: '', dateToClaims: '', openDate: '', answer: '', remarks: '', reviewAudit: '' }

function toForm(v: CaseAuditView): Form {
  const a = v.audit
  if (!a) return blank
  const s = (x: string | number | null | undefined) => (x === null || x === undefined ? '' : String(x))
  return {
    status: a.status, discountType: a.discountType, invoiceNo: s(a.invoiceNo), invoiceDate: s(a.invoiceDate), invoiceAmount: s(a.invoiceAmount), letterSent: s(a.letterSent), hospitalReply: s(a.hospitalReply), visitDate: s(a.visitDate),
    visitTime: s(a.visitTime), officer: s(a.officer), visitRemarks: s(a.visitRemarks), discountReceived: s(a.discountReceived), dateToClaims: s(a.dateToClaims), openDate: s(a.openDate), answer: s(a.answer), remarks: s(a.remarks), reviewAudit: s(a.reviewAudit),
  }
}

function toRequest(f: Form): CaseAuditRequest {
  const t = (x: string) => (x.trim() === '' ? null : x.trim())
  const n = (x: string) => (x.trim() === '' ? null : Number(x))
  return {
    status: f.status, discountType: f.discountType, invoiceNo: t(f.invoiceNo), invoiceDate: t(f.invoiceDate), invoiceAmount: n(f.invoiceAmount), letterSent: t(f.letterSent), hospitalReply: t(f.hospitalReply), visitDate: t(f.visitDate),
    visitTime: t(f.visitTime), officer: t(f.officer), visitRemarks: t(f.visitRemarks), discountReceived: n(f.discountReceived), dateToClaims: t(f.dateToClaims), openDate: t(f.openDate), answer: t(f.answer), remarks: t(f.remarks), reviewAudit: t(f.reviewAudit),
  }
}

/** Legacy: Case > Case Audit Review (frmCaseAuditReview). Records the hospital-invoice audit of a case (CASAuditReview) and its status on the case cross reference. */
export function CaseAuditReviewPage() {
  const [caseNo, setCaseNo] = useState('')
  const [view, setView] = useState<CaseAuditView | null>(null)
  const [f, setF] = useState<Form>(blank)
  const [tab, setTab] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)

  const load = useMutation({
    mutationFn: (c: string) => caseAuditReviewApi.get(c),
    onSuccess: (v) => { setView(v); setCaseNo(v.caseNumber); setF(toForm(v)); setMessage(null) },
    onError: (e) => { setView(null); setF(blank); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const step = useMutation({
    mutationFn: (kind: 'next' | 'prev' | 'nextReviewed') => kind === 'prev' ? caseAuditReviewApi.previous(caseNo.trim()) : caseAuditReviewApi.next(caseNo.trim(), kind === 'nextReviewed'),
    onSuccess: (r) => load.mutate(r.caseNumber),
    onError: (e) => setMessage({ severity: 'warning', text: (e as Error).message }),
  })
  const save = useMutation({
    mutationFn: () => caseAuditReviewApi.save(view!.caseNumber, toRequest(f)),
    onSuccess: (r) => { setConfirming(false); setMessage({ severity: 'success', text: r.updated ? 'Record is Updated!' : 'Record is Saved!' }); load.mutate(view!.caseNumber) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const date = (k: keyof Form, label: string) => <DateField label={label} value={f[k]} onChange={(iso) => setF((x) => ({ ...x, [k]: iso }))} sx={{ width: 160 }} />
  const text = (k: keyof Form, label: string, width = 200, max = 255) => <TextField size="small" label={label} value={f[k]} onChange={set(k)} sx={{ width }} slotProps={{ htmlInput: { maxLength: max }, inputLabel: { shrink: true } }} />
  const money = (k: keyof Form, label: string) => <TextField size="small" type="number" label={label} value={f[k]} onChange={set(k)} sx={{ width: 150 }} slotProps={{ htmlInput: { min: 0, step: '0.01' }, inputLabel: { shrink: true } }} />
  const canSave = !!view && (f.status === 'C' || f.status === 'O') && (f.discountType === 'A' || f.discountType === 'B') && (f.visitTime === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(f.visitTime))
  const c = view?.case; const m = c?.member; const form = c?.form

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Audit Review</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField size="small" label="Case Num" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) load.mutate(caseNo.trim()) }} slotProps={{ htmlInput: { maxLength: 15 } }} />
        <Button variant="contained" disabled={!caseNo.trim() || load.isPending} onClick={() => load.mutate(caseNo.trim())}>Go</Button>
        <Button variant="outlined" disabled={!caseNo.trim() || step.isPending} onClick={() => step.mutate('prev')}>Prev</Button>
        <Button variant="outlined" disabled={step.isPending} onClick={() => step.mutate('next')}>Next</Button>
        <Button variant="outlined" disabled={step.isPending} onClick={() => step.mutate('nextReviewed')}>Next Rev Case</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" color="secondary" disabled={!canSave || save.isPending} onClick={() => setConfirming(true)}>Update</Button>
      </Paper>
      {view && (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <FieldGrid>
            <Field label="Mem Num" value={form?.memberNumber} /><Field label="Mem Name" value={m?.name} /><Field label="Patient" value={`${form?.patientId ?? ''} ${c?.patientName ?? ''}`} />
            <Field label="Case Status" value={c?.status} /><Field label="Claimability" value={form?.claimability} /><Field label="Hospital" value={c?.hospitalName ?? form?.hospitalCode} />
            <Field label="D.O.A" value={formatDate(form?.dateAdmitted)} /><Field label="D.O.D" value={formatDate(form?.dateDischarge)} />
            <Field label="Last update" value={view.audit?.updatedBy ? `${view.audit.updatedBy} ${formatDate(view.audit.updated)}` : 'No audit review yet'} />
          </FieldGrid>
        </Paper>
      )}
      <Tabs value={tab} onChange={(_, v) => setTab(v)}><Tab label="Audit Review" /><Tab label="General Info" disabled={!view} /><Tab label="Case Details" disabled={!view} /></Tabs>
      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, opacity: view ? 1 : 0.5, pointerEvents: view ? 'auto' : 'none' }}>
          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Audit Review Status" required value={f.status} onChange={set('status')} sx={{ width: 200 }}><MenuItem value="C">C - Close</MenuItem><MenuItem value="O">O - Open</MenuItem></TextField>
            <TextField select size="small" label="Discount Type" required value={f.discountType} onChange={set('discountType')} sx={{ width: 280 }}><MenuItem value="A">A - Discount in main bordx</MenuItem><MenuItem value="B">B - Discount in reverse bordx</MenuItem></TextField>
            {date('openDate', 'Date Open')}
            {text('invoiceNo', 'Inv Number')}{date('invoiceDate', 'Invoice Date')}{money('invoiceAmount', 'Inv Amount')}
            {date('letterSent', 'Date Letter Sent')}{date('hospitalReply', 'Date Letter Reply')}
            {money('discountReceived', 'Discount Received')}{date('dateToClaims', 'Date to Claims')}
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ width: '100%' }}>Hospital Visit</Typography>
            {date('visitDate', 'D.O.Visit')}{text('visitTime', 'Time (hh:mm)', 120, 5)}{text('officer', 'Off-in-Charge', 220)}{text('visitRemarks', 'Remarks', 420)}
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {text('answer', 'Answer', 420)}{text('remarks', 'Remarks', 420)}
            <TextField size="small" label="Audit Review" multiline minRows={3} value={f.reviewAudit} onChange={set('reviewAudit')} sx={{ width: '100%' }} slotProps={{ htmlInput: { maxLength: 4000 }, inputLabel: { shrink: true } }} />
          </Paper>
          <Typography variant="subtitle2">Hospital payments</Typography>
          <RowsTable rows={view?.payments ?? []} empty="No payment to the hospital for this case." columns={[
            { header: 'Case No', cell: () => view?.caseNumber }, { header: 'PV No', cell: (r) => r.pvNumber }, { header: 'PV Date', cell: (r) => formatDate(r.pvDate) }, { header: 'Amt Paid', cell: (r) => formatMoney(r.paidAmount), align: 'right' },
          ]} />
        </Box>
      )}
      {tab === 1 && m && (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <FieldGrid>
            <Field label="Mem Num" value={m.memberNumber} /><Field label="Mem Name" value={m.name} /><Field label="IC Num" value={m.icBcPp} /><Field label="Pol Num" value={m.policyNo} />
            <Field label="Payor" value={m.payor} /><Field label="Insured Type" value={m.insured} /><Field label="Plan" value={m.plan} /><Field label="Pol Status" value={m.status} />
            <Field label="D.O.B" value={formatDate(m.birthDate)} /><Field label="Eff Date" value={formatDate(m.effectiveDate)} /><Field label="Exp Date" value={formatDate(m.expiryDate)} />
            <Field label="Avail. Limit" value={formatMoney(m.availableLimit)} />
          </FieldGrid>
          {m.warnings.length > 0 && <Alert severity="warning" sx={{ mt: 1.5 }}>{m.warnings.join(' ')}</Alert>}
        </Paper>
      )}
      {tab === 2 && form && (
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <FieldGrid>
            <Field label="Claimability" value={form.claimability} /><Field label="Hospital" value={c?.hospitalName ?? form.hospitalCode} /><Field label="D.O.A" value={formatDate(form.dateAdmitted)} /><Field label="D.O.D" value={formatDate(form.dateDischarge)} />
            <Field label="Reserve Amt" value={formatMoney(form.reserveAmount)} /><Field label="LG Amt" value={formatMoney(form.lgAmount)} /><Field label="Cash Type" value={form.payType} /><Field label="Stay Type" value={form.stayType} />
            <Field label="Nat Of Clm" value={form.nature} /><Field label="Treat. Mode" value={form.modality} /><Field label="Referred by" value={form.referredBy} /><Field label="Reason" value={form.admissionReason} />
            <Field label="F. Call" value={form.firstCall} /><Field label="F. Treated" value={form.firstTreated} /><Field label="Fol-up req" value={form.followUpRequired} /><Field label="Recur" value={form.conditionWillRecur} />
            <Field label="Query" value={form.query} /><Field label="T/Over" value={form.takeOverInd} />
          </FieldGrid>
          <RowsTable rows={[...form.firstDiagnosis.map((d) => ({ kind: 'Prelim. Diag', ...d })), ...form.finalDiagnosis.map((d) => ({ kind: 'Final Diag', ...d })), ...form.underlyingDiagnosis.map((d) => ({ kind: 'Underlying Disease', ...d }))].filter((d) => d.code || d.text)}
            empty="No diagnosis." columns={[{ header: 'Diagnosis', cell: (r) => r.kind }, { header: 'ICD', cell: (r) => r.code }, { header: 'Description', cell: (r) => r.text }, { header: 'Date Onset', cell: (r) => formatDate(r.date) }]} />
          <Field label="Attending Doc" value={form.attendingDoctors.filter(Boolean).join(', ')} />
          <Field label="Repudiation Reasons" value={(form.repudiationCodes ?? []).join(', ')} />
        </Paper>
      )}
      <ConfirmDialog open={confirming} busy={save.isPending} title="Audit review" message={`Do you want to ${view?.audit ? 'update' : 'save'} the audit review of case ${view?.caseNumber}?`} onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
