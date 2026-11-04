import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { membershipApi, type MemberDetail } from '../../api/membership'
import { LegacyFrame, LegacyRow as L, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { download, safeFileName } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'
import { MemberDetailView } from './MemberDetailView'

const MIN_LENGTH = 3
const valid = /^[A-Za-z0-9*\- ]+$/
const ro = (v: string | number | null | undefined, w: number | string = '100%', sx: object = box) => <TextField size="small" sx={{ ...sx, width: w }} value={v ?? ''} slotProps={{ input: { readOnly: true } }} />

/** The Search button: members whose number starts with what is typed. */
function MemberSearchDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (number: string) => void }) {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const search = useQuery({ queryKey: ['member-search', q], queryFn: () => membershipApi.search(q), enabled: q.length >= MIN_LENGTH })
  const items = search.data?.items
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = input.trim()
    if (v.length < MIN_LENGTH) return setError(`Search String must be at least ${MIN_LENGTH} characters!`)
    if (!valid.test(v)) return setError('Only letters, digits, * and - are allowed.')
    setError(null); setQ(v)
  }
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>List of Members</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
        <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, pt: 1 }}>
          <TextField size="small" label="Membership No (prefix)" value={input} onChange={(e) => setInput(e.target.value)} autoFocus sx={{ width: 300 }} />
          <Button type="submit" variant="contained">Search</Button>
        </Box>
        {error && <Alert severity="warning">{error}</Alert>}
        {search.error && <Alert severity="error">{(search.error as Error).message}</Alert>}
        {items && items.length === 0 && <Alert severity="info">No record found!</Alert>}
        {search.data?.truncated && <Alert severity="info">Showing the first {items?.length} matches. Enter more characters to narrow the search.</Alert>}
        {!!items?.length && (
          <TableContainer sx={{ maxHeight: 380 }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow>{['Member No', 'Cover', 'Name', 'IC/BC/PP', 'Policy No', 'Status', 'Payor Eff', 'Payor Exp', 'Group Company'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.number} hover sx={{ cursor: 'pointer' }} onClick={() => onPick(m.number)}>
                    <TableCell>{m.number}</TableCell><TableCell>{m.coverId}</TableCell><TableCell>{m.name}</TableCell><TableCell>{m.icBcPp}</TableCell><TableCell>{m.policyNo}</TableCell>
                    <TableCell>{m.status}</TableCell><TableCell>{formatDate(m.payorEffDate)}</TableCell><TableCell>{formatDate(m.payorExpDate)}</TableCell><TableCell>{m.groupCompany}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Exit</Button></DialogActions>
    </Dialog>
  )
}

/** The legacy "Others Details" window (frmNewMBMOthers): phones, e-mail, card sending and other member particulars. */
function OthersDialog({ m, onClose }: { m: MemberDetail | null; onClose: () => void }) {
  const o = m?.others
  return (
    <Dialog open={!!m} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Others Details {m?.number}</DialogTitle>
      <DialogContent>
        <LegacyFrame>
          <L label="Tel (H)" w={120}>{ro(o?.phoneHome)}</L>
          <L label="Tel (M)" w={120}>{ro(o?.phoneMobile)}</L>
          <L label="Tel (O)" w={120}>{ro(o?.phoneOffice)}</L>
          <L label="E-mail" w={120}>{ro(o?.email)}</L>
          <L label="Sending Mode" w={120}>{ro(o?.sendingMode)}</L>
          <L label="Card Sent Date" w={120}>{ro(o?.cardDate ? formatDate(o.cardDate) : '')}</L>
          <L label="Occupation" w={120}>{ro(o?.occupation)}</L>
          <L label="Department" w={120}>{ro(o?.department)}</L>
        </LegacyFrame>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  )
}

/**
 * Legacy: Membership > Enquiry (frmNewMBMEnquiry, "Member Enquiry"). Mem Num with Go, Pre, Next and Search, Pol Status, Exp. Status, Data Status and Hlt
 * Type; salutation, name, payor, policy and IC with the annual balance limit, H&C and top-up join date; the 16 tabs; and Print History, Others Details,
 * Print Report and Exit. Everything is read-only.
 */
export function EnquiryPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const selected = params.get('member')
  const [number, setNumber] = useState(selected ?? '')
  const [searching, setSearching] = useState(false)
  const [others, setOthers] = useState<MemberDetail | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const member = useQuery({ queryKey: ['member', selected], queryFn: () => membershipApi.get(selected!), enabled: !!selected })
  const m = member.data
  const open = (n: string) => { setMessage(null); setNumber(n); setParams({ member: n }) }
  const go = () => {
    const n = number.trim().toUpperCase()
    if (!n) return setMessage('Please key in Membership No.!')
    if (!valid.test(n)) return setMessage('Only letters, digits, * and - are allowed.')
    open(n)
  }
  const step = useMutation({
    // Legacy CmdNext used the box: empty loads the first member.
    mutationFn: (dir: 'next' | 'previous') => (dir === 'next' ? membershipApi.next(selected ?? number) : membershipApi.previous(selected ?? number.trim())),
    onSuccess: (r) => open(r.number), onError: (e) => setMessage((e as Error).message),
  })
  const print = async (kind: 'enquiry.pdf' | 'exclusion-form.xlsx' | 'history.xlsx') => {
    setMessage(null)
    try { download(await membershipApi.print(m!.number, kind), `member-${safeFileName(m!.number)}-${kind}`) } catch (e) { setMessage((e as Error).message) }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Member Enquiry</LegacyTitle>
      {message && <Alert severity="warning" onClose={() => setMessage(null)}>{message}</Alert>}
      {member.error && <Alert severity="error">{(member.error as Error).message}</Alert>}

      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13 }}>Mem Num.</Typography>
        <TextField size="small" sx={{ ...box, width: 170 }} value={number} onChange={(e) => setNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go() }} slotProps={{ htmlInput: { maxLength: 15 } }} />
        <Button size="small" variant="outlined" disabled={member.isFetching} onClick={go}>Go</Button>
        <Button size="small" variant="outlined" disabled={!(selected || number.trim()) || step.isPending} onClick={() => step.mutate('previous')}>Pre</Button>
        <Button size="small" variant="outlined" disabled={step.isPending} onClick={() => step.mutate('next')}>Next</Button>
        <Button size="small" variant="outlined" onClick={() => setSearching(true)}>Search</Button>
        <Typography sx={{ fontSize: 13, ml: 1 }}>Pol Status</Typography>{ro(m?.status, 60, yellow)}
        <Typography sx={{ fontSize: 13, ml: 1 }}>Exp. Status</Typography>{ro(m ? (m.expiredStatus === 'Y' ? 'Expired' : m.expiredStatus ?? '') : '', 80, yellow)}
        <Typography sx={{ fontSize: 13, ml: 1 }}>Data Status</Typography>{ro(m?.dataStatus, 60, yellow)}
        <Typography sx={{ fontSize: 13, ml: 1 }}>Hlt Type</Typography>{ro(m?.healthCode, 60, yellow)}
        {m?.reinstated && <Typography sx={{ fontSize: 13, color: 'warning.main' }}>Reinstated</Typography>}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' } }}>
        <Box>
          <L label="Salutation" w={75}>{ro(m?.others?.salutation, 90)}<Typography sx={{ fontSize: 13, width: 75, ml: 1 }}>Mem Name</Typography>{ro(m?.name)}</L>
          <L label="Payor" w={75}>{ro(m?.payorCode, 90)}<Typography sx={{ fontSize: 13, width: 75, ml: 1 }}>Policy Num</Typography>{ro(m?.policyNo)}</L>
          <L label="" w={75}><Box sx={{ width: 90 }} /><Typography sx={{ fontSize: 13, width: 75, ml: 1 }}>IC Num</Typography>{ro(m?.icBcPp)}</L>
        </Box>
        <Box>
          <L label="Ann Bal Lmt" w={100}>{ro(m ? (m.annualLimitApplies ? formatMoney(m.availableLimit) : 'FULL') : '', 140)}{m?.topUp && <Typography sx={{ fontSize: 13, ml: 1 }}>Top-up</Typography>}</L>
          <L label="H&C" w={100}>{ro(m?.others?.hospitalClinic, 60)}<Typography sx={{ fontSize: 13, ml: 1, width: 110 }}>TopUp Join Date</Typography>{ro(m?.others?.topUpJoinDate ? formatDate(m.others.topUpJoinDate) : '', 120)}</L>
          <L label="Per Disability" w={100}>{ro(m?.planMajorMedical == null ? '' : m.planMajorMedical ? 'Major medical' : '-', 140)}</L>
        </Box>
      </Paper>

      <Paper variant="outlined">
        {m ? <MemberDetailView key={m.number} member={m} />
          : <Box sx={{ p: 2 }}><Typography color="text.secondary">{member.isLoading ? 'Loading...' : 'Enter the membership number and click Go, or Search.'}</Typography></Box>}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Button size="small" variant="outlined" disabled={!m} onClick={() => print('history.xlsx')}>Print History</Button>
        <Button size="small" variant="outlined" disabled={!m} onClick={() => setOthers(m ?? null)}>Others Details</Button>
        <Button size="small" variant="outlined" disabled={!m} onClick={() => print('enquiry.pdf')}>Print Report</Button>
        <Button size="small" variant="outlined" disabled={!m} onClick={() => print('exclusion-form.xlsx')}>Print 2</Button>
        <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
      </Paper>

      <MemberSearchDialog open={searching} onClose={() => setSearching(false)} onPick={(n) => { setSearching(false); open(n) }} />
      <OthersDialog m={others} onClose={() => setOthers(null)} />
    </Box>
  )
}
