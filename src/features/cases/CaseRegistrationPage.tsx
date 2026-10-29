import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CaseAfterRegistration } from './CaseAfterRegistration'
import { CaseRegistrationTabs } from './CaseRegistrationTabs'
import { ApiError } from '../../api/client'
import { caseAdjustmentApi, caseRegistrationApi, type CaseDiagnosis, type CaseMemberView, type CaseRegistrationRequest } from '../../api/caseRegistration'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'
import { formatMoney } from '../../lib/format'

const yn = [['N', 'N - No'], ['Y', 'Y - Yes']]
const blank = {
  patientId: '', claimability: 'AA', hospitalCode: '', hospitalName: '', dateAdmitted: '', dateDischarge: '', pending: 'N', reserve: '', lg: '', lgTime: '', payType: 'C', stayType: 'I', modality: '', nature: '', special: '', topUp: 'N', query: 'N', link: '',
  referredBy: '', reason: '', docDate: '', policyYear: '', esp: '', takeOverInd: 'N', takeOverAmt: '', takeOverPlan: '', intExt: '', age: '', ageUnit: 'Y', firstCall: '', firstTreated: '', payPending: 'N', followUp: 'N', recur: 'N', followReq: 'N',
  remarks: ['', '', '', '', ''], first: [{ code: '', text: '', date: '' }, { code: '', text: '', date: '' }, { code: '', text: '', date: '' }], final: [{ code: '', text: '', date: '' }, { code: '', text: '', date: '' }, { code: '', text: '', date: '' }],
  ud: [{ code: '', text: '', date: '' }, { code: '', text: '', date: '' }, { code: '', text: '', date: '' }], rep: ['', '', ''], document: '', personnel: '', attention: '', underlying: 'N', deduction: '',
  docs: ['', '', '', '', ''], anae: ['', '', ''], procs: Array.from({ length: 6 }, () => ({ text: '', cpt: '' })), nons: Array.from({ length: 6 }, () => ({ text: '', cpt: '' })), invs: Array.from({ length: 3 }, () => ({ done: '', code: '' })), med: ['', '', ''], firstDoc: '', subDoc: '',
}
type Form = typeof blank
const dmyText = (iso: string) => (iso ? toDmy(iso) : null)
const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))
const dmyToIso = (s: string | null) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s ?? ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
const pad = <T,>(list: T[] | null | undefined, n: number, empty: T): T[] => { const x = [...(list ?? [])]; while (x.length < n) x.push(empty); return x.slice(0, n) }
const toDiag = (l: CaseDiagnosis[] | null | undefined) => pad((l ?? []).map((d) => ({ code: d.code ?? '', text: d.text ?? '', date: d.date ?? '' })), 3, { code: '', text: '', date: '' })
const toForm = (r: CaseRegistrationRequest): Form => ({
  ...blank, patientId: r.patientId, claimability: r.claimability, hospitalCode: r.hospitalCode, hospitalName: r.hospitalName ?? '', dateAdmitted: r.dateAdmitted ?? '', dateDischarge: r.dateDischarge ?? '', pending: r.pending ?? '', reserve: str(r.reserveAmount), lg: str(r.lgAmount),
  lgTime: r.lgTime ?? '', payType: r.payType, stayType: r.stayType ?? '', modality: r.modality ?? '', nature: r.nature ?? '', special: r.specialApproval ?? '', topUp: r.topUpLimit ?? 'N', query: r.query ?? 'N', link: r.linkCaseNo ?? '', referredBy: r.referredBy ?? '', reason: r.admissionReason ?? '',
  docDate: r.docReceivedDate ?? '', policyYear: str(r.policyYear), esp: r.espRefNo ?? '', takeOverInd: r.takeOverInd ?? 'N', takeOverAmt: str(r.takeOverAmount), takeOverPlan: r.takeOverPlan ?? '', intExt: r.intExtTakeOver ?? '', age: r.patientAge ?? '', ageUnit: r.ageUnit ?? 'Y',
  firstCall: dmyToIso(r.firstCall), firstTreated: dmyToIso(r.firstTreated), payPending: r.payPending ?? 'N', followUp: r.followUp ?? 'N', recur: r.conditionWillRecur ?? 'N', followReq: r.followUpRequired ?? 'N', remarks: pad(r.remarks, 5, ''),
  first: toDiag(r.firstDiagnosis), final: toDiag(r.finalDiagnosis), ud: toDiag(r.underlyingDiagnosis), rep: pad(r.repudiationCodes, 3, ''), document: r.document ?? '', personnel: r.personnel ?? '', attention: r.attention ?? '', underlying: r.underlying ? 'Y' : 'N', deduction: str(r.deductionAmount),
  docs: pad(r.attendingDoctors, 5, ''), anae: pad(r.anaesthetists, 3, ''), procs: pad((r.procedures ?? []).map((p) => ({ text: p.text ?? '', cpt: p.cptCode ?? '' })), 6, { text: '', cpt: '' }), nons: pad((r.nonSurgicalProcedures ?? []).map((p) => ({ text: p.text ?? '', cpt: p.cptCode ?? '' })), 6, { text: '', cpt: '' }),
  invs: pad((r.investigations ?? []).map((i) => ({ done: i.done ?? '', code: i.code ?? '' })), 3, { done: '', code: '' }), med: pad(r.medicalManagement, 3, ''), firstDoc: r.firstDocDate ?? '', subDoc: r.subsequentDocDate ?? '',
})

