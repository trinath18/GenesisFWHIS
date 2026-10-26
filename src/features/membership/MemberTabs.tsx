import { Alert, Box, Button, Link, List, ListItem, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import {
  membershipApi,
  type BenefitListing,
  type CoveredPerson,
  type LifetimeLimitRow,
  type MemberAccountHistoryItem,
  type MemberAccountSummary,
  type MemberAmendment,
  type MemberCase,
  type MemberHistoryItem,
  type MemberNote,
  type NonDisclosureItem,
  type PolicyTerm,
  type TakeoverClaim,
} from '../../api/membership'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'
import { Field, FieldGrid, QueryTable, RowsTable, type Column } from './components'

const caseColumns: Column<MemberCase>[] = [
  { header: 'Case No', cell: (c) => c.caseNumber },
  { header: 'Member No', cell: (c) => c.memberNumber },
  { header: 'Patient', cell: (c) => c.patientName },
  { header: 'Rel', cell: (c) => c.relationship },
  { header: 'Admitted', cell: (c) => formatDate(c.admitted) },
  { header: 'Discharged', cell: (c) => formatDate(c.discharged) },
  { header: 'Claimability', cell: (c) => c.claimability },
  { header: 'Diagnosis', cell: (c) => c.diagnosis },
  { header: 'Status', cell: (c) => c.status },
  { header: 'Hospital', cell: (c) => c.hospital },
  { header: 'Payor', cell: (c) => c.payorCode },
]

const historyColumns: Column<MemberHistoryItem>[] = [
  { header: 'Member No', cell: (h) => h.memberNumber },
  { header: 'Cover', cell: (h) => h.coverId },
  { header: 'Top-up', cell: (h) => h.topupInd },
  { header: 'Top-up No', cell: (h) => h.topupNumber },
  { header: 'Policy No', cell: (h) => h.policyNo },
  { header: 'Payor Eff', cell: (h) => formatDate(h.payorEffDate) },
  { header: 'Payor Exp', cell: (h) => formatDate(h.payorExpDate) },
  { header: 'Data Status', cell: (h) => h.dataStatus },
  { header: 'Status', cell: (h) => h.status },
  { header: 'Bordx Date', cell: (h) => formatDate(h.bordxDate) },
]

const coveredColumns: Column<CoveredPerson>[] = [
  { header: 'Cover ID', cell: (c) => c.coverId },
  { header: 'Name', cell: (c) => c.name },
  { header: 'IC / BC / PP', cell: (c) => c.icBcPp },
  { header: 'DOB', cell: (c) => formatDate(c.dateOfBirth) },
  { header: 'Sex', cell: (c) => c.sex },
  { header: 'A/C', cell: (c) => c.adultChild },
  { header: 'Rel', cell: (c) => c.relationship },
  { header: 'Status', cell: (c) => c.status },
  { header: 'Plan', cell: (c) => c.planCode },
  { header: 'Annual Limit', align: 'right', cell: (c) => formatMoney(c.annualLimit) },
  { header: 'Available', align: 'right', cell: (c) => formatMoney(c.availableLimit) },
  { header: 'Effective', cell: (c) => formatDate(c.effectiveDate) },
  { header: 'Expiry', cell: (c) => formatDate(c.expiryDate) },
  { header: 'Cancel', cell: (c) => formatDate(c.cancelDate) },
  { header: 'Premium', align: 'right', cell: (c) => formatMoney(c.premium) },
]

export function SupplementaryTab({ number, insurerCode }: { number: string; insurerCode: string | null }) {
  const noSupp = insurerCode?.startsWith('I') || insurerCode?.startsWith('G')
  const query = useQuery({ queryKey: ['member', number, 'covered-persons'], queryFn: () => membershipApi.coveredPersons(number), enabled: !noSupp })
  if (noSupp) return <Alert severity="info">This Plan does not have supplementary.</Alert>
  return <QueryTable query={query} columns={coveredColumns} empty="No covered persons." />
}

export function CasesTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'cases'], queryFn: () => membershipApi.cases(number) })
  return <QueryTable query={query} columns={caseColumns} empty="No current cases." />
}

