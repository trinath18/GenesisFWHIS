import { Alert, Box, Button, Link, MenuItem, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { leafletApi, type LeafletCriteria, type LeafletPage } from '../../api/leaflet'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box } from '../../components/legacyStyles'
import { download } from '../../lib/download'
import { formatDate } from '../../lib/format'
import { isMixed, selectionFields, SINGLE } from './leaflet'

type Message = { severity: 'success' | 'error' | 'info'; text: string } | null
const leafletEmpty: LeafletCriteria = { selection: SINGLE, memberNo: '', memberFrom: '', memberTo: '', bordxDate: '', batchNo: '', payor: '', bordxFrom: '', bordxTo: '', sequence: 'Membership No' }
const cardEmpty: LeafletCriteria = { ...leafletEmpty, selection: '', batchNo: '1' }
const lbl = (text: string, w = 150) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0 }}>{text}</Typography>
const small = (text: string, w = 85) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0 }}>{text}</Typography>
const line = (...children: ReactNode[]) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 34, flexWrap: 'wrap' }}>{children}</Box>
const recordedText = (headers: Headers, what: string) => headers.get('X-Printing-Recorded') === 'true'
  ? `${what} and recorded as printed.` : `${what}. The printing log (MBMPrinting) is not in this database, so nothing was recorded.`

