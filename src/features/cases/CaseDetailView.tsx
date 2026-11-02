import { Box, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import type { CaseDetail } from '../../api/cases'
import { CaseDetTab, CaseOthersLegacyTab, TakeOverLegacyTab } from './CaseInquiryLegacyTabs'
import {
  BenefitsTab, CartonTab, EmailsTab, ExclusionsTab, FormsTab, GuaranteesTab, InvoicesTab, LifetimeTab,
  NonDisclosureTab, NotesTab, PaymentsTab, PolicyTermsTab, PolicyWordingTab, RemindersTab, SurgicalScheduleTab, WorksheetsTab,
} from './CaseTabs'

/** Same order and captions as the legacy SSTab1 tabs of frmCaseInquiry. */
const tabs = [
  'Case Det', 'Others', 'Take Over/Others', 'Mgmt Note', 'LG', 'WS', 'Inv', 'Pymt & Rcpt', 'Reminder', 'Non-Dis', 'Benefit', 'Exclusion',
  'Policy Terms', 'Surg Schedule', 'LifeTime', 'Forms', 'Policy', 'Carton', 'Emails',
] as const
type TabName = (typeof tabs)[number]

function renderTab(tab: TabName, d: CaseDetail) {
  const n = d.header.caseNumber
  switch (tab) {
    case 'Case Det': return <CaseDetTab d={d} />
    case 'Others': return <CaseOthersLegacyTab d={d} />
    case 'Take Over/Others': return <TakeOverLegacyTab d={d} />
    case 'Mgmt Note': return <NotesTab d={d} />
    case 'LG': return <GuaranteesTab number={n} />
    case 'WS': return <WorksheetsTab number={n} />
    case 'Inv': return <InvoicesTab number={n} />
    case 'Pymt & Rcpt': return <PaymentsTab number={n} />
    case 'Reminder': return <RemindersTab number={n} />
    case 'Non-Dis': return <NonDisclosureTab number={n} />
    case 'Benefit': return <BenefitsTab number={n} />
    case 'Exclusion': return <ExclusionsTab number={n} />
    case 'Policy Terms': return <PolicyTermsTab number={n} />
    case 'Surg Schedule': return <SurgicalScheduleTab number={n} />
    case 'LifeTime': return <LifetimeTab number={n} />
    case 'Forms': return <FormsTab number={n} />
    case 'Policy': return <PolicyWordingTab number={n} />
    case 'Carton': return <CartonTab number={n} />
    case 'Emails': return <EmailsTab number={n} />
  }
}

/** The 19 tabs of the legacy Case Inquiry form for one case. */
export function CaseDetailView({ detail }: { detail: CaseDetail }) {
  const [tab, setTab] = useState(0)
  return (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 34, '& .MuiTab-root': { minHeight: 34, textTransform: 'none', px: 1.25 } }}>
        {tabs.map((t) => <Tab key={t} label={t} />)}
      </Tabs>
      <Box sx={{ p: 1 }}>{renderTab(tabs[tab], detail)}</Box>
    </>
  )
}