export function CaseHistoryTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'case-history'], queryFn: () => membershipApi.caseHistory(number) })
  if (query.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (query.error) return <Alert severity="error">{(query.error as Error).message}</Alert>
  const h = query.data!
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {h.countsDiffer && <Alert severity="warning">Please Check Case History: the IC list ({h.byIc.length}) and the name + date of birth list ({h.byNameDob.length}) differ.</Alert>}
      <Typography variant="subtitle2">By IC / BC / Passport ({h.byIc.length})</Typography>
      <RowsTable rows={h.byIc} columns={caseColumns} empty="No case history for this member's IC." />
      <Typography variant="subtitle2">By name and date of birth ({h.byNameDob.length})</Typography>
      <RowsTable rows={h.byNameDob} columns={caseColumns} empty="No case history by name and date of birth." />
    </Box>
  )
}

export function MemberHistoryTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'member-history'], queryFn: () => membershipApi.memberHistory(number) })
  if (query.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (query.error) return <Alert severity="error">{(query.error as Error).message}</Alert>
  const h = query.data!
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {h.countsDiffer && <Alert severity="warning">Please Check Member History: the IC list ({h.byIc.length}) and the name + date of birth list ({h.byNameDob.length}) differ.</Alert>}
      <Typography variant="subtitle2">By IC / BC / Passport ({h.byIc.length})</Typography>
      <RowsTable rows={h.byIc} columns={historyColumns} empty="No history." />
      <Typography variant="subtitle2">By name and date of birth ({h.byNameDob.length})</Typography>
      <RowsTable rows={h.byNameDob} columns={historyColumns} empty="No history." />
    </Box>
  )
}

const amendmentColumns: Column<MemberAmendment>[] = [
  { header: 'Bordx Date', cell: (a) => formatDate(a.bordxDate) || '-' },
  { header: 'Batch', cell: (a) => a.batchNo },
  { header: 'Amend Date', cell: (a) => formatDate(a.amendDate) },
  { header: 'Type', cell: (a) => a.type },
  { header: 'Effective Date', cell: (a) => formatDate(a.effectiveDate) },
]

export function AmendmentsTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'amendments'], queryFn: () => membershipApi.amendments(number) })
  return <QueryTable query={query} columns={amendmentColumns} empty="No adjustments." />
}

const summaryColumns: Column<MemberAccountSummary>[] = [
  { header: 'Cover ID', cell: (s) => s.coverId },
  { header: 'Approved', align: 'right', cell: (s) => formatMoney(s.totalApproved) },
  { header: 'Payable to Hosp', align: 'right', cell: (s) => formatMoney(s.totalPayableToHospital) },
  { header: 'Paid to Hosp', align: 'right', cell: (s) => formatMoney(s.totalPaidToHospital) },
  { header: 'Payable to Member', align: 'right', cell: (s) => formatMoney(s.totalPayableToMember) },
  { header: 'Paid by Member', align: 'right', cell: (s) => formatMoney(s.totalPaidByMember) },
  { header: 'Paid to Member', align: 'right', cell: (s) => formatMoney(s.totalPaidToMember) },
  { header: 'Reimburse', align: 'right', cell: (s) => formatMoney(s.totalReimburse) },
  { header: 'Excess', align: 'right', cell: (s) => formatMoney(s.totalExcess) },
]

export function AccountTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'account-summary'], queryFn: () => membershipApi.accountSummary(number) })
  return <QueryTable query={query} columns={summaryColumns} empty="No account summary." />
}

const accountHistoryColumns: Column<MemberAccountHistoryItem>[] = [
  { header: 'Member No', cell: (h) => h.memberNumber },
  { header: 'Payor Eff', cell: (h) => formatDate(h.payorEffDate) },
  { header: 'Admitted', cell: (h) => formatDate(h.admitted) },
  { header: 'Case Reg', cell: (h) => formatDate(h.caseRegistered) },
  { header: 'Case', cell: (h) => h.caseReference },
  { header: 'DN/CN Ref', cell: (h) => h.debitCreditRef },
  { header: 'DN/CN Date', cell: (h) => formatDate(h.debitCreditDate) },
  { header: 'Payable', align: 'right', cell: (h) => formatMoney(h.payableByMedix) },
  { header: 'Receipt No', cell: (h) => h.receiptNo },
  { header: 'Receipt Date', cell: (h) => formatDate(h.receiptDate) },
  { header: 'Receipt Amt', align: 'right', cell: (h) => formatMoney(h.receiptAmount) },
  { header: 'Total', align: 'right', cell: (h) => formatMoney(h.payableByMedix + h.receiptAmount) },
]

