import { Alert, Box, Link, List, ListItem, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import {
  casesApi,
  type CaseCarton,
  type CaseDetail,
  type CaseDocumentArea,
  type CaseInvoice,
  type CasePayment,
  type CaseReminder,
  type CaseWorksheet,
  type SurgicalScheduleItem,
} from '../../api/cases'
import type { LifetimeLimitRow, NonDisclosureItem, PolicyTerm } from '../../api/membership'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'
import { Field, FieldGrid, QueryTable, RowsTable, type Column } from '../../components/DataTables'
import { claimabilityLabels, statusLabels, withLabel, yesNo } from './labels'

const list = (items: (string | null | undefined)[]) => items.filter(Boolean).join(', ')

function Remark({ title, text }: { title: string; text: string | null }) {
  if (!text) return null
  return (
    <Box>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{text}</Typography>
    </Box>
  )
}

export function CaseDetailsTab({ d }: { d: CaseDetail }) {
  const h = d.header
  const m = d.member
  const repudiation = useQuery({ queryKey: ['case', h.caseNumber, 'repudiation'], queryFn: () => casesApi.repudiation(h.caseNumber) })
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <FieldGrid>
        <Field label="Member No" value={h.memberNumber} />
        <Field label="Patient" value={`${h.coverId ?? ''} - ${h.patientName ?? ''}`} />
        <Field label="Status" value={withLabel(h.status, statusLabels)} />
        <Field label="Claimability" value={withLabel(h.claimability, claimabilityLabels)} />
        <Field label="Pending" value={withLabel(h.pending, yesNo)} />
        <Field label="Registered" value={formatDate(h.registered)} />
        <Field label="Admitted" value={formatDate(h.admitted)} />
        <Field label="Discharged" value={formatDate(h.discharged)} />
        <Field label="Hospital" value={h.hospitalName} />
        <Field label="Stay Type" value={h.stayType} />
        <Field label="Pay Type" value={h.payType} />
        <Field label="Modality" value={h.modality} />
        <Field label="Claim Nature" value={h.claimNature} />
        <Field label="Referred By" value={h.referredBy} />
        <Field label="LG Amount" value={formatMoney(h.lgAmount)} />
        <Field label="LG Time" value={h.lgTime} />
        <Field label="Reserve Amount" value={formatMoney(h.reserveAmount)} />
        <Field label="Query" value={h.query} />
        <Field label="Link Case No" value={h.linkCaseNumber} />
        <Field label="Top-up Limit" value={h.topupLimit} />
        <Field label="Case Indicator" value={h.caseIndicator} />
        <Field label="ESP Ref No" value={h.espRefNo} />
        <Field label="Claim ID" value={h.claimId} />
        <Field label="Policy Year" value={h.policyYear} />
        <Field label="Room & Board Days" value={h.roomBoardDays} />
      </FieldGrid>
      <Field label="Admission Reason" value={h.admissionReason} />
      <Typography variant="subtitle2">Member and policy</Typography>
      <FieldGrid>
        <Field label="Policy No" value={m.policyNo} />
        <Field label="Member" value={m.name} />
        <Field label="IC / BC / Passport" value={m.icBcPp} />
        <Field label="Date of Birth" value={formatDate(m.dateOfBirth)} />
        <Field label="Payor" value={m.payorCode} />
        <Field label="Insurer" value={m.insurerCode} />
        <Field label="Plan" value={m.planCode} />
        <Field label="Product" value={m.productName} />
        <Field label="Health Code" value={m.healthCode} />
        <Field label="Member Status" value={m.status} />
        <Field label="Expired" value={m.expiredStatus} />
        <Field label="Available Limit" value={formatMoney(m.availableLimit)} />
        <Field label="Payor Effective" value={formatDate(m.payorEffDate)} />
        <Field label="Payor Expiry" value={formatDate(m.payorExpDate)} />
        <Field label="Group Company" value={m.groupCompany} />
        <Field label="Address" value={m.address} />
      </FieldGrid>
      <Typography variant="subtitle2">Diagnosis</Typography>
      <RowsTable
        rows={[...d.firstDiagnoses.map((x) => ({ ...x, kind: 'Preliminary' })), ...d.finalDiagnoses.map((x) => ({ ...x, kind: 'Final' }))]}
        empty="No diagnosis recorded."
        columns={[
          { header: 'Type', cell: (x) => x.kind },
          { header: 'ICD', cell: (x) => x.icdCode },
          { header: 'Description', cell: (x) => x.description },
          { header: 'Date of Service', cell: (x) => formatDate(x.dateOfService) },
        ]}
      />
      {d.underlying.length > 0 && (
        <>
          <Typography variant="subtitle2">Underlying declaration</Typography>
          <RowsTable
            rows={d.underlying}
            columns={[{ header: 'Code', cell: (x) => x.code }, { header: 'Reason', cell: (x) => x.reason }, { header: 'Date of Service', cell: (x) => formatDate(x.dateOfService) }]}
          />
        </>
      )}
      {repudiation.data && (
        <>
          <Typography variant="subtitle2">Repudiation</Typography>
          <FieldGrid>
            <Field label="Issued By" value={repudiation.data.issuedBy} />
            <Field label="Date" value={formatDate(repudiation.data.date)} />
            <Field label="Document" value={repudiation.data.document} />
            <Field label="Personnel" value={repudiation.data.personnel} />
            <Field label="Attention" value={repudiation.data.attention} />
          </FieldGrid>
          <RowsTable
            rows={repudiation.data.reasons}
            empty="No repudiation reasons."
            columns={[{ header: 'Code', cell: (r) => r.code }, { header: 'Description', cell: (r) => r.description }, { header: 'Reason', cell: (r) => r.reason }]}
          />
        </>
      )}
    </Box>
  )
}

