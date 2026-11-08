import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Tab, Tabs, TextField, Typography } from '@mui/material'
import { LegacyTitle } from '../../components/LegacyForm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { worksheetApi, type WorksheetSaveRequest, type WorksheetSaveResult, type WorksheetScreen } from '../../api/worksheets'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { RowsTable } from '../../components/DataTables'
import { DateField } from '../../components/DateField'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'
import { CaseSearchDialog } from '../cases/CaseSearchDialog'
import { WorksheetLegacyGrid } from './WorksheetLegacyGrid'
import { legacyMoney, type WorksheetModel } from './worksheetModel'
import { PickText } from '../../components/MemberFields'
import { useMemberLists } from '../../lib/memberLists'

type Fields = Omit<WorksheetSaveRequest, 'expectedFinalApproved' | 'limitOverrides' | 'exGratia'>
const empty: Fields = {
  worksheetStatus: '', remarks: null, debitCreditRemarks: null, note: null, payTo: null, bank: null, accountNo: null, address1: null, address2: null, address3: null,
  postCode: null, city: null, state: null, paymentMode: null, attention: null, gpName: null, lastDocDate: null,
}
const text = (v: string | null | undefined) => (v == null || v.trim() === '' ? null : v.trim())
const yellow = { '& .MuiInputBase-root': { bgcolor: 'legacy.readOnly' } }

/** Label on the left, box on the right, as on the legacy form. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2">{label}</Typography>{children}
    </Box>
  )
}

/**
 * The legacy worksheet form (frmNewWorksheet2010 "Register New Worksheet" / frmNewWSAdjust2010): case number with Go and Search, Case Clm, WS CLM and
 * Ex-Gratia across the top; the tabs Invoices & Diagnosis, Main WS, Reimbursement Not Cover, Combined WS, Topup WS and Remarks; the payee, address and
 * note panel with Close WS, Exc Letter, Export and Exit underneath. The page supplies the data and what Close WS does.
 */
