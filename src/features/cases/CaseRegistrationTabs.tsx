import { Alert, Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { memberTabsApi } from '../../api/caseRegistration'
import { download } from '../../lib/download'
import { toDmy } from '../../lib/dates'
import type { MemberTab } from './memberTabList'

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

/** One member tab: Benefit, MBM'Ship History, Warranty, Non-Disclosure, Policy Terms, Surgical Schedule or Policy Wording. */
export function CaseMemberTab({ memberNumber, area = 'registration', tab }: { memberNumber: string; area?: 'registration' | 'adjustment'; tab: MemberTab }) {
  const tabsApi = memberTabsApi(area)
  const q = { staleTime: 60_000 }
  const benefits = useQuery({ queryKey: ['cr-benefits', area, memberNumber], queryFn: () => tabsApi.benefits(memberNumber), enabled: tab === 'benefit', ...q })
  const history = useQuery({ queryKey: ['cr-history', area, memberNumber], queryFn: () => tabsApi.history(memberNumber), enabled: tab === 'history', ...q })
  const extras = useQuery({ queryKey: ['cr-extras', area, memberNumber], queryFn: () => tabsApi.extras(memberNumber), enabled: tab === 'warranty' || tab === 'surgical', ...q })
  const nd = useQuery({ queryKey: ['cr-nd', area, memberNumber], queryFn: () => tabsApi.nonDisclosure(memberNumber), enabled: tab === 'non-disclosure', ...q })
  const terms = useQuery({ queryKey: ['cr-terms', area, memberNumber], queryFn: () => tabsApi.policyTerms(memberNumber), enabled: tab === 'terms', ...q })
  const wording = useQuery({ queryKey: ['cr-wording', area, memberNumber], queryFn: () => tabsApi.policyWording(memberNumber), enabled: tab === 'wording', ...q })
  const err = [benefits, history, extras, nd, terms, wording].find((x) => x.isError)?.error as Error | undefined

  return (
    <Box sx={{ maxHeight: 460, overflow: 'auto' }}>
      {err && <Alert severity="error">{err.message}</Alert>}
      {tab === 'benefit' && benefits.data && (
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
      {tab === 'history' && history.data && <Grid head={['Member No', 'Cover', 'Policy No', 'Payor eff', 'Payor exp', 'Status', 'Bordx']} rows={history.data.byIc.map((h) => [h.memberNumber, h.coverId, h.policyNo, toDmy(h.payorEffDate ?? ''), toDmy(h.payorExpDate ?? ''), h.status, toDmy(h.bordxDate ?? '')])} />}
      {tab === 'warranty' && extras.data && (
        <>
          <Typography variant="subtitle2">Principal exclusion</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{extras.data.principalExclusion ?? 'None.'}</Typography>
          <Typography variant="subtitle2">Supplementary exclusion</Typography>
          <Grid head={['Cover', 'Name', 'Exclusion']} rows={extras.data.coveredExclusions.map((c) => [c.coverId, c.name, c.exclusion])} />
        </>
      )}
      {tab === 'non-disclosure' && nd.data && <Grid head={['Case No', 'Cover', 'Admitted', 'Pre-illness date', 'Category', 'Informed by', 'Underlying date', 'Category', 'Informed by']} rows={nd.data.map((n) => [n.caseNumber, n.coverId, toDmy(n.admitted ?? ''), toDmy(n.preIllnessDate ?? ''), n.preIllnessCategory, n.preIllnessInformedBy, toDmy(n.underlyingIllnessDate ?? ''), n.underlyingIllnessCategory, n.underlyingIllnessInformedBy])} />}
      {tab === 'terms' && terms.data && <Grid head={['Term', 'Value']} rows={terms.data.map((t) => [t.name, t.value])} />}
      {tab === 'surgical' && extras.data && <Grid head={['Payor', 'Plan', 'Main category', 'Sub category', '%']} rows={extras.data.surgicalSchedule.map((s) => [s.payor, s.plan, s.mainCategory, s.subCategory, s.percent])} />}
      {tab === 'wording' && wording.data && (
        wording.data.files.length === 0
          ? <Typography variant="body2">{wording.data.storeConfigured ? 'No policy wording documents for this plan.' : 'The policy wording document store is not configured.'}</Typography>
          : wording.data.files.map((f) => <Box key={f.name}><Link component="button" onClick={async () => download(await tabsApi.policyWordingFile(memberNumber, f.name), f.name)}>{f.name}</Link></Box>)
      )}
    </Box>
  )
}

/** The member's case management note (MBMTwo), shown under the case remarks on the Case Mgmt Notes tab. */
export function CaseManagementNote({ memberNumber, area = 'registration' }: { memberNumber: string; area?: 'registration' | 'adjustment' }) {
  const extras = useQuery({ queryKey: ['cr-extras', area, memberNumber], queryFn: () => memberTabsApi(area).extras(memberNumber), staleTime: 60_000 })
  return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{extras.data?.managementNote ?? 'No management note.'}</Typography>
}