export function CaseOthersTab({ d }: { d: CaseDetail }) {
  const c = d.clinical
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <RowsTable
        rows={c.procedures}
        empty="No procedures recorded."
        columns={[
          { header: 'Type', cell: (p) => (p.nonSurgical ? 'Non-surgical' : 'Surgical') },
          { header: 'Procedure', cell: (p) => p.procedure },
          { header: 'CPT', cell: (p) => p.cptCode },
          { header: 'Surgeon Fees', align: 'right', cell: (p) => formatMoney(p.surgeonFees) },
          { header: 'Anaesthetist Fees', align: 'right', cell: (p) => formatMoney(p.anaesthetistFees) },
          { header: 'Non-surgical Fees', align: 'right', cell: (p) => formatMoney(p.nonSurgicalFees) },
        ]}
      />
      <FieldGrid>
        <Field label="Investigations Done" value={list(c.investigationsDone)} />
        <Field label="Medical / Surgical Management" value={list(c.medicalSurgicalManagement)} />
        <Field label="Medication on Discharge" value={list(c.medicationOnDischarge)} />
        <Field label="Investigation Codes" value={list(c.investigationCodes)} />
        <Field label="Condition Will Recur" value={withLabel(c.conditionWillRecur, yesNo)} />
        <Field label="Follow-up Required" value={withLabel(c.followUpRequired, yesNo)} />
        <Field label="Follow-up" value={c.followUp} />
        <Field label="First Call" value={c.firstCall} />
        <Field label="First Treated" value={c.firstTreated} />
        <Field label="Reduction Amount" value={formatMoney(c.reductionAmount)} />
        <Field label="Pay Pending" value={withLabel(c.payPending, yesNo)} />
        <Field label="Patient Age" value={[c.patientAge, c.patientAgeUnit].filter(Boolean).join(' ')} />
        <Field label="Attending Doctors" value={list(c.attendingDoctors)} />
        <Field label="Anaesthetists" value={list(c.anaesthetists)} />
        <Field label="First Doctor Date" value={formatDate(c.firstDoctorDate)} />
        <Field label="Subsequent Doctor Date" value={formatDate(c.subsequentDoctorDate)} />
      </FieldGrid>
      {d.complaint && (
        <>
          <Typography variant="subtitle2">Complaint</Typography>
          <FieldGrid>
            <Field label="Date" value={formatDate(d.complaint.date)} />
            <Field label="Issue" value={d.complaint.issue} />
            <Field label="Complainant" value={d.complaint.complainant} />
            <Field label="Action" value={d.complaint.action} />
          </FieldGrid>
        </>
      )}
    </Box>
  )
}