export function WorksheetForm({ screen, title, caseNo, setCaseNo, onGo, loading, error, model, headerExtra, notice, initial, canSave, typed, setTyped, onRecalc,
  submit, onSaved, saveLabel = 'Close WS', savedVersion, showSaved = false }: {
  screen: WorksheetScreen; title: string; caseNo: string; setCaseNo: (v: string) => void; onGo: (caseNo?: string) => void; loading: boolean; error: unknown
  model: WorksheetModel | null; headerExtra?: ReactNode; notice?: ReactNode; initial?: Partial<WorksheetSaveRequest>; canSave: boolean
  typed: Record<number, string>; setTyped: (t: Record<number, string>) => void; onRecalc: (typed?: Record<number, string>) => void
  submit?: (r: WorksheetSaveRequest) => Promise<WorksheetSaveResult>; onSaved?: (r: WorksheetSaveResult) => void; saveLabel?: string; savedVersion?: number | null
  /** Read-only: show the status, remarks and payee the version was saved with (Worksheet Enquiry). */
  showSaved?: boolean
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState(1)
  const [searching, setSearching] = useState(false)
  const [f, setF] = useState<Fields>({ ...empty, ...Object.fromEntries(Object.entries(initial ?? {}).filter(([k]) => k in empty)) })
  const [exGratia, setExGratia] = useState(initial?.exGratia ?? false)
  const [getAdd, setGetAdd] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const set = (patch: Partial<Fields>) => setF((x) => ({ ...x, ...patch }))

  const lists = useMemberLists()
  const options = useQuery({ queryKey: ['worksheet-options', screen], queryFn: () => worksheetApi.options(screen), staleTime: 3_600_000 })
  const detail = useQuery({
    queryKey: ['worksheet-details', screen, model?.caseNumber, model?.version], enabled: !!model,
    queryFn: () => worksheetApi.details(screen, model!.caseNumber, model!.version),
  })
  const docsFor = savedVersion ?? null
  const docs = useQuery({
    queryKey: ['worksheet-documents', screen, model?.caseNumber, docsFor, model?.totals.finalApproved], enabled: !!model && docsFor != null,
    queryFn: () => worksheetApi.documents(screen, model!.caseNumber, docsFor!),
  })
  const d = detail.data
  const pick = (r: Partial<WorksheetSaveRequest> | null | undefined) => Object.fromEntries(Object.entries(r ?? {}).filter(([k]) => k in empty)) as Partial<Fields>
  const v: Fields = showSaved ? { ...empty, ...pick(d?.saved) } : f
  const vExGratia = showSaved ? d?.saved?.exGratia ?? false : exGratia
  // Legacy: the last document date comes from the invoices unless the officer types one.
  const lastDoc = showSaved ? d?.saved?.lastDocDate ?? null : f.lastDocDate ?? d?.lastDocDate ?? null

  const save = useMutation({
    mutationFn: () => submit!({
      ...(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, k === 'worksheetStatus' ? v : text(v as string | null)])) as Fields),
      lastDocDate: lastDoc, expectedFinalApproved: model!.totals.finalApproved, exGratia,
      limitOverrides: Object.fromEntries(Object.entries(typed).filter(([, v]) => v.trim() !== '')),
    }),
    onSuccess: (r) => { setConfirming(false); onSaved?.(r) },
    onError: () => setConfirming(false),
  })
  const getDoc = async (kind: string) => {
    setDocError(null)
    try { download(await worksheetApi.document(screen, model!.caseNumber, docsFor!, kind), `${kind}-${model!.caseNumber}-${docsFor}.${kind === 'worksheet' ? 'xlsx' : 'pdf'}`) }
    catch (e) { setDocError((e as Error).message) }
  }
  const toggleGetAdd = (on: boolean) => {
    setGetAdd(on)
    set(on && d ? { payTo: d.memberName, address1: d.address1, address2: d.address2, address3: d.address3, postCode: d.postCode, city: d.city, state: d.state }
      : { payTo: null, address1: null, address2: null, address3: null, postCode: null, city: null, state: null })
  }
  const field = (key: keyof Fields, max: number) => (
    <TextField size="small" fullWidth value={v[key] ?? ''} disabled={!canSave} onChange={(e) => set({ [key]: e.target.value })} slotProps={{ htmlInput: { maxLength: max } }} />
  )
  const mine = d?.invoices.filter((i) => i.version === model?.version) ?? []
  const has = (k: string) => docs.data?.available.includes(k) ?? false
  const err = error ?? save.error

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>{title}</LegacyTitle>

      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2">Case Num</Typography>
        <TextField size="small" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) onGo() }} slotProps={{ htmlInput: { maxLength: 20 } }} sx={{ width: 150 }} />
        <Button variant="outlined" size="small" disabled={!caseNo.trim() || loading} onClick={() => onGo()}>Go</Button>
        <Button variant="outlined" size="small" onClick={() => setSearching(true)}>Search</Button>
        <Typography variant="body2" sx={{ ml: 1 }}>Case Clm</Typography>
        <TextField size="small" value={model?.claimability ?? ''} slotProps={{ input: { readOnly: true } }} sx={{ width: 110, ...yellow }} />
        <Typography variant="body2" sx={{ ml: 1 }}>WS CLM</Typography>
        <TextField select size="small" value={v.worksheetStatus ?? ''} disabled={!canSave} onChange={(e) => set({ worksheetStatus: e.target.value })} sx={{ width: 230 }}>
          <MenuItem value=""><em>Select</em></MenuItem>
          {(options.data?.statuses ?? []).map((s) => <MenuItem key={s.code} value={s.code}>{s.code} - {s.name}</MenuItem>)}
        </TextField>
        {headerExtra}
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2">Ex-Gratia</Typography>
        <TextField select size="small" value={vExGratia ? 'Y' : 'N'} disabled={!canSave} onChange={(e) => setExGratia(e.target.value === 'Y')} sx={{ width: 110 }}>
          <MenuItem value="Y">Y - Yes</MenuItem><MenuItem value="N">N - No</MenuItem>
        </TextField>
      </Paper>
      <CaseSearchDialog open={searching} onClose={() => setSearching(false)} onPick={(no) => { setSearching(false); setCaseNo(no); onGo(no) }} />

      {!!err && <Alert severity="error">{(err as Error).message}</Alert>}
      {notice}

      {model && (
        <>
          <Paper variant="outlined">
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none' } }}>
              <Tab label="Invoices & Diagnosis" /><Tab label="Main WS" /><Tab label="Reimbursement Not Cover" /><Tab label="Combined WS" /><Tab label="Topup WS" /><Tab label="Remarks" />
            </Tabs>
            <Box sx={{ p: 1.5 }}>
              {tab === 0 && (d ? (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
                    {([
                      ['Mem Num', d.memberNumber], ['Mem Name', d.memberName], ['Patient Name', d.patientName], ['Pol Num', d.policyNo], ['Plan Code', d.planCode], ['Payor', d.payor],
                      ['Eff Date', formatDate(d.policyEffective)], ['Exp Date', formatDate(d.policyExpiry)], ['GRP Com.', d.groupCompany], ['Hospital', d.hospital], ['DOA', formatDate(d.admitted)],
                      ['DOD', formatDate(d.discharged)], ['Cas Status', d.caseStatus], ['Disability', d.disability], ['ICD Code', d.icdCodes], ['Remark', d.caseRemark],
                      ['Address', [d.address1, d.address2, d.address3].filter(Boolean).join(', ')], ['Post Code', [d.postCode, d.city, d.state].filter(Boolean).join(' ')],
                    ] as [string, string | null][]).map(([l, v]) => (
                      <Row key={l} label={l}><TextField size="small" value={v ?? ''} slotProps={{ input: { readOnly: true } }} /></Row>
                    ))}
                  </Box>
                  <Typography variant="subtitle2">Invoices</Typography>
                  <RowsTable rows={d.invoices} empty="No invoices for this case." columns={[
                    { header: 'WS', cell: (r) => (r.inWorksheet ? 'Y' : 'N') }, { header: 'WS No', cell: (r) => r.version ?? '' }, { header: 'Bordx', cell: (r) => (r.inBordx ? 'Y' : 'N') },
                    { header: 'Inv No', cell: (r) => r.invoiceNo }, { header: 'Inv Date', cell: (r) => formatDate(r.invoiceDate) }, { header: 'INV Amount', align: 'right', cell: (r) => formatMoney(r.amount) },
                    { header: 'Pay To', cell: (r) => r.payTo }, { header: 'Payee', cell: (r) => r.payeeName ?? r.payee }, { header: 'Fol. Up Date', cell: (r) => formatDate(r.followUpDate) },
                  ]} />
                  <Typography variant="subtitle2">Diagnosis</Typography>
                  <RowsTable rows={d.diagnoses} empty="No final diagnosis." columns={[
                    { header: 'Diag Desc', cell: (r) => r.description }, { header: 'Date On-Set', cell: (r) => formatDate(r.onset) }, { header: 'ICD Code', cell: (r) => r.icdCode },
                  ]} />
                </Box>
              ) : <Typography variant="body2">Loading…</Typography>)}

              {tab === 1 && (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
                    <Box sx={{ display: 'grid', gap: 0.5 }}>
                      <Row label="Invoice Num"><TextField size="small" value={mine.map((i) => i.invoiceNo).join(', ')} slotProps={{ input: { readOnly: true } }} /></Row>
                      <Row label="Invoice Date"><TextField size="small" value={mine.map((i) => formatDate(i.invoiceDate)).join(', ')} slotProps={{ input: { readOnly: true } }} /></Row>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                        <Row label="Bal Lmt"><TextField size="small" value={model.annualBalance == null ? '' : legacyMoney(model.annualBalance)} slotProps={{ input: { readOnly: true } }} /></Row>
                        <Row label="Topup Lmt"><TextField size="small" value="" slotProps={{ input: { readOnly: true } }} /></Row>
                        <Row label="Lifetime Lmt"><TextField size="small" value="" slotProps={{ input: { readOnly: true } }} /></Row>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gap: 0.5, alignContent: 'start' }}>
                      <Row label="Per Dis. Lmt"><TextField size="small" value="" slotProps={{ input: { readOnly: true } }} /></Row>
                      <Row label="T/O Lmt"><TextField size="small" value="" slotProps={{ input: { readOnly: true } }} /></Row>
                    </Box>
                  </Box>
                  {!model.claimable && <Alert severity="warning" sx={{ py: 0 }}>The case is not claimable ({model.claimability ?? '-'}), so no benefits are approved.</Alert>}
                  {model.totals.limitExceeded ? <Alert severity="warning" sx={{ py: 0 }}>The approved amount exceeds the annual balance of {formatMoney(model.annualBalance)}; the final total is capped.</Alert> : null}
                  <WorksheetLegacyGrid lines={model.lines} daysAtLimit={model.daysAtLimit} totals={model.totals}
                    typed={typed} onType={canSave && model.claimable ? (row, v) => setTyped({ ...typed, [row]: v }) : undefined} onCommit={() => onRecalc()} />
                  {canSave && model.claimable && (
                    <Typography variant="caption" color="text.secondary">
                      Type a limit (an amount, a negative deduction or FULL) in the Limit column; the worksheet recalculates when you leave the cell.
                      {Object.keys(typed).length > 0 && <Button size="small" sx={{ ml: 1 }} onClick={() => { setTyped({}); onRecalc({}) }}>Clear typed limits</Button>}
                    </Typography>
                  )}
                </Box>
              )}

              {tab === 2 && (
                <Box sx={{ maxWidth: 520 }}>
                  <Typography variant="subtitle2" gutterBottom>Other Not Claimable Items</Typography>
                  <RowsTable rows={d?.notCovered ?? []} empty="No items." columns={[
                    { header: 'Items', cell: (r) => r.label }, { header: 'Amount (RM)', align: 'right', cell: (r) => legacyMoney(r.amount) },
                  ]} />
                </Box>
              )}

              {tab === 3 && <WorksheetLegacyGrid lines={model.lines} daysAtLimit={model.daysAtLimit} totals={model.totals} />}

              {tab === 4 && <Alert severity="info">This member has no top-up policy, so there is no top-up worksheet.</Alert>}

              {tab === 5 && (
                <Box sx={{ display: 'grid', gap: 1.5, maxWidth: 800 }}>
                  <TextField label="Worksheet remarks" multiline minRows={3} value={v.remarks ?? ''} disabled={!canSave} onChange={(e) => set({ remarks: e.target.value })} slotProps={{ htmlInput: { maxLength: 160 } }} />
                  <TextField label="Credit/Debit Note Remarks" multiline minRows={3} value={v.debitCreditRemarks ?? ''} disabled={!canSave} onChange={(e) => set({ debitCreditRemarks: e.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} />
                </Box>
              )}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1.2fr 1fr' } }}>
            <Box sx={{ display: 'grid', gap: 0.5, alignContent: 'start' }}>
              <Row label="Pay To">{field('payTo', 50)}</Row>
              <Row label="GP">{field('gpName', 50)}</Row>
              <Row label="Bank">
                <TextField select size="small" fullWidth value={v.bank ?? ''} disabled={!canSave} onChange={(e) => set({ bank: e.target.value || null })}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {(options.data?.banks ?? []).map((b) => <MenuItem key={b.name} value={b.name}>{b.name}</MenuItem>)}
                  {v.bank && !options.data?.banks.some((b) => b.name === v.bank) && <MenuItem value={v.bank}>{v.bank}</MenuItem>}
                </TextField>
              </Row>
              <Row label="A/C">{field('accountNo', 30)}</Row>
              <Row label="Pymt Mode">
                <TextField select size="small" fullWidth value={v.paymentMode ?? ''} disabled={!canSave} onChange={(e) => set({ paymentMode: e.target.value || null })}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {(options.data?.paymentModes ?? []).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Row>
              <Row label="Attention">{field('attention', 60)}</Row>
            </Box>
            <Box sx={{ display: 'grid', gap: 0.5, alignContent: 'start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel label="Get Add" control={<Checkbox size="small" checked={getAdd} disabled={!canSave || !d} onChange={(e) => toggleGetAdd(e.target.checked)} />} />
                <Typography variant="body2">WS No</Typography>
                <TextField size="small" value={`${model.caseNumber}-${model.version}`} slotProps={{ input: { readOnly: true } }} sx={{ width: 160, ...yellow }} />
              </Box>
              <Row label="Add 1">{field('address1', 50)}</Row>
              <Row label="Add 2">{field('address2', 50)}</Row>
              <Row label="Add 3">{field('address3', 50)}</Row>
              <Row label="Post Code">
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', gap: 1, alignItems: 'center' }}>
                  {field('postCode', 6)}<Typography variant="body2" align="center">City</Typography><PickText value={v.city ?? ''} onChange={(x) => set({ city: x })} options={lists.data?.cities ?? []} max={50} disabled={!canSave} sx={{ width: '100%', minWidth: 0 }} />
                </Box>
              </Row>
              <Row label="State">
                <TextField select size="small" fullWidth value={v.state ?? ''} disabled={!canSave} onChange={(e) => set({ state: e.target.value || null })}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {(options.data?.states ?? []).map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
                  {v.state && !options.data?.states.some((s) => s.code === v.state) && <MenuItem value={v.state}>{v.state}</MenuItem>}
                </TextField>
              </Row>
              <Row label="Last Doc."><DateField value={lastDoc ?? ''} disabled={!canSave} onChange={(iso) => set({ lastDocDate: iso || null })} /></Row>
            </Box>
            <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>
              <Typography variant="body2">Note</Typography>
              <TextField multiline minRows={3} value={v.note ?? ''} disabled={!canSave} onChange={(e) => set({ note: e.target.value })} slotProps={{ htmlInput: { maxLength: 100 } }} />
              <Paper variant="outlined" sx={{ p: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {submit && <Button variant="outlined" disabled={!canSave || model.invoices.length === 0 || save.isPending} onClick={() => setConfirming(true)}>{saveLabel}</Button>}
                <Button variant="outlined" disabled={!has('excess-letter')} onClick={() => getDoc('excess-letter')}>Exc Letter</Button>
                <Button variant="outlined" disabled={!has('worksheet')} onClick={() => getDoc('worksheet')}>Export</Button>
                <Button variant="outlined" onClick={() => navigate('/')}>Exit</Button>
                {(has('credit-note') || has('debit-note') || has('cheque-letter')) && (
                  <>
                    {has('credit-note') && <Button variant="outlined" onClick={() => getDoc('credit-note')}>CN Note</Button>}
                    {has('debit-note') && <Button variant="outlined" onClick={() => getDoc('debit-note')}>DN Note</Button>}
                    {has('cheque-letter') && <Button variant="outlined" onClick={() => getDoc('cheque-letter')}>Chq Letter</Button>}
                  </>
                )}
              </Paper>
              {docs.data?.debitCreditNote && <Typography variant="body2">{docs.data.debitCreditNote.startsWith('D') ? 'Debit' : 'Credit'} No : {docs.data.debitCreditNote}</Typography>}
              {docError && <Alert severity="error" sx={{ py: 0 }}>{docError}</Alert>}
              <Typography variant="body2" color="text.secondary">
                Final {formatMoney(model.totals.finalApproved)} · Hospital {formatMoney(model.totals.payableToHospital)} · Member {formatMoney(model.totals.payableToMember)}
              </Typography>
            </Box>
          </Paper>
          <ConfirmDialog open={confirming} busy={save.isPending} title={saveLabel}
            message={`${saveLabel === 'Close WS' ? 'Save' : 'Rewrite'} worksheet ${model.caseNumber}-${model.version} for ${formatMoney(model.totals.finalApproved)}?`}
            onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
        </>
      )}
    </Box>
  )
}
