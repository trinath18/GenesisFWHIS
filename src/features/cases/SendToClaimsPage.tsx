import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Tooltip, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { caseClaimabilityOptions, caseStatusOptions, cruDeptOptions, deptStageOptions, sendToClaimsApi, type SendToClaimsKind, type SendToClaimsRow, type SendToClaimsSearch } from '../../api/caseMenu'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'
import { toggleIn } from '../../lib/sets'
import { CodeSelect, DateRange, TickTable, type TickColumn } from './SendToShared'
import { LegacyEm } from '../../components/LegacyForm'

const empty = {
  caseNoFrom: '', caseNoTo: '', scan: true, caseStatus: '2', claimability: '', department: '', passedBy: '', versionFrom: '', versionTo: '',
  regFrom: '', regTo: '', noReg: false, admFrom: '', admTo: '', noAdm: false, disFrom: '', disTo: '', noDis: false, dpoFrom: '', dpoTo: '', noDpo: false,
}
type Criteria = typeof empty
const t = (s: string) => (s.trim() === '' ? null : s.trim())
const n = (s: string) => (s.trim() === '' ? null : Number(s))

function request(c: Criteria): SendToClaimsSearch {
  return {
    caseNoFrom: t(c.caseNoFrom), caseNoTo: c.scan ? null : t(c.caseNoTo), exactCase: c.scan, caseStatus: c.caseStatus || null, claimability: t(c.claimability), department: t(c.department), passedBy: t(c.passedBy),
    versionFrom: n(c.versionFrom), versionTo: n(c.versionTo), regFrom: t(c.regFrom), regTo: t(c.regTo), admFrom: t(c.admFrom), admTo: t(c.admTo), disFrom: t(c.disFrom), disTo: t(c.disTo), dpoFrom: t(c.dpoFrom), dpoTo: t(c.dpoTo),
    noRegDate: c.noReg, noAdmissionDate: c.noAdm, noDischargeDate: c.noDis, noDpo: c.noDpo,
  }
}

function columns(kind: SendToClaimsKind): TickColumn<SendToClaimsRow>[] {
  const rep = kind === 'rep'
  return [
    { header: 'Pass-On', cell: (r) => (r.passed ? 'Passed' : 'Not') }, { header: rep ? 'Case No' : 'Claim No', cell: (r) => r.caseNumber },
    ...(rep ? [] : [{ header: 'Version', cell: (r: SendToClaimsRow) => r.version }]),
    { header: "Mem'ship No", cell: (r) => r.memberNumber }, { header: 'Patient Name', cell: (r) => r.patientName }, { header: 'DOR', cell: (r) => formatDate(r.registered) },
    { header: 'DOA', cell: (r) => formatDate(r.admitted) }, { header: 'DOD', cell: (r) => formatDate(r.discharged) }, { header: 'DPO', cell: (r) => formatDate(r.dpo) },
    { header: 'No of Days (DPO-DOR)', cell: (r) => r.days, align: 'right' },
    ...(rep ? [{ header: 'Batch No', cell: (r: SendToClaimsRow) => r.batch }] : []),
    { header: 'Passed By', cell: (r) => r.passedBy }, { header: 'Reg. By', cell: (r) => r.openedBy }, { header: 'Hospital Name', cell: (r) => r.hospital },
    { header: 'Stay Type', cell: (r) => r.stayType }, { header: 'Cash Type', cell: (r) => r.cashType }, { header: 'Inv. Amount', cell: (r) => formatMoney(r.amount), align: 'right' },
    { header: 'Claimability', cell: (r) => r.claimability }, { header: 'Dept Stage', cell: (r) => r.deptStage },
  ]
}

/**
 * Legacy: Case > Send to Claims (Rep) (FrmCSRepSendtoClaim) and Case > CRU Send to Claims (FrmCRUPassOut).
 * Rep passes cases in a numbered daily batch; CRU passes claim versions with the Date Pass Out the user enters.
 */