export function TakeOverTab({ d }: { d: CaseDetail }) {
  const h = d.header
  return (
    <FieldGrid>
      <Field label="Take Over Indicator" value={h.takeOverIndicator} />
      <Field label="Take Over Amount" value={formatMoney(h.takeOverAmount)} />
      <Field label="Take Over Plan" value={h.takeOverPlan} />
      <Field label="Internal / External Take Over" value={h.internalExternalTakeOver} />
    </FieldGrid>
  )
}

export function NotesTab({ d }: { d: CaseDetail }) {
  const r = d.remarks
  const any = [r.management, r.managementTwo, r.page3, r.page4, r.page5, r.internal].some(Boolean)
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {!any && <Typography color="text.secondary">No notes.</Typography>}
      <Remark title="Page 1" text={r.management} />
      <Remark title="Page 2" text={r.managementTwo} />
      <Remark title="Page 3" text={r.page3} />
      <Remark title="Page 4" text={r.page4} />
      <Remark title="Page 5" text={r.page5} />
      <Remark title="Internal notes" text={r.internal} />
    </Box>
  )
}

export function GuaranteesTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'guarantees'], queryFn: () => casesApi.guarantees(number) })
  if (q.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (q.error) return <Alert severity="error">{(q.error as Error).message}</Alert>
  const g = q.data!
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography variant="subtitle2">Letters of guarantee</Typography>
      <RowsTable
        rows={g.letterOfGuarantees}
        empty="No letters of guarantee."
        columns={[
          { header: 'LG No', cell: (x) => x.number }, { header: 'Date', cell: (x) => formatDate(x.date) },
          { header: 'Amount', align: 'right', cell: (x) => formatMoney(x.amount) }, { header: 'Issued By', cell: (x) => x.issuedBy }, { header: 'Remark', cell: (x) => x.remark },
        ]}
      />
      <Typography variant="subtitle2">Follow-up LG</Typography>
      <RowsTable
        rows={g.followUps}
        empty="No follow-up LG."
        columns={[
          { header: 'Follow-up No', cell: (x) => x.number }, { header: 'Amount', align: 'right', cell: (x) => formatMoney(x.amount) },
          { header: 'Issued By', cell: (x) => x.issuedBy }, { header: 'Issued Date', cell: (x) => formatDate(x.issuedDate) }, { header: 'Follow-up Date', cell: (x) => formatDate(x.followUpDate) },
        ]}
      />
    </Box>
  )
}

const worksheetColumns: Column<CaseWorksheet>[] = [
  { header: 'Ver', cell: (w) => w.version },
  { header: 'Approved', align: 'right', cell: (w) => formatMoney(w.totalApproved) },
  { header: 'Actual', align: 'right', cell: (w) => formatMoney(w.totalActual) },
  { header: 'Pending', cell: (w) => w.pending },
  { header: 'Payable to Hosp', align: 'right', cell: (w) => formatMoney(w.payableToHospital) },
  { header: 'Payable to Member', align: 'right', cell: (w) => formatMoney(w.payableToMember) },
  { header: 'Bordx Ref', cell: (w) => w.bordxRefNo },
  { header: 'Close Date', cell: (w) => formatDate(w.claimCloseDate) },
  { header: 'Bordx Date', cell: (w) => formatDate(w.bordxDate) },
  { header: 'Bordx Amt', align: 'right', cell: (w) => formatMoney(w.bordxAmount) },
  { header: 'Payor App', cell: (w) => w.payorApprovalStatus },
  { header: 'App Date', cell: (w) => formatDate(w.payorApprovalDate) },
  { header: 'App Code', cell: (w) => w.payorApprovalCode },
  { header: 'Rev', cell: (w) => w.bordxReversal },
  { header: 'Sent', cell: (w) => formatDate(w.sentDate) },
  { header: 'Carton', cell: (w) => w.cartonNo },
  { header: 'DN/CN Ref', cell: (w) => w.debitCreditRef },
  { header: 'DN/CN Date', cell: (w) => formatDate(w.debitCreditDate) },
]

export function WorksheetsTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'worksheets'], queryFn: () => casesApi.worksheets(number) })
  return <QueryTable query={q} columns={worksheetColumns} empty="No worksheets." />
}

