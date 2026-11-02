import { Box, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { membershipApi, type MemberDetail } from '../../api/membership'
import { LegacyFrame, LegacyRow as L } from '../../components/LegacyForm'
import { legacyBox as box } from '../../components/legacyStyles'
import { formatDate, formatMoney } from '../../lib/format'
import {
  AccountHistoryTab, AccountTab, AmendmentsTab, BenefitsTab, CaseHistoryTab, CasesTab, FeesTab, LifetimeLimitTab, MemberHistoryTab, NonDisclosureTab, NotesTab,
  PolicyTermsTab, PolicyWordingTab, SupplementaryTab, TakeoverClaimsTab,
} from './MemberTabs'

/** Same order and captions as the legacy SSTab1 tabs of frmNewMBMEnquiry. */
const tabs = [
  'Prin Detail', 'Supp', 'Adjust History', 'HIS Benefits', 'Current Case', 'Case History', 'Mem History', 'Account',
  'Acc History', 'Fees', 'Non Disclosure', 'Policy Terms', 'LT Limit', 'Policy Wording', 'T/O Claims', 'Notes',
] as const
type TabName = (typeof tabs)[number]

const R = ({ v, w, multiline }: { v: string | number | null | undefined; w?: number | string; multiline?: boolean }) => (
  <TextField size="small" sx={{ ...box, width: w ?? '100%' }} value={v ?? ''} multiline={multiline} minRows={multiline ? 4 : undefined} slotProps={{ input: { readOnly: true } }} />
)
const t = (label: string, w = 95) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0, ml: 1 }}>{label}</Typography>
const d = (v: string | null | undefined) => (v ? formatDate(v) : '')
const takeOver = (v: string | null) => (v === 'C' ? 'C - Conversion' : v === 'Y' ? 'Y - Take Over' : v ? `${v} - None` : '')