export function SendToClaimsPage({ kind }: { kind: SendToClaimsKind }) {
  const api = sendToClaimsApi(kind)
  const rep = kind === 'rep'
  const passedBy = useQuery({ queryKey: ['send-to-claims-passed-by', kind], queryFn: api.passedBy })
  const [c, setC] = useState<Criteria>(empty)
  const [rows, setRows] = useState<SendToClaimsRow[]>([])
  const [truncated, setTruncated] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [passOut, setPassOut] = useState('')
  const [hideCriteria, setHideCriteria] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [lastSearch, setLastSearch] = useState<SendToClaimsSearch | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const key = (r: SendToClaimsRow) => (rep ? r.caseNumber : `${r.caseNumber}|${r.version}`)
  const set = (patch: Partial<Criteria>) => setC((x) => ({ ...x, ...patch }))
  const cols = columns(kind)

  const search = useMutation({
    mutationFn: (req: SendToClaimsSearch) => { setLastSearch(req); return api.search(req) },
    onSuccess: (r, req) => {
      setTruncated(r.truncated)
      if (req.exactCase) {
        // Use Scan adds each scanned case to the list; a case already listed is not added again ("Data has been uploaded!").
        const have = new Set(rows.map(key)); const fresh = r.rows.filter((x) => !have.has(key(x)))
        setMessage(r.rows.length === 0 ? { severity: 'warning', text: 'No record found!' } : fresh.length === 0 ? { severity: 'warning', text: 'Data has been uploaded!' } : null)
        setRows((x) => [...x, ...fresh]); set({ caseNoFrom: '' })
      } else {
        setRows(r.rows); setChecked(new Set())
        if (r.rows.length === 0) setMessage({ severity: 'warning', text: 'No record found!' })   // run() clears old messages; a re-list after Pass keeps its result
      }
    },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const pass = useMutation({
    mutationFn: () => {
      const ticked = rows.filter((r) => checked.has(key(r)))
      return rep ? api.passRep(ticked.map((r) => r.caseNumber)) : api.passCru(ticked.map((r) => ({ caseNumber: r.caseNumber, version: r.version ?? 0 })), passOut)
    },
    onSuccess: (r) => {
      setConfirming(false); setChecked(new Set()); passedBy.refetch()
      setMessage({ severity: 'success', text: `${r.message} ${r.count} record(s) passed${r.batch ? ` in batch ${r.batch}` : ''}.` })
      // Like the legacy form, list again so Passed, DPO and batch come from the database.
      if (lastSearch && !lastSearch.exactCase) search.mutate(lastSearch)
      else setRows([])
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const run = () => {
    setMessage(null)
    if (c.scan && !c.caseNoFrom.trim()) { setMessage({ severity: 'error', text: 'Please Enter Case No' }); return }
    search.mutate(request(c))
  }
  const toggle = (k: string) => {
    const r = rows.find((x) => key(x) === k)
    if (r?.cannotPass && !checked.has(k)) { setMessage({ severity: 'error', text: `${r.caseNumber}: ${r.cannotPass}` }); return }
    setChecked(toggleIn(k))
  }
  const checkAll = () => setChecked(new Set(rows.filter((r) => !r.cannotPass).map(key)))
  const range = (label: string, from: keyof Criteria, to: keyof Criteria, emptyKey: keyof Criteria) => (
    <DateRange label={label} from={c[from] as string} to={c[to] as string} empty={c[emptyKey] as boolean}
      onChange={(v) => set({ ...(v.from !== undefined ? { [from]: v.from } : {}), ...(v.to !== undefined ? { [to]: v.to } : {}), ...(v.empty !== undefined ? { [emptyKey]: v.empty } : {}) })} />
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">{rep ? 'Case Send to Claims (Repudiate)' : 'CRU Send to Claims'}</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {!hideCriteria && (
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" sx={{ width: '100%' }}>Selection Criteria</Typography>
          <TextField size="small" label="Case No" value={c.caseNoFrom} onChange={(e) => set({ caseNoFrom: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') run() }} sx={{ width: 150 }} slotProps={{ htmlInput: { maxLength: 15 }, inputLabel: { shrink: true } }} />
          {!c.scan && <TextField size="small" label="To" value={c.caseNoTo} onChange={(e) => set({ caseNoTo: e.target.value })} sx={{ width: 150 }} slotProps={{ htmlInput: { maxLength: 15 }, inputLabel: { shrink: true } }} />}
          <FormControlLabel control={<Checkbox size="small" checked={c.scan} onChange={(e) => { set({ scan: e.target.checked, caseNoTo: '' }); setRows([]); setChecked(new Set()) }} />} label="Use Scan" />
          {!rep && <>
            <TextField size="small" label="Version" value={c.versionFrom} onChange={(e) => set({ versionFrom: e.target.value.replace(/\D/g, '') })} sx={{ width: 90 }} slotProps={{ htmlInput: { maxLength: 3 }, inputLabel: { shrink: true } }} />
            <TextField size="small" label="To" value={c.versionTo} onChange={(e) => set({ versionTo: e.target.value.replace(/\D/g, '') })} sx={{ width: 90 }} slotProps={{ htmlInput: { maxLength: 3 }, inputLabel: { shrink: true } }} />
          </>}
          <TextField select size="small" label="Case Status" value={c.caseStatus} onChange={(e) => set({ caseStatus: e.target.value })} sx={{ width: 180 }}>
            {caseStatusOptions.map((o) => <MenuItem key={o.code} value={o.code}>{o.code} - {o.name}</MenuItem>)}
          </TextField>
          <CodeSelect label="Dept. Stage" value={c.department} options={rep ? deptStageOptions : cruDeptOptions} onChange={(v) => set({ department: v === '2' ? '' : v })} width={160} />
          <CodeSelect label="Claimability" value={c.claimability} options={caseClaimabilityOptions} onChange={(v) => set({ claimability: v })} width={170} />
          <TextField select size="small" label="Passed by" value={c.passedBy} onChange={(e) => set({ passedBy: e.target.value })} sx={{ width: 170 }} slotProps={{ inputLabel: { shrink: true } }}>
            <MenuItem value=""><em>(all)</em></MenuItem>{(passedBy.data ?? []).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          {range('DOR', 'regFrom', 'regTo', 'noReg')}{range('DOA', 'admFrom', 'admTo', 'noAdm')}{range('DOD', 'disFrom', 'disTo', 'noDis')}{range('DPO', 'dpoFrom', 'dpoTo', 'noDpo')}
          <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>* - Search Empty Data. With Use Scan, each scanned case is added to the list.</Typography>
        </Paper>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Button variant="contained" disabled={search.isPending} onClick={run}>Search</Button>
        <Button variant="outlined" disabled={rows.length === 0} onClick={checkAll}>Check All</Button>
        <Button variant="outlined" onClick={() => setHideCriteria((h) => !h)}>{hideCriteria ? 'Back' : 'View'}</Button>
        {!rep && <DateField label="Date Pass Out" value={passOut} onChange={setPassOut} sx={{ width: 160 }} />}
        <Tooltip title={!rep && !passOut ? 'Please Enter in date' : ''}>
          <span><Button variant="contained" color="secondary" disabled={checked.size === 0 || (!rep && !passOut) || pass.isPending} onClick={() => setConfirming(true)}>Pass to Claim</Button></span>
        </Tooltip>
        <Button variant="outlined" disabled={rows.length === 0} onClick={() => download(csvBlob(cols.map((x) => x.header), rows.map((r) => cols.map((x) => { const v = x.cell(r); return typeof v === 'string' || typeof v === 'number' ? v : '' }))), `${rep ? 'send-to-claims-rep' : 'cru-send-to-claims'}.csv`)}>Print to File</Button>
        <Button variant="outlined" onClick={() => { setC(empty); setRows([]); setChecked(new Set()); setMessage(null); setTruncated(false); setPassOut('') }}>Clear</Button>
      </Box>
      <TickTable rows={rows} rowKey={key} columns={cols} checked={checked} onToggle={toggle} empty="Enter the criteria and Search." />
      <Typography variant="body2"><LegacyEm>Records</LegacyEm> {rows.length}{truncated ? ' (first 3,000 shown; narrow the search)' : ''} · {checked.size} ticked
        {rep && rows.some((r) => r.cannotPass) ? ' · rows without registration, admission or discharge date or hospital, or already sent, cannot be ticked' : ''}</Typography>
      <ConfirmDialog open={confirming} busy={pass.isPending} title="Pass to Claim"
        message={rep ? `Do you want to update the record? ${checked.size} case(s) will be passed to Claims with today's date in a new batch.` : `Do you want to update the record? ${checked.size} claim version(s) will be passed to Claims with pass-out date ${formatDate(passOut)}.`}
        onConfirm={() => pass.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
