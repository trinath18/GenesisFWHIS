import { Alert, Box, Button, Chip, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { casesApi } from '../../api/cases'
import { useAuth } from '../../auth/AuthContext'
import { LegacyRow as L, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { download } from '../../lib/download'
import { CaseDetailView } from './CaseDetailView'
import { CaseInquirySearchDialog } from './CaseInquirySearchDialog'
import { claimabilityLabels, statusLabels, withLabel, yesNo } from './labels'

/** The legacy form enables "print payments" only with USRAccess position 178. */
const PAYMENT_PRINT_POSITION = 178
const valid = /^[A-Za-z0-9*\-/]+$/

/**
 * Legacy: Case > Case Inquiry (frmCaseInquiry). Case No with Go, Prev, Next and Search, the policy number, case status and claimability; the member with
 * Enq, name, IC and pending; the 19 tabs; and Print Case, Print Mgmt Note and Exit. Everything is read-only.
 */
export function CaseInquiryPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const selected = params.get('case')
  const [caseNo, setCaseNo] = useState(selected ?? '')
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const detail = useQuery({ queryKey: ['case', selected], queryFn: () => casesApi.get(selected!), enabled: !!selected })
  const d = detail.data
  const h = d?.header
  const open = (no: string) => { setMessage(null); setCaseNo(no); setParams({ case: no }) }
  const go = () => {
    const no = caseNo.trim().toUpperCase()
    if (!no) return setMessage('Please enter a case number.')
    if (!valid.test(no)) return setMessage('That case number contains characters that are not allowed.')
    open(no)
  }
  const step = useMutation({
    // Legacy CmdNext used the box: empty loads the first case.
    mutationFn: (dir: 'next' | 'previous') => (dir === 'next' ? casesApi.next(selected ?? caseNo) : casesApi.previous(selected ?? caseNo.trim())),
    onSuccess: (r) => open(r.caseNumber),
    onError: (e) => setMessage((e as Error).message),
  })
  const print = async (kind: Parameters<typeof casesApi.print>[1], name: string) => {
    setMessage(null)
    try { download(await casesApi.print(selected!, kind), `case-${selected}-${name}`) } catch (e) { setMessage((e as Error).message) }
  }
  const ro = (v: string | null | undefined, w: number | string = '100%', sx = box) => <TextField size="small" sx={{ ...sx, width: w }} value={v ?? ''} slotProps={{ input: { readOnly: true } }} />

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Case Inquiry</LegacyTitle>
      {message && <Alert severity="warning" onClose={() => setMessage(null)}>{message}</Alert>}
      {detail.error && <Alert severity="error">{(detail.error as Error).message}</Alert>}

      <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13, width: 60 }}>Case No</Typography>
          <TextField size="small" sx={{ ...box, width: 140 }} value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go() }} slotProps={{ htmlInput: { maxLength: 15 } }} />
          <Button size="small" variant="outlined" disabled={detail.isFetching} onClick={go}>Go</Button>
          <Button size="small" variant="outlined" disabled={!(selected || caseNo.trim()) || step.isPending} onClick={() => step.mutate('previous')}>Prev</Button>
          <Button size="small" variant="outlined" disabled={step.isPending} onClick={() => step.mutate('next')}>Next</Button>
          <Button size="small" variant="outlined" onClick={() => setSearching(true)}>Search</Button>
          <Typography sx={{ fontSize: 13, ml: 1 }}>Pol No</Typography>{ro(d?.member.policyNo, 170)}
          <Typography sx={{ fontSize: 13, ml: 1 }}>Cas Status</Typography>{ro(h ? withLabel(h.status, statusLabels) : '', 140, yellow)}
          <Typography sx={{ fontSize: 13, ml: 1 }}>Claimability</Typography>{ro(h ? withLabel(h.claimability, claimabilityLabels) : '', 220)}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13, width: 60 }}>Mem No</Typography>{ro(h?.memberNumber, 140)}
          <Button size="small" variant="outlined" disabled={!h} onClick={() => h && navigate(`/membership/enquiry?member=${encodeURIComponent(h.memberNumber)}`)}>Enq</Button>
          <Typography sx={{ fontSize: 13, ml: 1 }}>Mem Name</Typography>{ro(d?.member.name, 300)}
          <Typography sx={{ fontSize: 13, ml: 1 }}>IC Num</Typography>{ro(d?.member.icBcPp, 160)}
          <Typography sx={{ fontSize: 13, ml: 1 }}>Pending</Typography>{ro(h ? withLabel(h.pending, yesNo) : '', 90)}
          {d?.hasScannedDocuments === false && <Chip size="small" variant="outlined" label="Fax documents not in system!" />}
        </Box>
      </Paper>

      <Paper variant="outlined">
        {d ? <CaseDetailView key={d.header.caseNumber} detail={d} />
          : <Box sx={{ p: 2 }}><Typography color="text.secondary">{detail.isLoading ? 'Loading...' : 'Enter a case number and click Go, or Search.'}</Typography></Box>}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {d && <L label="Patient" w={55}>{ro(`${h?.coverId ?? ''} - ${h?.patientName ?? ''}`, 300)}</L>}
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" disabled={!d} onClick={() => print('enquiry.xlsx', 'enquiry.xlsx')}>Print Case</Button>
        <Button size="small" variant="outlined" disabled={!d} onClick={() => print('notes.pdf', 'notes.pdf')}>Print Mgmt Note</Button>
        <Button size="small" variant="outlined" disabled={!d} onClick={() => print('notes.pdf?kind=internal', 'internal-notes.pdf')}>Print Internal Note</Button>
        {can(PAYMENT_PRINT_POSITION) && <Button size="small" variant="outlined" disabled={!d} onClick={() => print('payments.xlsx', 'payments.xlsx')}>Print Pymt</Button>}
        <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
      </Paper>

      <CaseInquirySearchDialog open={searching} onClose={() => setSearching(false)} onPick={(no) => { setSearching(false); open(no) }} />
    </Box>
  )
}