const invoiceColumns: Column<CaseInvoice>[] = [
  { header: 'Invoice No', cell: (i) => i.invoiceNo },
  { header: 'Date', cell: (i) => formatDate(i.invoiceDate) },
  { header: 'Payee', cell: (i) => i.payee },
  { header: 'Pay To', cell: (i) => i.payTo },
  { header: 'WS Ver', cell: (i) => i.worksheetVersion },
  { header: 'Amount', align: 'right', cell: (i) => formatMoney(i.amount) },
  { header: 'Bordx Ref', cell: (i) => i.bordxRefNo },
  { header: 'Bordx Date', cell: (i) => formatDate(i.bordxDate) },
  { header: 'Pending', cell: (i) => i.pending },
]

export function InvoicesTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'invoices'], queryFn: () => casesApi.invoices(number) })
  return <QueryTable query={q} columns={invoiceColumns} empty="No invoices." />
}

const paymentColumns: Column<CasePayment>[] = [
  { header: 'Reference', cell: (p) => p.reference },
  { header: 'Ver', cell: (p) => p.version },
  { header: 'Date', cell: (p) => formatDate(p.date) },
  { header: 'Cheque No', cell: (p) => p.chequeNo },
  { header: 'Cheque Date', cell: (p) => formatDate(p.chequeDate) },
  { header: 'Amount', align: 'right', cell: (p) => formatMoney(p.amount) },
  { header: 'Status', cell: (p) => p.status },
  { header: 'Remark', cell: (p) => p.remark },
]

export function PaymentsTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'payments'], queryFn: () => casesApi.payments(number) })
  const summary = useQuery({ queryKey: ['case', number, 'account-summary'], queryFn: () => casesApi.accountSummary(number) })
  if (q.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (q.error) return <Alert severity="error">{(q.error as Error).message}</Alert>
  const p = q.data!
  const blocks: [string, CasePayment[]][] = [
    ['Payment to hospital', p.toHospital], ['Payment to member', p.toMember], ['Payment to member (reissued)', p.toMemberReissued],
    ['Receipt from member', p.receiptsFromMember], ['Receipt from payor', p.receiptsFromPayor], ['Receipt from MNRB', p.receiptsFromMnrb],
  ]
  const s = summary.data
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {s && (
        <FieldGrid>
          <Field label="Approved" value={formatMoney(s.totalApproved)} />
          <Field label="Payable to Hospital" value={formatMoney(s.totalPayableToHospital)} />
          <Field label="Paid to Hospital" value={formatMoney(s.totalPaidToHospital)} />
          <Field label="Payable to Member" value={formatMoney(s.totalPayableToMember)} />
          <Field label="Paid to Member" value={formatMoney(s.totalPaidToMember)} />
          <Field label="Paid by Member" value={formatMoney(s.totalPaidByMember)} />
          <Field label="Reimburse" value={formatMoney(s.totalReimburse)} />
          <Field label="Excess" value={formatMoney(s.totalExcess)} />
          <Field label="Final Approved" value={formatMoney(s.finalApproved)} />
        </FieldGrid>
      )}
      {blocks.map(([title, rows]) => (
        <Box key={title}>
          <Typography variant="subtitle2" gutterBottom>{title} ({rows.length})</Typography>
          <RowsTable rows={rows} columns={paymentColumns} empty="None." />
        </Box>
      ))}
    </Box>
  )
}

const reminderColumns: Column<CaseReminder>[] = [
  { header: 'No', cell: (r) => r.number }, { header: 'Ver', cell: (r) => r.version }, { header: 'Date', cell: (r) => formatDate(r.date) },
  { header: 'RMF', cell: (r) => r.rmf }, { header: 'Orig Invoice', cell: (r) => r.originalInvoice }, { header: 'Report', cell: (r) => r.report },
  { header: 'Proposal', cell: (r) => r.proposalForm }, { header: 'Referral', cell: (r) => r.referralLetter }, { header: 'Subrogation', cell: (r) => r.subrogationForm },
  { header: 'Receipt', cell: (r) => r.receipt }, { header: 'Student', cell: (r) => r.student }, { header: 'Police', cell: (r) => r.police },
  { header: 'Others', cell: (r) => list([r.others1, r.others2]) }, { header: 'By', cell: (r) => r.registeredBy }, { header: 'Registered', cell: (r) => formatDate(r.registeredDate) },
]