export function AccountHistoryTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'account-history'], queryFn: () => membershipApi.accountHistory(number) })
  return <QueryTable query={query} columns={accountHistoryColumns} empty="No account history." />
}

export function BenefitsTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'benefits'], queryFn: () => membershipApi.benefits(number) })
  if (query.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (query.error) return <Alert severity="error">{(query.error as Error).message}</Alert>
  const b = query.data!
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <BenefitTable title="Benefits" listing={b.principal} />
      {b.supplementary.map((s) => <BenefitTable key={s.planCode} title="Supplementary benefits" listing={s} />)}
    </Box>
  )
}

function BenefitTable({ title, listing }: { title: string; listing: BenefitListing }) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title} - plan {listing.planCode || '-'}{listing.effectiveDate ? `, effective ${formatDate(listing.effectiveDate)}` : ''}
      </Typography>
      <RowsTable rows={listing.items}
        empty="No benefits listed for this plan and policy date."
        columns={[
          { header: 'Code', cell: (i) => i.code },
          { header: 'Description', cell: (i) => i.description },
          { header: 'Days', cell: (i) => i.noOfDays },
          { header: 'Claimable Amount', align: 'right', cell: (i) => i.claimableAmount },
          { header: 'RM per Disability', cell: (i) => i.rmPerDisability },
        ]}
      />
    </Box>
  )
}

export function FeesTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'fees'], queryFn: () => membershipApi.fees(number) })
  if (query.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (query.error) return <Alert severity="info">{(query.error as Error).message}</Alert>
  const f = query.data!
  return (
    <FieldGrid>
      <Field label="Premium" value={formatMoney(f.premium)} />
      <Field label="MCO Fees" value={formatMoney(f.mcoFee)} />
      <Field label="Access Fee" value={formatMoney(f.accessFee)} />
      <Field label="Basic Premium" value={formatMoney(f.basicPremium)} />
      <Field label="Basic MCO" value={formatMoney(f.basicMco)} />
      <Field label="Payor MCO" value={formatMoney(f.payorMco)} />
      <Field label="Billed MCO" value={formatMoney(f.billedMco)} />
    </FieldGrid>
  )
}

const nonDisclosureColumns: Column<NonDisclosureItem>[] = [
  { header: 'Member No', cell: (n) => n.memberNumber },
  { header: 'Case No', cell: (n) => n.caseNumber },
  { header: 'Cover', cell: (n) => n.coverId },
  { header: 'Admitted', cell: (n) => formatDate(n.admitted) },
  { header: 'Pre-existing Date', cell: (n) => formatDate(n.preIllnessDate) },
  { header: 'Pre-existing', cell: (n) => n.preIllnessCategory },
  { header: 'Informed By', cell: (n) => n.preIllnessInformedBy },
  { header: 'Underlying Date', cell: (n) => formatDate(n.underlyingIllnessDate) },
  { header: 'Underlying', cell: (n) => n.underlyingIllnessCategory },
  { header: 'Informed By ', cell: (n) => n.underlyingIllnessInformedBy },
]

export function NonDisclosureTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'non-disclosure'], queryFn: () => membershipApi.nonDisclosure(number) })
  return <QueryTable query={query} columns={nonDisclosureColumns} empty="No non-disclosure information." />
}

export function PolicyTermsTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'policy-terms'], queryFn: () => membershipApi.policyTerms(number) })
  const columns: Column<PolicyTerm>[] = [{ header: 'Term', cell: (t) => t.name }, { header: 'Value', cell: (t) => t.value }]
  return <QueryTable query={query} columns={columns} empty="No policy terms for this plan." />
}

