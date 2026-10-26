import { Alert, Box, Chip, CircularProgress, Paper, Tab, Tabs, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { casesApi, type CaseDetail } from '../../api/cases'
import { useAuth } from '../../auth/AuthContext'
import { download } from '../../lib/download'
import { PrintButton } from '../membership/MemberTabs'
import {
  BenefitsTab, CartonTab, CaseDetailsTab, CaseOthersTab, EmailsTab, ExclusionsTab, FormsTab, GuaranteesTab, InvoicesTab, LifetimeTab,
  NonDisclosureTab, NotesTab, PaymentsTab, PolicyTermsTab, PolicyWordingTab, RemindersTab, SurgicalScheduleTab, TakeOverTab, WorksheetsTab,
} from './CaseTabs'
import { statusLabels, withLabel } from './labels'

/** Same order as the legacy SSTab1 tabs. */
const tabs = [
  'Case Det', 'Others', 'Take Over/Others', 'Mgmt Note', 'LG', 'WS', 'Inv', 'Pymt & Rcpt', 'Reminder', 'Non-Dis', 'Benefit', 'Exclusion',
  'Policy Terms', 'Surg Schedule', 'LifeTime', 'Forms', 'Policy', 'Carton', 'Emails',
] as const
type TabName = (typeof tabs)[number]

function renderTab(tab: TabName, d: CaseDetail) {
  const n = d.header.caseNumber
  switch (tab) {
    case 'Case Det': return <CaseDetailsTab d={d} />
    case 'Others': return <CaseOthersTab d={d} />
    case 'Take Over/Others': return <TakeOverTab d={d} />
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

/** The legacy form enables "print payments" only with USRAccess position 178. */
const PAYMENT_PRINT_POSITION = 178

export function CaseDetailView({ caseNumber }: { caseNumber: string }) {
  const { can } = useAuth()
  const [tab, setTab] = useState(0)
  const [printError, setPrintError] = useState<string | null>(null)
  const query = useQuery({ queryKey: ['case', caseNumber], queryFn: () => casesApi.get(caseNumber) })

  if (query.isLoading) return <CircularProgress />
  if (query.error) return <Alert severity="error">{(query.error as Error).message}</Alert>
  const d = query.data!

  const print = async (kind: Parameters<typeof casesApi.print>[1]) => {
    setPrintError(null)
    try {
      const name = kind === 'notes.pdf?kind=internal' ? 'internal-notes.pdf' : kind
      download(await casesApi.print(caseNumber, kind), `case-${caseNumber}-${name}`)
    } catch (e) {
      setPrintError(e instanceof Error ? e.message : 'Print failed')
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">{d.header.caseNumber}</Typography>
        <Typography>{d.header.patientName}</Typography>
        {d.header.status && <Chip size="small" label={withLabel(d.header.status, statusLabels)} color={d.header.status === 'O' ? 'success' : 'default'} />}
        {d.hasScannedDocuments === false && <Chip size="small" variant="outlined" label="No scanned documents" />}
        <Box sx={{ flexGrow: 1 }} />
        <PrintButton label="Print (Excel)" onClick={() => print('enquiry.xlsx')} />
        <PrintButton label="Notes (PDF)" onClick={() => print('notes.pdf')} />
        <PrintButton label="Internal Notes (PDF)" onClick={() => print('notes.pdf?kind=internal')} />
        {can(PAYMENT_PRINT_POSITION) && <PrintButton label="Payments (Excel)" onClick={() => print('payments.xlsx')} />}
      </Box>
      {printError && <Alert severity="error" sx={{ mb: 1 }}>{printError}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        {tabs.map((t) => <Tab key={t} label={t} />)}
      </Tabs>
      {renderTab(tabs[tab], d)}
    </Paper>
  )
}
