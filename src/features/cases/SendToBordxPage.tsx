import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { caseStatusOptions, cashTypeOptions, deptStageOptions, sendToBordxApi, stayTypeOptions, worksheetClaimabilityOptions, type BordxRow, type BordxSearchRequest } from '../../api/caseMenu'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'
import { toggleIn } from '../../lib/sets'
import { CodeSelect, DateRange, TickTable, type TickColumn } from './SendToShared'

const empty = {
  caseNoFrom: '', caseNoTo: '', scan: true, bordxFrom: '', bordxTo: '', versionFrom: '', versionTo: '', caseStatus: '', claimability: '', department: '', passedBy: '', payor: '', stayType: '', cashType: '',
  regFrom: '', regTo: '', noReg: false, admFrom: '', admTo: '', noAdm: false, disFrom: '', disTo: '', noDis: false, dpoFrom: '', dpoTo: '', noDpo: false, bdFrom: '', bdTo: '',
}
type Criteria = typeof empty
const key = (r: { caseNumber: string; version: number }) => `${r.caseNumber}|${r.version}`
const t = (s: string) => (s.trim() === '' ? null : s.trim())
const n = (s: string) => (s.trim() === '' ? null : Number(s))
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

function request(c: Criteria): BordxSearchRequest {
  return {
    caseNoFrom: t(c.caseNoFrom), caseNoTo: c.scan ? null : t(c.caseNoTo), exactCase: c.scan, bordxFrom: t(c.bordxFrom), bordxTo: t(c.bordxTo), versionFrom: n(c.versionFrom), versionTo: n(c.versionTo),
    caseStatus: t(c.caseStatus), claimability: t(c.claimability), department: t(c.department), passedBy: t(c.passedBy), regFrom: t(c.regFrom), regTo: t(c.regTo), admFrom: t(c.admFrom), admTo: t(c.admTo),
    disFrom: t(c.disFrom), disTo: t(c.disTo), dpoFrom: t(c.dpoFrom), dpoTo: t(c.dpoTo), bordxDateFrom: t(c.bdFrom), bordxDateTo: t(c.bdTo), noAdmissionDate: c.noAdm, noRegDate: c.noReg, noDischargeDate: c.noDis, noDpo: c.noDpo,
    payor: t(c.payor), stayType: t(c.stayType), cashType: t(c.cashType),
  }
}

const columns: TickColumn<BordxRow>[] = [
  { header: 'Pass-On', cell: (r) => (r.passed ? 'Passed' : 'Not') }, { header: 'Claim No', cell: (r) => r.caseNumber }, { header: 'Version', cell: (r) => r.version }, { header: "Mem'ship No", cell: (r) => r.memberNumber },
  { header: 'Patient Name', cell: (r) => r.patientName }, { header: 'DOR', cell: (r) => formatDate(r.registered) }, { header: 'DOA', cell: (r) => formatDate(r.admitted) }, { header: 'DOD', cell: (r) => formatDate(r.discharged) },
  { header: 'DPO', cell: (r) => formatDate(r.dpo) }, { header: 'No of Days', cell: (r) => r.days, align: 'right' }, { header: 'Batch No', cell: (r) => r.batch }, { header: 'Passed By', cell: (r) => r.passedBy },
  { header: 'Reg. By', cell: (r) => r.openedBy }, { header: 'Hospital', cell: (r) => r.hospital }, { header: 'S.Type', cell: (r) => r.stayType }, { header: 'C.Type', cell: (r) => r.cashType },
  { header: 'App.Amount', cell: (r) => formatMoney(r.bordxAmount), align: 'right' }, { header: 'Claimability', cell: (r) => r.claimStatus }, { header: 'Dept Stage', cell: (r) => (r.passed ? 'Claim' : 'Admission') },
  { header: 'Bordx No', cell: (r) => r.bordxRefNo }, { header: 'Bordx Date', cell: (r) => formatDate(r.bordxDate) },
]

