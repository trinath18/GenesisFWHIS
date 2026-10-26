import { Alert, Box, Chip, CircularProgress, Paper, Tab, Tabs, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { membershipApi, type MemberDetail } from '../../api/membership'
import { download, safeFileName } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'
import { Field, FieldGrid } from './components'
import {
  AccountHistoryTab,
  AccountTab,
  AmendmentsTab,
  BenefitsTab,
  CaseHistoryTab,
  CasesTab,
  FeesTab,
  LifetimeLimitTab,
  MemberHistoryTab,
  NonDisclosureTab,
  NotesTab,
  PolicyTermsTab,
  PolicyWordingTab,
  PrintButton,
  SupplementaryTab,
  TakeoverClaimsTab,
} from './MemberTabs'

/** Same order as the legacy SSTab1 tabs. */
const tabs = [
  'Details', 'Supplementary', 'Adjust History', 'Benefits', 'Current Case', 'Case History', 'Member History', 'Account',
  'Account History', 'Fees', 'Non Disclosure', 'Policy Terms', 'LT Limit', 'Policy Wording', 'T/O Claims', 'Notes',
] as const
type TabName = (typeof tabs)[number]

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

function renderTab(tab: TabName, m: MemberDetail) {
  const n = m.number
  switch (tab) {
    case 'Details': return <DetailsTab m={m} />
    case 'Supplementary': return <SupplementaryTab number={n} insurerCode={m.insurerCode} />
    case 'Adjust History': return <AmendmentsTab number={n} />
    case 'Benefits': return <BenefitsTab number={n} />
    case 'Current Case': return <CasesTab number={n} />
    case 'Case History': return <CaseHistoryTab number={n} />
    case 'Member History': return <MemberHistoryTab number={n} />
    case 'Account': return <AccountTab number={n} />
    case 'Account History': return <AccountHistoryTab number={n} />
    case 'Fees': return <FeesTab number={n} />
    case 'Non Disclosure': return <NonDisclosureTab number={n} />
    case 'Policy Terms': return <PolicyTermsTab number={n} />
    case 'LT Limit': return <LifetimeLimitTab number={n} />
    case 'Policy Wording': return <PolicyWordingTab number={n} />
    case 'T/O Claims': return <TakeoverClaimsTab number={n} />
    case 'Notes': return <NotesTab number={n} specialNote={m.planSpecialNote} />
  }
}

export function MemberDetailView({ number }: { number: string }) {
  const [tab, setTab] = useState(0)
  const [printError, setPrintError] = useState<string | null>(null)
  const member = useQuery({ queryKey: ['member', number], queryFn: () => membershipApi.get(number) })

  if (member.isLoading) return <CircularProgress />
  if (member.error) return <Alert severity="error">{(member.error as Error).message}</Alert>
  const m = member.data!

  const print = async (kind: 'enquiry.pdf' | 'exclusion-form.xlsx' | 'history.xlsx') => {
    setPrintError(null)
    try {
      download(await membershipApi.print(m.number, kind), `member-${safeFileName(m.number)}-${kind}`)
    } catch (e) {
      setPrintError(e instanceof Error ? e.message : 'Print failed')
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">{m.number}</Typography>
        <Typography>{m.name}</Typography>
        {m.status && <Chip size="small" label={`Status ${m.status}`} color={m.status === 'A' ? 'success' : 'default'} />}
        {m.expiredStatus === 'Y' && <Chip size="small" label="Expired" color="warning" />}
        {m.reinstated && <Chip size="small" label="Reinstated" />}
        {m.topUp && <Chip size="small" label="Top-up" />}
        <Box sx={{ flexGrow: 1 }} />
        <PrintButton label="Print" onClick={() => print('enquiry.pdf')} />
        <PrintButton label="Print 2 (Excel)" onClick={() => print('exclusion-form.xlsx')} />
        <PrintButton label="Print History (Excel)" onClick={() => print('history.xlsx')} />
      </Box>
      {printError && <Alert severity="error" sx={{ mb: 1 }}>{printError}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        {tabs.map((t) => <Tab key={t} label={t} />)}
      </Tabs>
      {renderTab(tabs[tab], m)}
    </Paper>
  )
}