export function RemindersTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'reminders'], queryFn: () => casesApi.reminders(number) })
  return <QueryTable query={q} columns={reminderColumns} empty="No reminders." />
}

export function NonDisclosureTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'non-disclosure'], queryFn: () => casesApi.nonDisclosure(number) })
  const cols: Column<NonDisclosureItem>[] = [
    { header: 'Member No', cell: (n) => n.memberNumber }, { header: 'Case No', cell: (n) => n.caseNumber }, { header: 'Cover', cell: (n) => n.coverId },
    { header: 'Admitted', cell: (n) => formatDate(n.admitted) }, { header: 'Pre-existing Date', cell: (n) => formatDate(n.preIllnessDate) },
    { header: 'Pre-existing', cell: (n) => n.preIllnessCategory }, { header: 'Informed By', cell: (n) => n.preIllnessInformedBy },
    { header: 'Underlying Date', cell: (n) => formatDate(n.underlyingIllnessDate) }, { header: 'Underlying', cell: (n) => n.underlyingIllnessCategory },
    { header: 'Informed By ', cell: (n) => n.underlyingIllnessInformedBy },
  ]
  return <QueryTable query={q} columns={cols} empty="No non-disclosure information." />
}

export function BenefitsTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'benefits'], queryFn: () => casesApi.benefits(number) })
  if (q.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (q.error) return <Alert severity="error">{(q.error as Error).message}</Alert>
  const b = q.data
  if (!b) return <Typography color="text.secondary">No benefits.</Typography>
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Typography variant="subtitle2">Plan {b.planCode || '-'}{b.effectiveDate ? `, effective ${formatDate(b.effectiveDate)}` : ''}</Typography>
      <RowsTable
        rows={b.items}
        empty="No benefits listed for this plan and admission date."
        columns={[
          { header: 'Code', cell: (i) => i.code }, { header: 'Description', cell: (i) => i.description }, { header: 'Days', cell: (i) => i.noOfDays },
          { header: 'Claimable Amount', align: 'right', cell: (i) => i.claimableAmount }, { header: 'RM per Disability', cell: (i) => i.rmPerDisability },
        ]}
      />
    </Box>
  )
}

export function ExclusionsTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'exclusions'], queryFn: () => casesApi.exclusions(number) })
  if (q.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (q.error) return <Alert severity="error">{(q.error as Error).message}</Alert>
  const e = q.data
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography variant="subtitle2">Principal exclusions</Typography>
      <RowsTable rows={(e?.principal ?? []).map((text) => ({ text }))} empty="No exclusions." columns={[{ header: 'Exclusion', cell: (x) => x.text }]} />
      <Typography variant="subtitle2">Supplementary exclusions</Typography>
      <RowsTable rows={(e?.supplementary ?? []).map((text) => ({ text }))} empty="No supplementary exclusions." columns={[{ header: 'Exclusion', cell: (x) => x.text }]} />
    </Box>
  )
}

export function PolicyTermsTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'policy-terms'], queryFn: () => casesApi.policyTerms(number) })
  const cols: Column<PolicyTerm>[] = [{ header: 'Term', cell: (t) => t.name }, { header: 'Value', cell: (t) => t.value }]
  return <QueryTable query={q} columns={cols} empty="No policy terms for this plan." />
}

export function SurgicalScheduleTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'surgical-schedule'], queryFn: () => casesApi.surgicalSchedule(number) })
  const cols: Column<SurgicalScheduleItem>[] = [
    { header: 'Payor', cell: (s) => s.payorCode }, { header: 'Plan', cell: (s) => s.planCode }, { header: 'Main Category', cell: (s) => s.mainCategory },
    { header: 'Sub Category', cell: (s) => s.subCategory }, { header: '%', align: 'right', cell: (s) => s.percentage },
  ]
  return <QueryTable query={q} columns={cols} empty="No surgical schedule for this plan." />
}

