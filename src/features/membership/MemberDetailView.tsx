import { Alert, Box, Chip, CircularProgress, Paper, Tab, Tabs, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { membershipApi, type MemberAccountHistoryItem, type MemberAccountSummary, type MemberAmendment, type MemberCase, type MemberDetail, type MemberNote } from '../../api/membership'
import { formatDate, formatMoney } from '../../lib/format'
import { Field, FieldGrid, QueryTable, type Column } from './components'

const tabs = ['Details', 'Current Case', 'Case History', 'Adjust History', 'Account', 'Acc History', 'Notes'] as const

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

const amendmentColumns: Column<MemberAmendment>[] = [
  { header: 'Bordx Date', cell: (a) => formatDate(a.bordxDate) || '-' },
  { header: 'Batch', cell: (a) => a.batchNo },
  { header: 'Amend Date', cell: (a) => formatDate(a.amendDate) },
  { header: 'Type', cell: (a) => a.type },
  { header: 'Effective Date', cell: (a) => formatDate(a.effectiveDate) },
]

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

const historyColumns: Column<MemberAccountHistoryItem>[] = [
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

function DetailsTab({ m }: { m: MemberDetail }) {
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <FieldGrid>
        <Field label="Name" value={m.name} />
        <Field label="IC / BC / Passport" value={m.icBcPp} />
        <Field label="Policy No" value={m.policyNo} />
        <Field label="Date of Birth" value={formatDate(m.dateOfBirth)} />
        <Field label="Sex" value={m.sex} />
        <Field label="Adult / Child" value={m.adultChild} />
        <Field label="Member Type" value={m.memberType} />
        <Field label="Status" value={m.status} />
        <Field label="Data Status" value={m.dataStatus} />
        <Field label="Expired" value={m.expiredStatus} />
        <Field label="Renewal" value={m.renewFlag} />
        <Field label="Take Over" value={m.takeover === 'C' ? 'C - Conversion' : m.takeover === 'Y' ? 'Y - Take Over' : 'N - None'} />
      </FieldGrid>
      <Typography variant="subtitle2">Policy</Typography>
      <FieldGrid>
        <Field label="Insurer" value={m.insurerCode} />
        <Field label="Plan" value={m.planCode} />
        <Field label="Health Code" value={m.healthCode} />
        <Field label="Payor" value={m.payorCode} />
        <Field label="Payor Effective" value={formatDate(m.payorEffDate)} />
        <Field label="Payor Expiry" value={formatDate(m.payorExpDate)} />
        <Field label="Final Expiry" value={formatDate(m.finalExpiryDate)} />
        <Field label="Policy Year" value={m.policyYear} />
        <Field label="Bordx Date" value={formatDate(m.bordxDate)} />
        <Field label="Batch No" value={m.batchNo} />
        <Field label="Value Date" value={formatDate(m.valueDate)} />
        <Field label="Cancel / Endorse Date" value={formatDate(m.endorsementDate)} />
        <Field label="Payor Submission" value={formatDate(m.payorSubmissionDate)} />
        <Field label="Available Annual Limit" value={m.annualLimitApplies ? formatMoney(m.availableLimit) : 'FULL'} />
      </FieldGrid>
      <Typography variant="subtitle2">Group and address</Typography>
      <FieldGrid>
        <Field label="Group Company" value={m.groupCompany} />
        <Field label="Address" value={[m.address1, m.address2, m.address3, m.address4].filter(Boolean).join(', ')} />
        <Field label="City" value={m.city} />
        <Field label="Post Code" value={m.postCode} />
        <Field label="State" value={m.state} />
      </FieldGrid>
      {m.planSpecialNote && <Alert severity="info">{m.planSpecialNote}</Alert>}
      {m.refund && (
        <>
          <Typography variant="subtitle2">Refund (cancelled member)</Typography>
          <FieldGrid>
            <Field label="Premium Reduction" value={formatMoney(m.refund.premiumReduction)} />
            <Field label="MCO Refund" value={formatMoney(m.refund.mcoRefund)} />
            <Field label="Provider Refund" value={formatMoney(m.refund.providerRefund)} />
            <Field label="Provider Effective" value={formatMoney(m.refund.providerEffective)} />
            <Field label="MCO Effective" value={formatMoney(m.refund.mcoEffective)} />
            <Field label="Premium Effective" value={formatMoney(m.refund.premiumEffective)} />
          </FieldGrid>
        </>
      )}
    </Box>
  )
}

function Notes({ title, query, empty }: { title: string; query: ReturnType<typeof useQuery<MemberNote[]>>; empty: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>{title}</Typography>
      <QueryTable query={query} empty={empty} columns={[{ header: 'Member No', cell: (n) => n.memberNumber }, { header: 'Text', cell: (n) => n.text }]} />
    </Box>
  )
}

export function MemberDetailView({ number }: { number: string }) {
  const [tab, setTab] = useState(0)
  const member = useQuery({ queryKey: ['member', number], queryFn: () => membershipApi.get(number) })
  const active = tabs[tab]
  const cases = useQuery({ queryKey: ['member', number, 'cases'], queryFn: () => membershipApi.cases(number), enabled: active === 'Current Case' })
  const caseHistory = useQuery({ queryKey: ['member', number, 'case-history'], queryFn: () => membershipApi.caseHistory(number), enabled: active === 'Case History' })
  const amendments = useQuery({ queryKey: ['member', number, 'amendments'], queryFn: () => membershipApi.amendments(number), enabled: active === 'Adjust History' })
  const summary = useQuery({ queryKey: ['member', number, 'account-summary'], queryFn: () => membershipApi.accountSummary(number), enabled: active === 'Account' })
  const history = useQuery({ queryKey: ['member', number, 'account-history'], queryFn: () => membershipApi.accountHistory(number), enabled: active === 'Acc History' })
  const exclusions = useQuery({ queryKey: ['member', number, 'exclusions'], queryFn: () => membershipApi.exclusions(number), enabled: active === 'Notes' })
  const remarks = useQuery({ queryKey: ['member', number, 'remarks'], queryFn: () => membershipApi.remarks(number), enabled: active === 'Notes' })

  if (member.isLoading) return <CircularProgress />
  if (member.error) return <Alert severity="error">{(member.error as Error).message}</Alert>
  const m = member.data!

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">{m.number}</Typography>
        <Typography>{m.name}</Typography>
        {m.status && <Chip size="small" label={`Status ${m.status}`} color={m.status === 'A' ? 'success' : 'default'} />}
        {m.expiredStatus === 'Y' && <Chip size="small" label="Expired" color="warning" />}
        {m.reinstated && <Chip size="small" label="Reinstated" />}
        {m.topUp && <Chip size="small" label="Top-up" />}
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        {tabs.map((t) => <Tab key={t} label={t} />)}
      </Tabs>
      {active === 'Details' && <DetailsTab m={m} />}
      {active === 'Current Case' && <QueryTable query={cases} columns={caseColumns} empty="No current cases." />}
      {active === 'Case History' && <QueryTable query={caseHistory} columns={caseColumns} empty="No case history for this member's IC." />}
      {active === 'Adjust History' && <QueryTable query={amendments} columns={amendmentColumns} empty="No adjustments." />}
      {active === 'Account' && <QueryTable query={summary} columns={summaryColumns} empty="No account summary." />}
      {active === 'Acc History' && <QueryTable query={history} columns={historyColumns} empty="No account history." />}
      {active === 'Notes' && (
        <>
          <Notes title="Exclusions" query={exclusions} empty="No exclusions." />
          <Notes title="Remarks" query={remarks} empty="No remarks." />
        </>
      )}
    </Paper>
  )
}