/** Legacy: Case > Send to Bordx Unit (FrmCSSendtoClaim). Search claim versions, tick them and pass them to the Bordx Unit in a numbered daily batch; Amend changes or clears the DPO. */
export function SendToBordxPage() {
  const { user } = useAuth()
  const options = useQuery({ queryKey: ['send-to-bordx-options'], queryFn: sendToBordxApi.options })
  const [c, setC] = useState<Criteria>(empty)
  const [rows, setRows] = useState<BordxRow[]>([])
  const [truncated, setTruncated] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [hideCriteria, setHideCriteria] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [amending, setAmending] = useState<{ row: BordxRow; dpo: string } | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)
  const set = (patch: Partial<Criteria>) => setC((x) => ({ ...x, ...patch }))
  const field = (k: keyof Criteria, label: string, width = 150, max = 30) => <TextField size="small" label={label} value={c[k] as string} onChange={(e) => set({ [k]: e.target.value })} sx={{ width }} slotProps={{ htmlInput: { maxLength: max }, inputLabel: { shrink: true } }} />

  const [lastSearch, setLastSearch] = useState<BordxSearchRequest | null>(null)
  const search = useMutation({
    mutationFn: (req: BordxSearchRequest) => { setLastSearch(req); return sendToBordxApi.search(req) },
    onSuccess: (r) => {
      setTruncated(r.truncated)
      if (c.scan) {
        // Scan mode adds the scanned claim to the list, like the legacy form; a claim already listed is not added twice.
        const have = new Set(rows.map(key)); const fresh = r.rows.filter((x) => !have.has(key(x)))
        if (r.rows.length > 0 && fresh.length === 0) setMessage({ severity: 'warning', text: 'Data has been uploaded!' })
        else if (r.rows.length === 0) setMessage({ severity: 'warning', text: 'Record Not Found!' })
        else setMessage(null)
        setRows((x) => [...x, ...fresh]); setChecked((s) => new Set([...s, ...fresh.map(key)])); set({ caseNoFrom: '' })
      } else {
        setRows(r.rows); setChecked(new Set()); setSelected(null)
        if (r.rows.length === 0) setMessage({ severity: 'warning', text: 'Record Not Found!' })   // run() clears old messages; a re-list after Pass keeps its result
      }
    },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const pass = useMutation({
    mutationFn: () => sendToBordxApi.pass(rows.filter((r) => checked.has(key(r))).map((r) => ({ caseNumber: r.caseNumber, version: r.version }))),
    onSuccess: (r) => {
      setConfirming(false); setMessage({ severity: 'success', text: `${r.message} ${r.count} record(s) passed in batch ${r.batch}.` })
      const done = new Set(checked); setChecked(new Set()); options.refetch()
      // Like the legacy form, list the records again so DPO, batch and passed-by come from the database.
      if (!c.scan && lastSearch) search.mutate(lastSearch)
      else setRows((x) => x.map((row) => (done.has(key(row)) ? { ...row, passed: true, batch: r.batch, dpo: today(), passedBy: user?.userId ?? row.passedBy } : row)))
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const amend = useMutation({
    mutationFn: (a: { row: BordxRow; dpo: string }) => sendToBordxApi.amend(a.row.caseNumber, a.row.version, a.dpo || null),
    onSuccess: (_, a) => {
      setAmending(null); setMessage({ severity: 'success', text: a.dpo ? 'Record updated...' : 'DPO cleared; the record is back at the admission stage.' })
      setRows((x) => x.map((row) => (key(row) === key(a.row) ? { ...row, dpo: a.dpo || null, passed: !!a.dpo, batch: a.dpo ? row.batch : null, passedBy: a.dpo ? row.passedBy : null } : row)))
    },
    onError: (e) => { setAmending(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const run = () => {
    setMessage(null)
    if (c.scan && !c.caseNoFrom.trim()) { setMessage({ severity: 'error', text: 'Please Enter Case No' }); return }
    search.mutate(request(c))
  }
  const exportFile = () => download(csvBlob(columns.map((x) => x.header), rows.map((r) => [r.passed ? 'Passed' : 'Not', r.caseNumber, r.version, r.memberNumber, r.patientName, formatDate(r.registered), formatDate(r.admitted), formatDate(r.discharged),
    formatDate(r.dpo), r.days, r.batch, r.passedBy, r.openedBy, r.hospital, r.stayType, r.cashType, r.bordxAmount, r.claimStatus, r.passed ? 'Claim' : 'Admission', r.bordxRefNo, formatDate(r.bordxDate)])), 'send-to-bordx.csv')
  const selectedRow = rows.find((r) => key(r) === selected) ?? null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Send to Bordx Unit</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {!hideCriteria && (
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" sx={{ width: '100%' }}>Selection Criteria</Typography>
          <TextField size="small" label="Claim No" value={c.caseNoFrom} onChange={(e) => set({ caseNoFrom: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') run() }} sx={{ width: 150 }} slotProps={{ htmlInput: { maxLength: 15 }, inputLabel: { shrink: true } }} />
          {!c.scan && field('caseNoTo', 'To', 150, 15)}
          <FormControlLabel control={<Checkbox size="small" checked={c.scan} onChange={(e) => { set({ scan: e.target.checked, caseNoTo: '' }) }} />} label="Use Scan" />
          {field('bordxFrom', 'Bordx')}{field('bordxTo', 'To')}
          {field('versionFrom', 'Version from', 110, 4)}{field('versionTo', 'To', 90, 4)}
          <CodeSelect label="Case Status" value={c.caseStatus} options={caseStatusOptions} onChange={(v) => set({ caseStatus: v })} width={170} />
          <CodeSelect label="Dept. Stage" value={c.department} options={deptStageOptions} onChange={(v) => set({ department: v })} width={160} />
          <CodeSelect label="Claimability" value={c.claimability} options={worksheetClaimabilityOptions} onChange={(v) => set({ claimability: v })} width={230} />
          <TextField select size="small" label="Passed by" value={c.passedBy} onChange={(e) => set({ passedBy: e.target.value })} sx={{ width: 170 }} slotProps={{ inputLabel: { shrink: true } }}>
            <MenuItem value=""><em>(all)</em></MenuItem>{(options.data?.passedBy ?? []).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <CodeSelect label="Payor" value={c.payor} options={options.data?.payors ?? []} onChange={(v) => set({ payor: v })} width={260} />
          <CodeSelect label="Stay Type" value={c.stayType} options={stayTypeOptions} onChange={(v) => set({ stayType: v })} width={200} />
          <CodeSelect label="Cash Type" value={c.cashType} options={cashTypeOptions} onChange={(v) => set({ cashType: v })} width={190} />
          <DateRange label="DOR" from={c.regFrom} to={c.regTo} empty={c.noReg} onChange={(v) => set({ ...(v.from !== undefined && { regFrom: v.from }), ...(v.to !== undefined && { regTo: v.to }), ...(v.empty !== undefined && { noReg: v.empty }) })} />
          <DateRange label="DOA" from={c.admFrom} to={c.admTo} empty={c.noAdm} onChange={(v) => set({ ...(v.from !== undefined && { admFrom: v.from }), ...(v.to !== undefined && { admTo: v.to }), ...(v.empty !== undefined && { noAdm: v.empty }) })} />
          <DateRange label="DOD" from={c.disFrom} to={c.disTo} empty={c.noDis} onChange={(v) => set({ ...(v.from !== undefined && { disFrom: v.from }), ...(v.to !== undefined && { disTo: v.to }), ...(v.empty !== undefined && { noDis: v.empty }) })} />
          <DateRange label="DPO" from={c.dpoFrom} to={c.dpoTo} empty={c.noDpo} onChange={(v) => set({ ...(v.from !== undefined && { dpoFrom: v.from }), ...(v.to !== undefined && { dpoTo: v.to }), ...(v.empty !== undefined && { noDpo: v.empty }) })} />
          <DateRange label="Bordx Date" from={c.bdFrom} to={c.bdTo} onChange={(v) => set({ ...(v.from !== undefined && { bdFrom: v.from }), ...(v.to !== undefined && { bdTo: v.to }) })} />
          <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>* - Search Empty Data. With Use Scan, each scanned claim is added to the list.</Typography>
        </Paper>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" disabled={search.isPending} onClick={run}>Search</Button>
        <Button variant="outlined" disabled={rows.length === 0} onClick={() => setChecked(new Set(rows.map(key)))}>Check All</Button>
        <Button variant="outlined" onClick={() => setHideCriteria((h) => !h)}>{hideCriteria ? 'Back' : 'View'}</Button>
        <Button variant="contained" color="secondary" disabled={checked.size === 0 || pass.isPending} onClick={() => setConfirming(true)}>Pass to BU</Button>
        <Button variant="outlined" disabled={!selectedRow?.passed} title={selectedRow && !selectedRow.passed ? 'Only a record already passed to the Bordx Unit can be amended.' : 'Click a row to select it'} onClick={() => selectedRow && setAmending({ row: selectedRow, dpo: selectedRow.dpo ?? '' })}>Amend</Button>
        <Button variant="outlined" disabled={rows.length === 0} onClick={exportFile}>Print to File</Button>
        <Button variant="outlined" onClick={() => { setC(empty); setRows([]); setChecked(new Set()); setSelected(null); setMessage(null); setTruncated(false) }}>Clear</Button>
      </Box>
      <TickTable rows={rows} rowKey={key} columns={columns} checked={checked} onToggle={(k) => setChecked(toggleIn(k))} selected={selected} onSelect={setSelected} empty="Enter the criteria and Search." />
      <Typography variant="body2"><strong style={{ color: '#c62828' }}>Records</strong> {rows.length}{truncated ? ' (first 3,000 shown; narrow the search)' : ''} · {checked.size} ticked</Typography>
      <ConfirmDialog open={confirming} busy={pass.isPending} title="Pass to Bordx Unit" message={`Do you want to update the record? ${checked.size} claim version(s) will be passed to the Bordx Unit with today's DPO in a new batch.`} onConfirm={() => pass.mutate()} onCancel={() => setConfirming(false)} />
      <Dialog open={!!amending} onClose={() => setAmending(null)}>
        <DialogTitle>Amend DPO - {amending?.row.caseNumber} v{amending?.row.version}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <DateField label="DPO" value={amending?.dpo ?? ''} onChange={(iso) => setAmending((a) => (a ? { ...a, dpo: iso } : a))} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Leave the date empty to take the record back to the admission stage.</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setAmending(null)}>Cancel</Button><Button variant="contained" disabled={amend.isPending} onClick={() => amending && amend.mutate(amending)}>Update</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