/** Legacy: Case > Case Registration (frmCaseAdmission), policy lookup, patient, case details, remarks, first / final / underlying diagnoses, repudiation and the limit deduction.  */
export function CaseRegistrationPage({ mode = 'register' }: { mode?: 'register' | 'adjust' }) {
  const adjust = mode === 'adjust'
  const options = useQuery({ queryKey: ['case-reg-options', mode], queryFn: adjust ? caseAdjustmentApi.options : caseRegistrationApi.options })
  const [number, setNumber] = useState('')
  const [member, setMember] = useState<CaseMemberView | null>(null)
  const [f, setF] = useState<Form>(blank)
  const [hospitalSearch, setHospitalSearch] = useState('')
  const hospitals = useQuery({ queryKey: ['case-reg-hospitals', mode, hospitalSearch], queryFn: () => (adjust ? caseAdjustmentApi : caseRegistrationApi).hospitals(hospitalSearch) })
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)
  const [ack, setAck] = useState({ long: false, recent: false, open: false })
  const [prompt, setPrompt] = useState<{ text: string; next: Partial<typeof ack> } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [caseNo, setCaseNo] = useState('')
  const [status, setStatus] = useState('O')
  const [adjusted, setAdjusted] = useState<{ no: string; by: string | null; on: string | null } | null>(null)
  const [registered, setRegistered] = useState<{ caseNumber: string; letters: string[]; lg: number | null; lgTime: string | null } | null>(null)

  const load = useMutation({
    mutationFn: (no: string) => caseAdjustmentApi.get(no.trim()),
    onSuccess: (v) => { setCaseNo(v.caseNumber); setStatus(v.status || 'O'); setMember(v.member); setF(toForm(v.form)); setAck({ long: false, recent: false, open: false }); setAdjusted({ no: v.caseNumber, by: v.lastUpdatedBy, on: v.lastUpdated }); setMessage(null) },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const step = useMutation({
    mutationFn: (dir: 'next' | 'previous') => (dir === 'next' ? caseAdjustmentApi.next(caseNo) : caseAdjustmentApi.previous(caseNo)),
    onSuccess: (r) => load.mutate(r.caseNumber),
    onError: (e) => setMessage({ severity: 'warning', text: (e as Error).message }),
  })
  const update = useMutation({
    mutationFn: (a: typeof ack) => caseAdjustmentApi.update(caseNo, status, request(a)),
    onSuccess: () => { setConfirming(false); setPrompt(null); setMessage({ severity: 'success', text: 'Record Updated Sucessfully' }); load.mutate(caseNo) },
    onError: (e) => {
      setConfirming(false)
      if (e instanceof ApiError && e.status === 409 && e.message.includes('More Than 5 Days')) { setPrompt({ text: e.message, next: { long: true } }); return }
      setMessage({ severity: 'error', text: (e as Error).message })
    },
  })
  const show = useMutation({
    mutationFn: () => caseRegistrationApi.member(number.trim()),
    onSuccess: (m) => { setMember(m); setF({ ...blank, patientId: '00' }); setAck({ long: false, recent: false, open: false }); setMessage(m.blockedReason ? { severity: 'error', text: m.blockedReason } : m.warnings.length ? { severity: 'warning', text: m.warnings.join(' ') } : null) },
    onError: (e) => { setMember(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const diag = (d: { code: string; text: string; date: string }): CaseDiagnosis => ({ code: d.code || null, text: d.text || null, date: d.date || null })
  const request = (a = ack): CaseRegistrationRequest => ({
    memberNumber: member!.memberNumber, patientId: f.patientId, claimability: f.claimability, hospitalCode: f.hospitalCode, hospitalName: f.hospitalName || null, dateAdmitted: f.dateAdmitted || null, dateDischarge: f.dateDischarge || null, pending: f.pending || null,
    reserveAmount: f.reserve === '' ? null : Number(f.reserve), lgAmount: f.lg === '' ? null : Number(f.lg), lgTime: f.lgTime || null, payType: f.payType, stayType: f.stayType || null, modality: f.modality || null, nature: f.nature || null, specialApproval: f.special || null,
    topUpLimit: f.topUp, query: f.query, linkCaseNo: f.link || null, referredBy: f.referredBy || null, admissionReason: f.reason || null, docReceivedDate: f.docDate || null, policyYear: f.policyYear ? Number(f.policyYear) : null, espRefNo: f.esp || null,
    takeOverInd: f.takeOverInd, takeOverAmount: f.takeOverAmt === '' ? null : Number(f.takeOverAmt), takeOverPlan: f.takeOverPlan || null, intExtTakeOver: f.intExt || null, patientAge: f.age || null, ageUnit: f.ageUnit,
    firstCall: dmyText(f.firstCall), firstTreated: dmyText(f.firstTreated), payPending: f.payPending, followUp: f.followUp, conditionWillRecur: f.recur, followUpRequired: f.followReq, remarks: f.remarks,
    firstDiagnosis: f.first.map(diag), finalDiagnosis: f.final.map(diag), acknowledgeLongStay: a.long, acknowledgeRecentPolicy: a.recent, acknowledgeOpenCase: a.open,
    repudiationCodes: repudiating ? f.rep.filter(Boolean) : null, document: repudiating ? f.document || null : null, personnel: repudiating ? f.personnel || null : null, attention: repudiating ? f.attention || null : null, underlying: f.underlying === 'Y',
    underlyingDiagnosis: f.ud.map(diag), deductionAmount: f.deduction === '' ? null : Number(f.deduction),
    attendingDoctors: f.docs.filter(Boolean), anaesthetists: f.anae.filter(Boolean), procedures: f.procs.filter((p) => p.text || p.cpt).map((p) => ({ text: p.text || null, cptCode: p.cpt || null })), nonSurgicalProcedures: f.nons.filter((p) => p.text || p.cpt).map((p) => ({ text: p.text || null, cptCode: p.cpt || null })),
    investigations: f.invs.filter((i) => i.done || i.code).map((i) => ({ done: i.done || null, code: i.code || null })), medicalManagement: f.med.filter(Boolean), firstDocDate: f.firstDoc || null, subsequentDocDate: f.subDoc || null,
  })
  const register = useMutation({
    mutationFn: (a: typeof ack) => caseRegistrationApi.register(request(a)),
    onSuccess: (r) => { setConfirming(false); setPrompt(null); setMessage({ severity: 'success', text: r.message }); setRegistered({ caseNumber: r.caseNumber, letters: r.letters, lg: f.lg === '' ? null : Number(f.lg), lgTime: f.lgTime || null }); setMember(null); setNumber(''); setF(blank); setAck({ long: false, recent: false, open: false }) },
    onError: (e) => {
      setConfirming(false)
      if (e instanceof ApiError && e.status === 409) {
        const next = e.message.includes('More Than 5 Days') ? { long: true } : e.message.includes('less than 30 days') ? { recent: true } : e.message.includes('already has case') ? { open: true } : null
        if (next) { setPrompt({ text: e.message, next }); return }
      }
      setMessage({ severity: 'error', text: (e as Error).message })
    },
  })
  const set = <K extends keyof Form>(k: K) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const text = (label: string, k: keyof Form, props: Record<string, unknown> = {}) => <TextField size="small" label={label} value={f[k] as string} onChange={set(k)} {...props} />
  const select = (label: string, k: keyof Form, items: [string, string][], width = 170, required = false) => <TextField select size="small" label={label} required={required} value={f[k] as string} onChange={set(k)} sx={{ width }}>{items.map(([c, n]) => <MenuItem key={c} value={c}>{n}</MenuItem>)}</TextField>
  const opt = (list?: { code: string; name: string }[]): [string, string][] => (list ?? []).map((o) => [o.code, `${o.code} - ${o.name}`])
  const setDiag = (which: 'first' | 'final' | 'ud', i: number, patch: Partial<{ code: string; text: string; date: string }>) => setF((x) => ({ ...x, [which]: x[which].map((d, j) => (j === i ? { ...d, ...patch } : d)) }))
  const repudiating = ['RR', 'NR', 'PR', 'AR', 'BR', 'ER'].includes(f.claimability)
  const blocked = !adjust && !!member?.blockedReason
  const hospitalOptions = hospitals.data ?? []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">{adjust ? 'Case Adjustment' : 'Case Registration'}</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {adjust && (
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField size="small" label="Case No" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) load.mutate(caseNo) }} slotProps={{ htmlInput: { maxLength: 15 } }} />
          <Button variant="contained" disabled={!caseNo.trim() || load.isPending} onClick={() => load.mutate(caseNo)}>Show</Button>
          <Button variant="outlined" disabled={!adjusted || step.isPending} onClick={() => step.mutate('previous')}>Pre</Button>
          <Button variant="outlined" disabled={!adjusted || step.isPending} onClick={() => step.mutate('next')}>Next</Button>
          <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 140 }} disabled={!adjusted}>{[['O', 'O - Open'], ['C', 'C - Close'], ['D', 'D - Delete']].map(([c, n]) => <MenuItem key={c} value={c}>{n}</MenuItem>)}</TextField>
          {adjusted && <Typography variant="body2" sx={{ alignSelf: 'center' }}>{member?.name} &nbsp;|&nbsp; Policy {member?.policyNo} &nbsp;|&nbsp; Plan {member?.insured}/{member?.plan} &nbsp;|&nbsp; Last updated {adjusted.by ?? '-'} {toDmy(adjusted.on ?? '')}</Typography>}
        </Paper>
      )}
      {!adjust && (
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField size="small" label="Mem Num." value={number} onChange={(e) => setNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && number.trim()) { setMessage(null); show.mutate() } }} slotProps={{ htmlInput: { maxLength: 15 } }} />
        <Button variant="contained" disabled={!number.trim() || show.isPending} onClick={() => { setMessage(null); show.mutate() }}>Show</Button>
        <Button variant="outlined" onClick={() => { setNumber(''); setMember(null); setF(blank); setMessage(null) }}>Clear</Button>
        {member && <Typography variant="body2" sx={{ alignSelf: 'center' }}>{member.name} &nbsp;|&nbsp; IC {member.icBcPp} &nbsp;|&nbsp; Policy {member.policyNo} &nbsp;|&nbsp; Plan {member.insured}/{member.plan} &nbsp;|&nbsp; Status {member.status} &nbsp;|&nbsp; {toDmy(member.effectiveDate ?? '')} - {toDmy(member.expiryDate ?? '')} &nbsp;|&nbsp; Available limit {formatMoney(member.availableLimit)}{member.topUp ? ' (top-up)' : ''}</Typography>}
      </Paper>
      )}
      {registered && <CaseAfterRegistration key={registered.caseNumber} caseNumber={registered.caseNumber} letters={registered.letters} lgAmount={registered.lg} lgTime={registered.lgTime} onDone={() => setRegistered(null)} />}
      {member?.planMessage && <Alert severity="info">{member.planMessage}</Alert>}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, opacity: member && !blocked ? 1 : 0.5, pointerEvents: member && !blocked ? 'auto' : 'none' }}>
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" sx={{ width: '100%' }}>General Info / Case Details</Typography>
          {select('Patient', 'patientId', (member?.patients ?? []).map((p) => [p.coverId, `${p.coverId} - ${p.name}`]), 260, true)}
          {select('Claimability', 'claimability', opt(options.data?.claimability), 200, true)}
          <Autocomplete size="small" sx={{ width: 340 }} options={hospitalOptions} getOptionLabel={(o) => o.name} filterOptions={(x) => x} isOptionEqualToValue={(a, b) => a.code === b.code} value={hospitalOptions.find((h) => h.code === f.hospitalCode) ?? null}
            onInputChange={(_, v, reason) => { if (reason === 'input') setHospitalSearch(v) }} onChange={(_, v) => setF((x) => ({ ...x, hospitalCode: v?.code ?? '' }))} renderInput={(p) => <TextField {...p} label="Hospital" required />} />
          {text('Hospital / clinic name (for generic rows)', 'hospitalName', { sx: { width: 280 }, slotProps: { htmlInput: { maxLength: 100 } } })}
          <DateField label="Date Admitted" required value={f.dateAdmitted} onChange={(iso) => setF((x) => ({ ...x, dateAdmitted: iso }))} />
          <DateField label="Date Discharge" value={f.dateDischarge} onChange={(iso) => setF((x) => ({ ...x, dateDischarge: iso }))} />
          {text('Reserve Amount', 'reserve', { type: 'number', required: true, sx: { width: 150 } })}
          {text('LG Amount', 'lg', { type: 'number', required: true, sx: { width: 140 } })}
          {text('LG Time (hh:mm)', 'lgTime', { sx: { width: 130 }, slotProps: { htmlInput: { maxLength: 5 } } })}
          {select('Pay Type', 'payType', opt(options.data?.payTypes), 170, true)}
          {select('Stay Type', 'stayType', opt(options.data?.stayTypes), 170)}
          {select('Modality', 'modality', [['', '(none)'], ...opt(options.data?.modalities)], 200)}
          {select('Nature', 'nature', [['', '(none)'], ...opt(options.data?.natures)], 200)}
          {select('Special Approval', 'special', [['', '(none)'], ...opt(options.data?.specialApprovals)], 220)}
          {select('Pending', 'pending', yn as [string, string][], 110)}
          {select('Top-up Limit', 'topUp', yn as [string, string][], 130, true)}
          {select('Query', 'query', yn as [string, string][], 110)}
          {text('Link Case No', 'link', { sx: { width: 150 }, slotProps: { htmlInput: { maxLength: 15 } } })}
          {text('Referred By', 'referredBy', { sx: { width: 200 } })}
          <DateField label="Date Doc Received" value={f.docDate} onChange={(iso) => setF((x) => ({ ...x, docDate: iso }))} />
          {text('Policy Year', 'policyYear', { type: 'number', sx: { width: 120 } })}
          {f.payType === 'R' && text('ESP Ref. No', 'esp', { required: true, sx: { width: 170 }, slotProps: { htmlInput: { maxLength: 20 } } })}
          {text('Patient Age', 'age', { required: true, sx: { width: 110 }, slotProps: { htmlInput: { maxLength: 2 } } })}
          {select('Week/Month/Year', 'ageUnit', [['W', 'W - Weeks'], ['M', 'M - Months'], ['Y', 'Y - Year']], 160, true)}
          <DateField label="First Call" value={f.firstCall} onChange={(iso) => setF((x) => ({ ...x, firstCall: iso }))} />
          <DateField label="First Treated" value={f.firstTreated} onChange={(iso) => setF((x) => ({ ...x, firstTreated: iso }))} />
          <TextField size="small" label="Admission Reason" value={f.reason} onChange={set('reason')} multiline minRows={2} sx={{ width: '100%' }} slotProps={{ htmlInput: { maxLength: 500 } }} />
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" sx={{ width: '100%' }}>Take Over / Others</Typography>
          {select('Take Over', 'takeOverInd', yn as [string, string][], 130)}
          {select('Int/Ext Take Over', 'intExt', [['', '(none)'], ['I', 'I - Internal'], ['E', 'E - External']], 170)}
          {text('Take Over Amount', 'takeOverAmt', { type: 'number', sx: { width: 160 } })}
          {text('Take Over Plan', 'takeOverPlan', { sx: { width: 140 }, slotProps: { htmlInput: { maxLength: 4 } } })}
          {select('Pay Pending', 'payPending', yn as [string, string][], 130)}
          {select('Follow Up', 'followUp', yn as [string, string][], 120)}
          {select('Condition will recur', 'recur', yn as [string, string][], 170)}
          {select('Follow-up required', 'followReq', yn as [string, string][], 170)}
          {text('Deduction Amount (reduces available limit)', 'deduction', { type: 'number', sx: { width: 300 } })}
        </Paper>
        {repudiating && (
          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" sx={{ width: '100%' }}>Repudiation</Typography>
            {f.rep.map((c, i) => (
              <Autocomplete key={i} size="small" sx={{ width: 380 }} options={options.data?.repudiation ?? []} getOptionLabel={(o) => `${o.code} - ${o.name}`} value={(options.data?.repudiation ?? []).find((o) => o.code === c) ?? null}
                onChange={(_, v) => setF((x) => ({ ...x, rep: x.rep.map((r, j) => (j === i ? v?.code ?? '' : r)) }))} renderInput={(p) => <TextField {...p} label={`Repudiate Code ${i + 1}`} required={i === 0} />} />
            ))}
            {select('Documents', 'document', opt(options.data?.repudiationSelections.filter((s) => s.code.startsWith('D'))), 340, true)}
            {select('Personnel', 'personnel', opt(options.data?.repudiationSelections.filter((s) => s.code.startsWith('P'))), 260, true)}
            {select('Attention', 'attention', opt(options.data?.repudiationSelections.filter((s) => s.code.startsWith('A'))), 420, true)}
            {select('Underlying', 'underlying', [['N', 'N - No'], ['Y', 'Y - Yes']], 140)}
          </Paper>
        )}
        {(['first', 'final', 'ud'] as const).map((which) => (
          <Paper key={which} variant="outlined" sx={{ p: 1.5, display: 'grid', gap: 1 }}>
            <Typography variant="subtitle2">{which === 'first' ? 'Preliminary diagnosis (ICD)' : which === 'final' ? 'Final diagnosis (ICD)' : 'Underlying illness (ICD)'}</Typography>
            {f[which].map((d, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Autocomplete size="small" sx={{ width: 420 }} options={options.data?.icd ?? []} getOptionLabel={(o) => `${o.code} - ${o.name}`} value={(options.data?.icd ?? []).find((o) => o.code === d.code) ?? null}
                  onChange={(_, v) => setDiag(which, i, { code: v?.code ?? '' })} renderInput={(p) => <TextField {...p} label={`ICD ${i + 1}`} required={which === 'first' && i === 0 && f.payType === 'C'} />} />
                <TextField size="small" label="Description" value={d.text} onChange={(e) => setDiag(which, i, { text: e.target.value })} sx={{ flex: 1, minWidth: 220 }} slotProps={{ htmlInput: { maxLength: 150 } }} />
                <DateField label="DOS" value={d.date} onChange={(iso) => setDiag(which, i, { date: iso })} />
              </Box>
            ))}
          </Paper>
        ))}
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" sx={{ width: '100%' }}>Doctors</Typography>
          {f.docs.map((d, i) => <TextField key={i} size="small" label={`Attending doctor ${i + 1}`} value={d} sx={{ width: 240 }} onChange={(e) => setF((x) => ({ ...x, docs: x.docs.map((v, j) => (j === i ? e.target.value : v)) }))} slotProps={{ htmlInput: { maxLength: i === 0 ? 100 : 30 } }} />)}
          {f.anae.map((d, i) => <TextField key={i} size="small" label={`Anaesthetist ${i + 1}`} value={d} sx={{ width: 240 }} onChange={(e) => setF((x) => ({ ...x, anae: x.anae.map((v, j) => (j === i ? e.target.value : v)) }))} slotProps={{ htmlInput: { maxLength: 30 } }} />)}
          <DateField label="First doctor date" value={f.firstDoc} onChange={(iso) => setF((x) => ({ ...x, firstDoc: iso }))} />
          <DateField label="Subsequent doctor date" value={f.subDoc} onChange={(iso) => setF((x) => ({ ...x, subDoc: iso }))} />
        </Paper>
        {([['procs', 'Surgical procedures', 500], ['nons', 'Non-surgical procedures', 200]] as const).map(([key, title, max]) => (
          <Paper key={key} variant="outlined" sx={{ p: 1.5, display: 'grid', gap: 1 }}>
            <Typography variant="subtitle2">{title} (procedure and CPT code)</Typography>
            {f[key].map((p, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                <TextField size="small" label={`Procedure ${i + 1}`} value={p.text} sx={{ flex: 1 }} onChange={(e) => setF((x) => ({ ...x, [key]: x[key].map((v, j) => (j === i ? { ...v, text: e.target.value } : v)) }))} slotProps={{ htmlInput: { maxLength: max } }} />
                <TextField size="small" label="CPT" value={p.cpt} sx={{ width: 110 }} onChange={(e) => setF((x) => ({ ...x, [key]: x[key].map((v, j) => (j === i ? { ...v, cpt: e.target.value } : v)) }))} slotProps={{ htmlInput: { maxLength: 6 } }} />
              </Box>
            ))}
          </Paper>
        ))}
        <Paper variant="outlined" sx={{ p: 1.5, display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2">Investigations and medical management</Typography>
          {f.invs.map((p, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
              <TextField size="small" label={`Investigation ${i + 1}`} value={p.done} sx={{ flex: 1 }} onChange={(e) => setF((x) => ({ ...x, invs: x.invs.map((v, j) => (j === i ? { ...v, done: e.target.value } : v)) }))} slotProps={{ htmlInput: { maxLength: 500 } }} />
              <TextField size="small" label="Code" value={p.code} sx={{ width: 120 }} onChange={(e) => setF((x) => ({ ...x, invs: x.invs.map((v, j) => (j === i ? { ...v, code: e.target.value } : v)) }))} slotProps={{ htmlInput: { maxLength: 10 } }} />
            </Box>
          ))}
          {f.med.map((m, i) => <TextField key={i} size="small" label={`Medical management ${i + 1}`} value={m} onChange={(e) => setF((x) => ({ ...x, med: x.med.map((v, j) => (j === i ? e.target.value : v)) }))} slotProps={{ htmlInput: { maxLength: 500 } }} />)}
        </Paper>
        {member && <CaseRegistrationTabs memberNumber={member.memberNumber} area={adjust ? 'adjustment' : 'registration'} />}
        <Paper variant="outlined" sx={{ p: 1.5, display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2">Remarks</Typography>
          {f.remarks.map((r, i) => <TextField key={i} size="small" label={`Remark ${i + 1}`} value={r} multiline minRows={1} onChange={(e) => setF((x) => ({ ...x, remarks: x.remarks.map((v, j) => (j === i ? e.target.value : v)) }))} slotProps={{ htmlInput: { maxLength: 3900 } }} />)}
        </Paper>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ flexGrow: 1 }}>* - Mandatory Fields. </Typography>
        <Button variant="contained" disabled={!member || blocked || register.isPending || update.isPending || (adjust && !adjusted)} onClick={() => { setMessage(null); setConfirming(true) }}>{adjust ? 'Update' : 'Register'}</Button>
      </Box>
      <Dialog open={confirming} onClose={() => setConfirming(false)}><DialogTitle>{adjust ? 'Update case' : 'Register case'}</DialogTitle><DialogContent><DialogContentText>Are you sure?</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirming(false)}>No</Button><Button variant="contained" disabled={register.isPending || update.isPending} onClick={() => (adjust ? update.mutate(ack) : register.mutate(ack))}>Yes</Button></DialogActions></Dialog>
      <Dialog open={!!prompt} onClose={() => setPrompt(null)}><DialogTitle>Please confirm</DialogTitle><DialogContent><DialogContentText>{prompt?.text}</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setPrompt(null)}>No</Button><Button variant="contained" onClick={() => { const a = { ...ack, ...prompt!.next }; setAck(a); setPrompt(null); if (adjust) update.mutate(a); else register.mutate(a) }}>Yes</Button></DialogActions></Dialog>
    </Box>
  )
}






