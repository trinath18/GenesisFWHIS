import { Box, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { membershipApi, type MemberDetail } from '../../api/membership'
import { LegacyFrame, LegacyGrid, LegacyLabel as C, LegacyRow as L } from '../../components/LegacyForm'
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

const R = ({ v, w, multiline, span }: { v: string | number | null | undefined; w?: number | string; multiline?: boolean; span?: boolean }) => (
  <TextField size="small" sx={{ ...box, width: w ?? '100%', minWidth: 0, ...(span ? { gridColumn: '2 / -1' } : {}) }} value={v ?? ''} multiline={multiline} minRows={multiline ? 4 : undefined} slotProps={{ input: { readOnly: true } }} />
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
      <Box sx={{ display: 'grid', gap: { xs: 1, lg: 3 }, gridTemplateColumns: { xs: '1fr', lg: '1.15fr 1fr' } }}>
        <LegacyGrid columns="96px minmax(100px, 150px) 100px minmax(100px, 1fr)">
          <C>Address</C><R v={m.address1} span />
          <span /><R v={m.address2} span />
          <span /><R v={[m.address3, m.address4].filter(Boolean).join(', ')} span />
          <C>PostCode</C><R v={m.postCode} /><C>City/Town</C><R v={m.city} />
          <C>State</C><R v={m.state} span />
          <C>Sex</C><R v={m.sex} /><C>TakeOver</C><R v={takeOver(m.takeover)} />
          <C>Birthdate</C><R v={d(m.dateOfBirth)} /><C>Marital Status</C><R v={o?.maritalStatus} />
          <C>Race</C><R v={m.raceCode} /><C>Nationality</C><R v={o?.nationality} />
          <C>Mem Type</C><R v={m.memberType} /><C>Agent Code</C><R v={o?.agentCode} />
          <C>Renewal</C><R v={m.renewFlag} /><C>Age Band</C><R v={m.ageCode} />
          <C>Gua. Renewal</C><R v={o?.guaranteedRenewal} /><C>Branch</C><R v={o?.branch ?? m.branchCode} />
        </LegacyGrid>
        <LegacyGrid columns="112px minmax(100px, 140px) 84px minmax(100px, 1fr)" narrow="112px minmax(0, 1fr)">
          <C>Ins Type</C><R v={m.insurerCode} /><C>Plan Code</C><R v={m.planCode} />
          <C>Eff Date</C><R v={d(m.payorEffDate)} /><C>Exp Date</C><R v={d(m.payorExpDate)} />
          <C>Bordx. Date</C><R v={d(m.bordxDate)} /><C>Batch Num</C><R v={m.batchNo} />
          <C>Date Fr. Insurer</C><R v={d(m.payorSubmissionDate)} /><C>DOR</C><R v={d(m.valueDate)} />
          <C>E'yee Num</C><R v={o?.employeeNo} span />
          <C>Endt Eff Date</C><R v={d(m.endorsementDate)} /><C>Payor Endt</C><R v={m.endorseType} />
          <C>Group Company</C><R v={m.groupCompany} span />
          <C>Final Expiry</C><R v={d(m.finalExpiryDate)} /><C>Policy Year</C><R v={m.policyYear} />
          <C>Adult/Child</C><R v={m.adultChild} /><C>Cancel Date</C><R v={d(o?.cancelDate)} />
        </LegacyGrid>
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
