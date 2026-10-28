import { Alert, Box, Link, Paper, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { caseRegistrationApi } from '../../api/caseRegistration'
import { download } from '../../lib/download'
import { toDmy } from '../../lib/dates'

const tabs = ['Benefit', "MBM'Ship History", 'Warranty', 'Non-Disclosure', 'Case Mgmt Notes', 'Policy Terms', 'Surgical Schedule', 'Policy Wording']

function Grid({ head, rows }: { head: string[]; rows: (string | number | null | undefined)[][] }) {
  return (
    <Table size="small">
      <TableHead><TableRow>{head.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
      <TableBody>
        {rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c ?? ''}</TableCell>)}</TableRow>)}
        {rows.length === 0 && <TableRow><TableCell colSpan={head.length}>No records.</TableCell></TableRow>}
      </TableBody>
    </Table>
  )
}

/** The read-only tabs of the legacy Case Registration form: Benefit, MBM'Ship History, Warranty, Non-Disclosure, Case Mgmt Notes, Policy Terms, Surgical Schedule and Policy Wording. */
export function CaseRegistrationTabs({ memberNumber }: { memberNumber: string }) {
  const [tab, setTab] = useState(0)
  const q = { staleTime: 60_000 }
  const benefits = useQuery({ queryKey: ['cr-benefits', memberNumber], queryFn: () => caseRegistrationApi.benefits(memberNumber), enabled: tab === 0, ...q })
  const history = useQuery({ queryKey: ['cr-history', memberNumber], queryFn: () => caseRegistrationApi.history(memberNumber), enabled: tab === 1, ...q })
  const extras = useQuery({ queryKey: ['cr-extras', memberNumber], queryFn: () => caseRegistrationApi.extras(memberNumber), enabled: tab === 2 || tab === 4 || tab === 6, ...q })
  const nd = useQuery({ queryKey: ['cr-nd', memberNumber], queryFn: () => caseRegistrationApi.nonDisclosure(memberNumber), enabled: tab === 3, ...q })
  const terms = useQuery({ queryKey: ['cr-terms', memberNumber], queryFn: () => caseRegistrationApi.policyTerms(memberNumber), enabled: tab === 5, ...q })
  const wording = useQuery({ queryKey: ['cr-wording', memberNumber], queryFn: () => caseRegistrationApi.policyWording(memberNumber), enabled: tab === 7, ...q })
  const err = [benefits, history, extras, nd, terms, wording].find((x) => x.isError)?.error as Error | undefined

  return (
    <Paper variant="outlined" sx={{ minHeight: 160 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">{tabs.map((t) => <Tab key={t} label={t} />)}</Tabs>
      <Box sx={{ p: 1.5, maxHeight: 260, overflow: 'auto' }}>
        {err && <Alert severity="error">{err.message}</Alert>}
        {tab === 0 && benefits.data && (
          <>
            <Typography variant="subtitle2">Principal - plan {benefits.data.principal.planCode} (effective {toDmy(benefits.data.principal.effectiveDate ?? '')})</Typography>
            <Grid head={['Code', 'Description', 'Days/Months', 'RM (Days/Months)', 'RM per disability']} rows={benefits.data.principal.items.map((b) => [b.code, b.description, b.noOfDays, b.claimableAmount, b.rmPerDisability])} />
            {benefits.data.supplementary.map((s, i) => (
              <Box key={i} sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Supplementary - plan {s.planCode}</Typography>
                <Grid head={['Code', 'Description', 'Days/Months', 'RM (Days/Months)', 'RM per disability']} rows={s.items.map((b) => [b.code, b.description, b.noOfDays, b.claimableAmount, b.rmPerDisability])} />
              </Box>
            ))}
          </>
        )}
        {tab === 1 && history.data && <Grid head={['Member No', 'Cover', 'Policy No', 'Payor eff', 'Payor exp', 'Status', 'Bordx']} rows={history.data.byIc.map((h) => [h.memberNumber, h.coverId, h.policyNo, toDmy(h.payorEffDate ?? ''), toDmy(h.payorExpDate ?? ''), h.status, toDmy(h.bordxDate ?? '')])} />}
        {tab === 2 && extras.data && (
          <>
            <Typography variant="subtitle2">Principal exclusion</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{extras.data.principalExclusion ?? 'None.'}</Typography>
            <Grid head={['Cover', 'Name', 'Exclusion']} rows={extras.data.coveredExclusions.map((c) => [c.coverId, c.name, c.exclusion])} />
          </>
        )}
        {tab === 3 && nd.data && <Grid head={['Case No', 'Cover', 'Admitted', 'Pre-illness date', 'Category', 'Informed by', 'Underlying date', 'Category', 'Informed by']} rows={nd.data.map((n) => [n.caseNumber, n.coverId, toDmy(n.admitted ?? ''), toDmy(n.preIllnessDate ?? ''), n.preIllnessCategory, n.preIllnessInformedBy, toDmy(n.underlyingIllnessDate ?? ''), n.underlyingIllnessCategory, n.underlyingIllnessInformedBy])} />}
        {tab === 4 && extras.data && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{extras.data.managementNote ?? 'No management note.'}</Typography>}
        {tab === 5 && terms.data && <Grid head={['Term', 'Value']} rows={terms.data.map((t) => [t.name, t.value])} />}
        {tab === 6 && extras.data && <Grid head={['Payor', 'Plan', 'Main category', 'Sub category', '%']} rows={extras.data.surgicalSchedule.map((s) => [s.payor, s.plan, s.mainCategory, s.subCategory, s.percent])} />}
        {tab === 7 && wording.data && (
          wording.data.files.length === 0
            ? <Typography variant="body2">{wording.data.storeConfigured ? 'No policy wording documents for this plan.' : 'The policy wording document store is not configured.'}</Typography>
            : wording.data.files.map((f) => <Box key={f.name}><Link component="button" onClick={async () => download(await caseRegistrationApi.policyWordingFile(memberNumber, f.name), f.name)}>{f.name}</Link></Box>)
        )}
      </Box>
    </Paper>
  )
}