export function LifetimeTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'lifetime-limit'], queryFn: () => casesApi.lifetimeLimit(number) })
  const cols: Column<LifetimeLimitRow>[] = [
    { header: 'Member No', cell: (l) => l.memberNumber }, { header: 'Cover', cell: (l) => l.coverId }, { header: 'Name', cell: (l) => l.name },
    { header: 'Available Limit', align: 'right', cell: (l) => formatMoney(l.availableLimit) }, { header: 'Balance', align: 'right', cell: (l) => formatMoney(l.balance) },
    { header: 'Current Cases', align: 'right', cell: (l) => l.currentCases }, { header: 'Case History', align: 'right', cell: (l) => l.historyCases },
    { header: 'Current Bordx', align: 'right', cell: (l) => formatMoney(l.currentBordxAmount) }, { header: 'History Bordx', align: 'right', cell: (l) => formatMoney(l.historyBordxAmount) },
  ]
  return <QueryTable query={q} columns={cols} empty="No lifetime limit information." />
}

const cartonColumns: Column<CaseCarton>[] = [
  { header: 'Kind', cell: (c) => c.kind }, { header: 'Ver', cell: (c) => c.version }, { header: 'Carton No', cell: (c) => c.cartonNo },
  { header: 'Carton Status', cell: (c) => c.cartonStatus }, { header: 'File Status', cell: (c) => c.fileStatus }, { header: 'Requested By', cell: (c) => c.requestedBy },
  { header: 'Requested', cell: (c) => formatDate(c.requestDate) }, { header: 'Delivered', cell: (c) => formatDate(c.deliveryDate) }, { header: 'Returned', cell: (c) => formatDate(c.returnDate) },
  { header: 'Remarks', cell: (c) => c.remarks }, { header: 'Updated By', cell: (c) => c.updatedBy }, { header: 'Updated', cell: (c) => formatDate(c.updatedDate) },
]

export function CartonTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'cartons'], queryFn: () => casesApi.cartons(number) })
  return <QueryTable query={q} columns={cartonColumns} empty="No carton information." />
}

function Files({ files, open }: { files: { name: string; size: number }[]; open: (name: string) => void }) {
  return (
    <List dense>
      {files.map((f) => (
        <ListItem key={f.name}>
          <Link component="button" onClick={() => open(f.name)}>{f.name}</Link>
          <Typography variant="caption" sx={{ ml: 1 }} color="text.secondary">{(f.size / 1024).toFixed(0)} KB</Typography>
        </ListItem>
      ))}
    </List>
  )
}

function AreaDocuments({ number, area, title, empty }: { number: string; area: CaseDocumentArea; title: string; empty: string }) {
  const q = useQuery({ queryKey: ['case', number, 'documents', area], queryFn: () => casesApi.documents(number, area) })
  if (q.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (q.error) return <Alert severity="error">{(q.error as Error).message}</Alert>
  const l = q.data!
  return (
    <Box>
      <Typography variant="subtitle2">{title}</Typography>
      {!l.storeConfigured
        ? <Alert severity="warning">The {title.toLowerCase()} store is not configured on this server (FileStore section in appsettings).</Alert>
        : l.files.length === 0 ? <Typography color="text.secondary">{empty}</Typography>
          : <Files files={l.files} open={async (n) => download(await casesApi.documentFile(number, area, n), n)} />}
    </Box>
  )
}

export function FormsTab({ number }: { number: string }) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <AreaDocuments number={number} area="Scanned" title="Scanned documents" empty="No scanned documents." />
      <AreaDocuments number={number} area="Internal" title="Internal documents" empty="No internal documents." />
    </Box>
  )
}

export function EmailsTab({ number }: { number: string }) {
  return <AreaDocuments number={number} area="Emails" title="E-mails" empty="No e-mails." />
}

export function PolicyWordingTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['case', number, 'policy-wording'], queryFn: () => casesApi.policyWording(number) })
  if (q.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (q.error) return <Alert severity="error">{(q.error as Error).message}</Alert>
  const w = q.data!
  if (!w.folder) return <Typography color="text.secondary">This plan has no policy wording.</Typography>
  if (!w.storeConfigured) return <Alert severity="warning">The policy wording document store is not configured on this server (FileStore:PolicyWordingRoot).</Alert>
  if (w.files.length === 0) return <Typography color="text.secondary">No documents found in {w.folder}.</Typography>
  return <Files files={w.files} open={async (n) => download(await casesApi.policyWordingFile(number, n), n)} />
}