/** Legacy "Prin Detail" tab: address and personal details, policy dates, warranty, remarks and the plan's special note. */
function PrinDetailTab({ m }: { m: MemberDetail }) {
  const o = m.others
  const exclusions = useQuery({ queryKey: ['member', m.number, 'exclusions'], queryFn: () => membershipApi.exclusions(m.number) })
  const remarks = useQuery({ queryKey: ['member', m.number, 'remarks'], queryFn: () => membershipApi.remarks(m.number) })
  const notes = (list: { memberNumber: string; text: string | null }[] | undefined) => (list ?? []).map((n) => `${n.memberNumber} - ${n.text ?? ''}`).join('\n\n')
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' } }}>
        <Box>
          <L label="Address" w={85}><R v={m.address1} /></L>
          <L label="" w={85}><R v={m.address2} /></L>
          <L label="" w={85}><R v={[m.address3, m.address4].filter(Boolean).join(', ')} /></L>
          <L label="PostCode" w={85}><R v={m.postCode} w={110} />{t('City/Town', 75)}<R v={m.city} /></L>
          <L label="State" w={85}><R v={m.state} /></L>
          <L label="Sex" w={85}><R v={m.sex} w={110} />{t('TakeOver', 75)}<R v={takeOver(m.takeover)} /></L>
          <L label="Birthdate" w={85}><R v={d(m.dateOfBirth)} w={110} />{t('Marital Status', 75)}<R v={o?.maritalStatus} /></L>
          <L label="Race" w={85}><R v={m.raceCode} w={110} />{t('Nationality', 75)}<R v={o?.nationality} /></L>
          <L label="Mem Type" w={85}><R v={m.memberType} w={110} />{t('Agent Code', 75)}<R v={o?.agentCode} /></L>
          <L label="Renewal" w={85}><R v={m.renewFlag} w={110} />{t('Age Band', 75)}<R v={m.ageCode} /></L>
          <L label="Gua. Renewal" w={85}><R v={o?.guaranteedRenewal} w={110} />{t('Branch', 75)}<R v={o?.branch ?? m.branchCode} /></L>
        </Box>
        <Box>
          <L label="Ins Type" w={110}><R v={m.insurerCode} w={110} />{t('Plan Code', 70)}<R v={m.planCode} /></L>
          <L label="Eff Date" w={110}><R v={d(m.payorEffDate)} w={110} />{t('Exp Date', 70)}<R v={d(m.payorExpDate)} /></L>
          <L label="Bordx. Date" w={110}><R v={d(m.bordxDate)} w={110} />{t('Batch Num', 70)}<R v={m.batchNo} /></L>
          <L label="Date Fr. Insurer" w={110}><R v={d(m.payorSubmissionDate)} w={110} />{t('DOR', 70)}<R v={d(m.valueDate)} /></L>
          <L label="E'yee Num" w={110}><R v={o?.employeeNo} /></L>
          <L label="Endt Eff Date" w={110}><R v={d(m.endorsementDate)} w={110} />{t('Payor Endt', 70)}<R v={m.endorseType} /></L>
          <L label="Group Company" w={110}><R v={m.groupCompany} /></L>
          <L label="Final Expiry" w={110}><R v={d(m.finalExpiryDate)} w={110} />{t('Policy Year', 70)}<R v={m.policyYear} /></L>
          <L label="Adult/Child" w={110}><R v={m.adultChild} w={110} />{t('Cancel Date', 70)}<R v={d(o?.cancelDate)} /></L>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' } }}>
        <LegacyFrame title="Principal Warranty"><R v={notes(exclusions.data)} multiline /></LegacyFrame>
        <LegacyFrame title="Remarks"><R v={notes(remarks.data)} multiline /></LegacyFrame>
        <LegacyFrame title="Special Note"><R v={m.planSpecialNote} multiline /></LegacyFrame>
      </Box>
      {m.refund && (
        <LegacyFrame title="Refund (cancelled member)">
          <L label="Prem Refund" w={110}><R v={formatMoney(m.refund.premiumReduction)} w={130} />{t('MCO Refund', 95)}<R v={formatMoney(m.refund.mcoRefund)} w={130} />{t('Provider Refund', 110)}<R v={formatMoney(m.refund.providerRefund)} w={130} /></L>
          <L label="Effective Prem" w={110}><R v={formatMoney(m.refund.premiumEffective)} w={130} />{t('MCO Effective', 95)}<R v={formatMoney(m.refund.mcoEffective)} w={130} />{t('Provider Eff.', 110)}<R v={formatMoney(m.refund.providerEffective)} w={130} /></L>
        </LegacyFrame>
      )}
    </Box>
  )
}

function renderTab(tab: TabName, m: MemberDetail) {
  const n = m.number
  switch (tab) {
    case 'Prin Detail': return <PrinDetailTab m={m} />
    case 'Supp': return <SupplementaryTab number={n} insurerCode={m.insurerCode} />
    case 'Adjust History': return <AmendmentsTab number={n} />
    case 'HIS Benefits': return <BenefitsTab number={n} />
    case 'Current Case': return <CasesTab number={n} />
    case 'Case History': return <CaseHistoryTab number={n} />
    case 'Mem History': return <MemberHistoryTab number={n} />
    case 'Account': return <AccountTab number={n} />
    case 'Acc History': return <AccountHistoryTab number={n} />
    case 'Fees': return <FeesTab number={n} />
    case 'Non Disclosure': return <NonDisclosureTab number={n} />
    case 'Policy Terms': return <PolicyTermsTab number={n} />
    case 'LT Limit': return <LifetimeLimitTab number={n} />
    case 'Policy Wording': return <PolicyWordingTab number={n} />
    case 'T/O Claims': return <TakeoverClaimsTab number={n} />
    case 'Notes': return <NotesTab number={n} specialNote={m.planSpecialNote} />
  }
}

/** The 16 tabs of the legacy Member Enquiry form for one member. */
export function MemberDetailView({ member }: { member: MemberDetail }) {
  const [tab, setTab] = useState(0)
  return (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 34, '& .MuiTab-root': { minHeight: 34, textTransform: 'none', px: 1.25 } }}>
        {tabs.map((x) => <Tab key={x} label={x} />)}
      </Tabs>
      <Box sx={{ p: 1 }}>{renderTab(tabs[tab], member)}</Box>
    </>
  )
}