const lifetimeColumns: Column<LifetimeLimitRow>[] = [
  { header: 'Member No', cell: (l) => l.memberNumber },
  { header: 'Cover', cell: (l) => l.coverId },
  { header: 'Name', cell: (l) => l.name },
  { header: 'Available Limit', align: 'right', cell: (l) => formatMoney(l.availableLimit) },
  { header: 'Balance', align: 'right', cell: (l) => formatMoney(l.balance) },
  { header: 'Current Cases', align: 'right', cell: (l) => l.currentCases },
  { header: 'Case History', align: 'right', cell: (l) => l.historyCases },
  { header: 'Current Bordx', align: 'right', cell: (l) => formatMoney(l.currentBordxAmount) },
  { header: 'History Bordx', align: 'right', cell: (l) => formatMoney(l.historyBordxAmount) },
]

export function LifetimeLimitTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'lifetime-limit'], queryFn: () => membershipApi.lifetimeLimit(number) })
  return <QueryTable query={query} columns={lifetimeColumns} empty="No lifetime limit information." />
}

export function PolicyWordingTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'policy-wording'], queryFn: () => membershipApi.policyWording(number) })
  if (query.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (query.error) return <Alert severity="error">{(query.error as Error).message}</Alert>
  const w = query.data!
  if (!w.folder) return <Typography color="text.secondary">This plan has no policy wording.</Typography>
  if (!w.storeConfigured) return <Alert severity="warning">The policy wording document store is not configured on this server (FileStore:PolicyWordingRoot).</Alert>
  if (w.files.length === 0) return <Typography color="text.secondary">No documents found in {w.folder}.</Typography>
  return (
    <List dense>
      {w.files.map((f) => (
        <ListItem key={f.name}>
          <Link component="button" onClick={async () => download(await membershipApi.policyWordingFile(number, f.name), f.name)}>{f.name}</Link>
          <Typography variant="caption" sx={{ ml: 1 }} color="text.secondary">{(f.size / 1024).toFixed(0)} KB</Typography>
        </ListItem>
      ))}
    </List>
  )
}

const takeoverColumns: Column<TakeoverClaim>[] = [
  { header: 'Effective', cell: (t) => formatDate(t.effectiveDate) },
  { header: 'Expiry', cell: (t) => formatDate(t.expiryDate) },
  { header: 'Patient', cell: (t) => t.patientName },
  { header: 'IC', cell: (t) => t.patientIc },
  { header: 'Admitted', cell: (t) => formatDate(t.admitted) },
  { header: 'Discharged', cell: (t) => formatDate(t.discharged) },
  { header: 'Hospital', cell: (t) => t.hospital },
  { header: 'Diagnosis', cell: (t) => t.diagnosis },
  { header: 'Doctors', cell: (t) => t.doctors },
  { header: 'Bill', align: 'right', cell: (t) => formatMoney(t.billAmount) },
  { header: 'Approved', align: 'right', cell: (t) => formatMoney(t.approvedAmount) },
  { header: 'Excess', align: 'right', cell: (t) => formatMoney(t.excessAmount) },
]

export function TakeoverClaimsTab({ number }: { number: string }) {
  const query = useQuery({ queryKey: ['member', number, 'takeover-claims'], queryFn: () => membershipApi.takeoverClaims(number) })
  return <QueryTable query={query} columns={takeoverColumns} empty="No takeover claims for this policy." />
}

export function NotesTab({ number, specialNote }: { number: string; specialNote: string | null }) {
  const exclusions = useQuery({ queryKey: ['member', number, 'exclusions'], queryFn: () => membershipApi.exclusions(number) })
  const remarks = useQuery({ queryKey: ['member', number, 'remarks'], queryFn: () => membershipApi.remarks(number) })
  const columns: Column<MemberNote>[] = [{ header: 'Member No', cell: (n) => n.memberNumber }, { header: 'Text', cell: (n) => n.text }]
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {specialNote && <Alert severity="info">{specialNote}</Alert>}
      <Box>
        <Typography variant="subtitle2" gutterBottom>Exclusions</Typography>
        <QueryTable query={exclusions} columns={columns} empty="No exclusions." />
      </Box>
      <Box>
        <Typography variant="subtitle2" gutterBottom>Remarks</Typography>
        <QueryTable query={remarks} columns={columns} empty="No remarks." />
      </Box>
    </Box>
  )
}

export function PrintButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button size="small" variant="outlined" onClick={onClick}>{label}</Button>
}