/** Criteria fields and actions shared by both working tabs. */
function useCriteria(initial: LeafletCriteria) {
  const [c, setC] = useState(initial)
  const set = (k: keyof LeafletCriteria) => (e: { target: { value: string } }) => setC((x) => ({ ...x, [k]: e.target.value }))
  const setDay = (k: keyof LeafletCriteria) => (iso: string) => setC((x) => ({ ...x, [k]: iso }))
  const T = (k: keyof LeafletCriteria, w = 180, type?: string) => <TextField size="small" type={type} sx={{ ...box, width: w }} value={c[k]} onChange={set(k)} slotProps={{ htmlInput: { 'aria-label': k } }} />
  const D = (k: keyof LeafletCriteria) => <DateField sx={{ ...box, width: 130 }} value={c[k]} onChange={setDay(k)} slotProps={{ htmlInput: { 'aria-label': k } }} />
  const S = (k: keyof LeafletCriteria, items: string[], w = 210, disabled = false) => (
    <TextField select size="small" sx={{ ...box, width: w }} value={c[k]} onChange={set(k)} disabled={disabled} slotProps={{ htmlInput: { 'aria-label': k } }}>
      {items.map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
    </TextField>
  )
  return { c, setC, set, T, D, S }
}

/** lvwLeaflet / lvwCRD: Payor Code, Membership No, Bordereaux Date, Policy No, Health Type, Batch No, Name, Printed. */
function Listing({ page, searched }: { page: LeafletPage | undefined; searched: boolean }) {
  const rows = page?.rows ?? []
  return (
    <LegacyFrame title="Listing">
      {page?.truncated && <Alert severity="info">Showing the first {rows.length} members. Narrow the criteria to print the rest.</Alert>}
      <TableContainer sx={{ height: '38vh' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>{['Payor Code', 'Membership No', 'Bordereaux Date', 'Policy No', 'Health Type', 'Batch No', 'Name', 'Printed'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.memberNumber} hover>
                <TableCell>{r.payCode}</TableCell><TableCell>{r.memberNumber}</TableCell><TableCell>{formatDate(r.bordxDate)}</TableCell><TableCell>{r.policyNo}</TableCell>
                <TableCell>{r.hltCode}</TableCell><TableCell>{r.batchNo}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.printed ? 'YES' : 'NO'}</TableCell>
              </TableRow>
            ))}
            {searched && page && rows.length === 0 && <TableRow><TableCell colSpan={8}>Record not found !</TableCell></TableRow>}
            {!searched && <TableRow><TableCell colSpan={8}>Enter the criteria and click Search.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {page && !page.printingTracked && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>The printing log (MBMPrinting) is not in this database: every member shows as not printed.</Typography>}
    </LegacyFrame>
  )
}

function Buttons({ onSearch, onClear, busy }: { onSearch: () => void; onClear: () => void; busy: boolean }) {
  const navigate = useNavigate()
  return (
    <Box sx={{ display: 'grid', gap: 1, alignContent: 'start', width: 110 }}>
      <Button size="small" variant="outlined" disabled={busy} onClick={onSearch}>Search</Button>
      <Button size="small" variant="outlined" onClick={onClear}>Clear</Button>
      <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
    </Box>
  )
}

function LeafletTab() {
  const options = useQuery({ queryKey: ['leaflet-options'], queryFn: leafletApi.options })
  const o = options.data
  const { c, setC, T, D, S, set } = useCriteria(leafletEmpty)
  const [option, setOption] = useState('Print New')
  const [version, setVersion] = useState('Sihat Malaysia')
  const [applied, setApplied] = useState<LeafletCriteria | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const result = useQuery({ queryKey: ['leaflet', applied], queryFn: () => leafletApi.search(applied!), enabled: applied !== null })
  const rows = result.data?.rows ?? []
  // The legacy form switches to "Print All" and locks the option when the list mixes printed and unprinted members.
  const mixed = isMixed(rows)
  const effectiveOption = mixed ? 'Print All' : option
  const f = selectionFields(c.selection)

  const print = useMutation({
    mutationFn: () => leafletApi.print(applied!, effectiveOption, version),
    onSuccess: (file) => { download(file.blob, file.fileName); setMessage({ severity: 'success', text: recordedText(file.headers, 'Leaflets printed') }); void result.refetch() },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const search = () => { setMessage(null); setApplied({ ...c }) }
  const clear = () => { setC(leafletEmpty); setApplied(null); setOption('Print New'); setVersion('Sihat Malaysia'); setMessage(null) }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {(result.error ?? options.error) && <Alert severity="error">{((result.error ?? options.error) as Error).message}</Alert>}
      <LegacyFrame title="Enter Criteria For Searching">
        <Box component="form" onSubmit={(e) => { e.preventDefault(); search() }} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {line(lbl('Criteria Seletion'), S('selection', o?.selections ?? [SINGLE], 230))}
            {f.single && line(lbl('Single Member :'), small('Member No.'), T('memberNo'))}
            {f.range && line(lbl('Members No. Range :'), small('From'), T('memberFrom'), small('To', 30), T('memberTo'))}
            {f.batch && line(lbl('Bordereaux Batch :'), small('Bordx Date'), D('bordxDate'), small('Batch No', 70), T('batchNo', 110, 'number'))}
            {f.bordxRange && line(lbl('Bordereaux Range :'), small('Bordx From'), D('bordxFrom'), small('To', 30), D('bordxTo'))}
            {line(lbl('Payor'),
              <TextField key="payor" select size="small" sx={{ ...box, width: 420 }} value={c.payor} onChange={set('payor')} disabled={!f.payor} slotProps={{ htmlInput: { 'aria-label': 'payor' } }}>
                <MenuItem value="">&nbsp;</MenuItem>{(o?.payors ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
              </TextField>)}
            {line(lbl('Print Option'),
              <TextField key="opt" select size="small" sx={{ ...box, width: 230 }} value={effectiveOption} disabled={mixed} onChange={(e) => setOption(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'print option' } }}>
                {(o?.printOptions ?? ['Print New']).map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </TextField>,
              small('Sequence', 75), S('sequence', o?.sequences ?? ['Membership No'], 200))}
            {line(lbl('Leaflet Version'),
              <TextField key="ver" select size="small" sx={{ ...box, width: 230 }} value={version} onChange={(e) => setVersion(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'leaflet version' } }}>
                {(o?.versions ?? ['Sihat Malaysia']).map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </TextField>,
              mixed ? <Typography key="mixed" sx={{ fontSize: 13, color: 'error.main', ml: 2 }}>This range only allow to &apos;Print All&apos;</Typography> : null)}
            <button type="submit" hidden />
          </Box>
          <Buttons onSearch={search} onClear={clear} busy={result.isFetching} />
        </Box>
      </LegacyFrame>
      <Listing page={result.data} searched={applied !== null} />
      <Box><Button size="small" variant="contained" disabled={rows.length === 0 || print.isPending} onClick={() => { setMessage(null); print.mutate() }}>{print.isPending ? 'Printing...' : 'Print'}</Button></Box>
    </Box>
  )
}

function CardExportTab() {
  const options = useQuery({ queryKey: ['leaflet-options'], queryFn: leafletApi.options })
  const o = options.data
  const { c, setC, T, D, S, set } = useCriteria(cardEmpty)
  const [option, setOption] = useState('Export New')
  const [version, setVersion] = useState('Sihat Malaysia')
  const [applied, setApplied] = useState<LeafletCriteria | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const result = useQuery({ queryKey: ['leaflet-cards', applied], queryFn: () => leafletApi.searchCards(applied!), enabled: applied !== null })
  const rows = result.data?.rows ?? []

  const run = useMutation({
    mutationFn: (preview: boolean) => leafletApi.exportCards(applied!, option, version, preview),
    onSuccess: (file, preview) => {
      download(file.blob, file.fileName)
      setMessage({ severity: 'success', text: preview ? 'Card export preview downloaded (not recorded).' : recordedText(file.headers, 'Cards exported') })
      if (!preview) void result.refetch()
    },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const search = () => { setMessage(null); setApplied({ ...c }) }
  const clear = () => { setC(cardEmpty); setApplied(null); setOption('Export New'); setVersion('Sihat Malaysia'); setMessage(null) }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {(result.error ?? options.error) && <Alert severity="error">{((result.error ?? options.error) as Error).message}</Alert>}
      <LegacyFrame title="Enter Criteria For Searching">
        <Box component="form" onSubmit={(e) => { e.preventDefault(); search() }} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {line(lbl('Single Member :'), small('Member No.'), T('memberNo'))}
            {line(lbl('Member No. Range :'), small('From'), T('memberFrom'), small('To', 30), T('memberTo'))}
            {line(lbl('Bordereaux Batch :'), small('Bordx Date'), D('bordxDate'), small('Batch No', 70), T('batchNo', 110, 'number'))}
            {line(lbl('Bordereaux Range :'), small('Bordx From'), D('bordxFrom'), small('To', 30), D('bordxTo'))}
            {line(lbl('Payor'),
              <TextField key="payor" select size="small" sx={{ ...box, width: 420 }} value={c.payor} onChange={set('payor')} slotProps={{ htmlInput: { 'aria-label': 'payor' } }}>
                <MenuItem value="">&nbsp;</MenuItem>{(o?.payors ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
              </TextField>)}
            {line(lbl('Print Option'),
              <TextField key="opt" select size="small" sx={{ ...box, width: 230 }} value={option} onChange={(e) => setOption(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'export option' } }}>
                {(o?.exportOptions ?? ['Export New']).map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </TextField>,
              small('Sequence', 75), S('sequence', o?.sequences ?? ['Membership No'], 200))}
            {line(lbl('Card Version'),
              <TextField key="ver" select size="small" sx={{ ...box, width: 230 }} value={version} onChange={(e) => setVersion(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'card version' } }}>
                {(o?.versions ?? ['Sihat Malaysia']).map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </TextField>)}
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Filled boxes are combined; the batch number applies only with a bordx date.</Typography>
            <button type="submit" hidden />
          </Box>
          <Buttons onSearch={search} onClear={clear} busy={result.isFetching} />
        </Box>
      </LegacyFrame>
      <Listing page={result.data} searched={applied !== null} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined" disabled={rows.length === 0 || run.isPending} onClick={() => { setMessage(null); run.mutate(true) }}>Print Preview</Button>
        <Button size="small" variant="contained" disabled={rows.length === 0 || run.isPending} onClick={() => { setMessage(null); run.mutate(false) }}>Print</Button>
      </Box>
    </Box>
  )
}

/** MCO Listing and Invoice: tabs of the legacy form whose search code was commented out, so they never produced anything from this screen. */
function InactiveTab({ what }: { what: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography sx={{ fontSize: 13 }}>
        The {what} tab had no working code in the legacy Leaflet &amp; Card form. {what === 'MCO Listing' ? 'MCO listings' : 'MCO invoices'} are produced
        from <Link component={RouterLink} to="/mco/fwhs-invoice">MCOFees &gt; MCO Inv/Listing</Link>.
      </Typography>
    </Paper>
  )
}

/**
 * Legacy: Membership > Leaflet & Card (frmReportMain, "Report"). Tabs Leaflet, MCO Listing, Invoice and Card Export. Leaflet prints Leaflet.rpt (one per member)
 * for a single member, a member range, a bordereaux batch or a bordereaux range; Card Export writes the card printer sheet. Both mark MBMPrinting.
 */
export function LeafletCardPage() {
  const [tab, setTab] = useState(0)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Report</LegacyTitle>
      <Tabs value={tab} onChange={(_, v: number) => setTab(v)}>
        <Tab label="Leaflet" /><Tab label="MCO Listing" /><Tab label="Invoice" /><Tab label="Card Export" />
      </Tabs>
      <Box hidden={tab !== 0}><LeafletTab /></Box>
      {tab === 1 && <InactiveTab what="MCO Listing" />}
      {tab === 2 && <InactiveTab what="Invoice" />}
      <Box hidden={tab !== 3}><CardExportTab /></Box>
    </Box>
  )
}
