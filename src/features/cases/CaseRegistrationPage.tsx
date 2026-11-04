import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Paper, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaseAfterRegistration } from './CaseAfterRegistration'
import { CaseLgTab, CaseWorksheetTab } from './CaseAdjustmentTabs'
import { CaseManagementNote, CaseMemberTab } from './CaseRegistrationTabs'
import { memberTabs, memberTabsAfterNotes, type MemberTab } from './memberTabList'
import { CaseSearchDialog } from './CaseSearchDialog'
import { ApiError } from '../../api/client'
import { caseAdjustmentApi, caseRegistrationApi, type CaseDiagnosis, type CaseMemberView, type CaseRegistrationRequest, type DraftLetterKind } from '../../api/caseRegistration'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyRow as L, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { toDmy } from '../../lib/dates'
import { download } from '../../lib/download'
import { formatMoney } from '../../lib/format'

const yn: [string, string][] = [['N', 'N - No'], ['Y', 'Y - Yes']]
const blank = {
  patientId: '', claimability: 'AA', hospitalCode: '', hospitalName: '', dateAdmitted: '', dateDischarge: '', pending: 'N', reserve: '', lg: '', lgTime: '', payType: 'C', stayType: 'I', modality: '', nature: '', special: '', topUp: 'N', query: 'N', link: '',
  referredBy: '', reason: '', docDate: '', policyYear: '', esp: '', takeOverInd: 'N', takeOverAmt: '', takeOverPlan: '', intExt: '', age: '', ageUnit: 'Y', firstCall: '', firstTreated: '', payPending: 'N', followUp: 'N', recur: 'N', followReq: 'N',
  remarks: ['', '', '', '', ''], first: [{ code: '', text: '', date: '' }, { code: '', text: '', date: '' }, { code: '', text: '', date: '' }], final: [{ code: '', text: '', date: '' }, { code: '', text: '', date: '' }, { code: '', text: '', date: '' }],
  ud: [{ code: '', text: '', date: '' }, { code: '', text: '', date: '' }, { code: '', text: '', date: '' }], rep: ['', '', ''], document: '', personnel: '', attention: '', underlying: 'N', deduction: '',
  docs: ['', '', '', '', ''], anae: ['', '', ''], procs: Array.from({ length: 6 }, () => ({ text: '', cpt: '' })), nons: Array.from({ length: 6 }, () => ({ text: '', cpt: '' })), invs: Array.from({ length: 3 }, () => ({ done: '', code: '' })), med: ['', '', ''], firstDoc: '', subDoc: '',
}
type Form = typeof blank
type Diag = { code: string; text: string; date: string }
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

type TabKey = 'general' | 'details' | 'others' | 'takeover' | 'notes' | 'lg' | 'worksheet' | MemberTab

/**
 * Legacy: Case > Case Registration (frmCaseAdmission) and Case > Case Adjustment (frmCaseAdjustmentNew). The member (or case) across the top with Cas
 * Status, Claimability and Pending; the policy holder's details; the tabs General Info, Case Details, Case Others, Take Over/Others, Benefit, MBM'Ship
 * History, Warranty, Non-Disclosure, Case Mgmt Notes, Policy Terms, Surgical Schedule, Policy Wording (and LG and Worksheet on an adjustment); and LG,
 * Notification, T.Home Drugs, Doc Req Adm, Doc Req Discharge, the case number and Register / Clear / Exit along the bottom.
 */
export function CaseRegistrationPage({ mode = 'register' }: { mode?: 'register' | 'adjust' }) {
  const adjust = mode === 'adjust'
  const navigate = useNavigate()
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
  const [searching, setSearching] = useState(false)
  const [status, setStatus] = useState('O')
  const [adjusted, setAdjusted] = useState<{ no: string; by: string | null; on: string | null } | null>(null)
  const [registered, setRegistered] = useState<{ caseNumber: string; letters: string[]; lg: number | null; lgTime: string | null } | null>(null)
  const [tab, setTab] = useState<TabKey>('details')
  const [lgOpen, setLgOpen] = useState(false)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

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
    mutationFn: (no: string) => caseRegistrationApi.member(no.trim()),
    onSuccess: (m) => { setMember(m); setNumber(m.memberNumber); setF({ ...blank, patientId: '00' }); setAck({ long: false, recent: false, open: false }); setRegistered(null); setTab('details'); setMessage(m.blockedReason ? { severity: 'error', text: m.blockedReason } : m.warnings.length ? { severity: 'warning', text: m.warnings.join(' ') } : null) },
    onError: (e) => { setMember(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const diag = (d: Diag): CaseDiagnosis => ({ code: d.code || null, text: d.text || null, date: d.date || null })
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
    onSuccess: (r) => { setConfirming(false); setPrompt(null); setMessage({ severity: 'success', text: r.message }); setRegistered({ caseNumber: r.caseNumber, letters: r.letters, lg: f.lg === '' ? null : Number(f.lg), lgTime: f.lgTime || null }) },
    onError: (e) => {
      setConfirming(false)
      if (e instanceof ApiError && e.status === 409) {
        const next = e.message.includes('More Than 5 Days') ? { long: true } : e.message.includes('less than 30 days') ? { recent: true } : e.message.includes('already has case') ? { open: true } : null
        if (next) { setPrompt({ text: e.message, next }); return }
      }
      setMessage({ severity: 'error', text: (e as Error).message })
    },
  })
  const clear = () => { setNumber(''); setCaseNo(''); setMember(null); setF(blank); setMessage(null); setRegistered(null); setAdjusted(null); setTab('details') }

  const set = <K extends keyof Form>(k: K) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const opt = (list?: { code: string; name: string }[]): [string, string][] => (list ?? []).map((o) => [o.code, `${o.code} - ${o.name}`])
  const T = (k: keyof Form, props: Record<string, unknown> = {}) => <TextField size="small" fullWidth sx={box} value={f[k] as string} onChange={set(k)} {...props} />
  const S = (k: keyof Form, items: [string, string][], width: number | string = '100%', none = false) => (
    <TextField select size="small" sx={{ ...box, width }} value={f[k] as string} onChange={set(k)}>
      {none && <MenuItem value="">&nbsp;</MenuItem>}{items.map(([c, n]) => <MenuItem key={c} value={c}>{n}</MenuItem>)}
    </TextField>
  )
  const D = (k: 'dateAdmitted' | 'dateDischarge' | 'firstCall' | 'firstTreated' | 'docDate' | 'firstDoc' | 'subDoc') => <DateField sx={{ ...box, width: 130 }} value={f[k]} onChange={(iso) => setF((x) => ({ ...x, [k]: iso }))} />
  const setDiag = (which: 'first' | 'final' | 'ud', i: number, patch: Partial<Diag>) => setF((x) => ({ ...x, [which]: x[which].map((d, j) => (j === i ? { ...d, ...patch } : d)) }))
  const repudiating = ['RR', 'NR', 'PR', 'AR', 'BR', 'ER'].includes(f.claimability)
  const blocked = !adjust && !!member?.blockedReason
  const hospitalOptions = hospitals.data ?? []
  const patient = member?.patients.find((p) => p.coverId === f.patientId)
  const savedCase = adjust ? adjusted?.no ?? null : registered?.caseNumber ?? null
  const expired = !!member?.expiryDate && member.expiryDate < today
  const area = adjust ? 'adjustment' : 'registration'

  const draft = async (kind: DraftLetterKind) => {
    setMessage(null)
    try {
      const r = { memberNumber: member?.memberNumber ?? null, patientId: f.patientId || null, hospitalCode: f.hospitalCode || null, hospitalName: f.hospitalName || null, admitted: f.dateAdmitted || null, discharged: f.dateDischarge || null, caseNumber: savedCase }
      const file = await (adjust ? caseAdjustmentApi : caseRegistrationApi).draftLetter(kind, r)
      download(file.blob, file.fileName)
    } catch (e) { setMessage({ severity: 'error', text: (e as Error).message }) }
  }
  // Legacy cmdPrior_Click: the policy ending notice when the policy ends this month, the expired notice once it has ended.
  const notification = async () => {
    if (!savedCase || !member?.expiryDate) return
    const kind = member.expiryDate < today ? 'expired' : member.expiryDate.slice(0, 7) === today.slice(0, 7) ? 'policy-ending' : null
    if (!kind) { setMessage({ severity: 'info', text: 'The policy does not end this month, so no notification is due.' }); return }
    try { download(await caseRegistrationApi.letter(savedCase, kind), `${kind}-${savedCase}.pdf`) } catch (e) { setMessage({ severity: 'error', text: (e as Error).message }) }
  }

  const diagFrame = (which: 'first' | 'final' | 'ud', title: string, required = false) => (
    <LegacyFrame>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 140px 190px', gap: 0.5, fontSize: 13 }}>
        <Typography sx={{ fontSize: 13 }}>{title}</Typography><Typography sx={{ fontSize: 13 }}>Date OnSet</Typography><Typography sx={{ fontSize: 13 }}>ICD</Typography>
        {f[which].map((d, i) => [
          <TextField key={`t${i}`} size="small" sx={box} value={d.text} onChange={(e) => setDiag(which, i, { text: e.target.value })} slotProps={{ htmlInput: { maxLength: 150 } }} />,
          <DateField key={`d${i}`} sx={box} value={d.date} onChange={(iso) => setDiag(which, i, { date: iso })} />,
          <Autocomplete key={`c${i}`} size="small" options={options.data?.icd ?? []} getOptionLabel={(o) => `${o.code} - ${o.name}`} value={(options.data?.icd ?? []).find((o) => o.code === d.code) ?? null}
            onChange={(_, v) => setDiag(which, i, { code: v?.code ?? '', text: d.text || (v?.name ?? '') })} renderInput={(p) => <TextField {...p} sx={box} required={required && i === 0 && f.payType === 'C'} />} />,
        ])}
      </Box>
    </LegacyFrame>
  )
  const list = (key: 'docs' | 'anae' | 'med', title: string, max: number) => (
    <LegacyFrame title={title}>
      {f[key].map((v, i) => <TextField key={i} size="small" sx={box} value={v} onChange={(e) => setF((x) => ({ ...x, [key]: x[key].map((y, j) => (j === i ? e.target.value : y)) }))} slotProps={{ htmlInput: { maxLength: key === 'docs' && i === 0 ? 100 : max } }} />)}
    </LegacyFrame>
  )
  const procFrame = (key: 'procs' | 'nons', title: string, max: number) => (
    <LegacyFrame>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 0.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography><Typography sx={{ fontSize: 13, fontWeight: 600 }}>OPCS</Typography>
        {f[key].map((p, i) => [
          <TextField key={`t${i}`} size="small" sx={box} value={p.text} onChange={(e) => setF((x) => ({ ...x, [key]: x[key].map((v, j) => (j === i ? { ...v, text: e.target.value } : v)) }))} slotProps={{ htmlInput: { maxLength: max } }} />,
          <TextField key={`c${i}`} size="small" sx={box} value={p.cpt} onChange={(e) => setF((x) => ({ ...x, [key]: x[key].map((v, j) => (j === i ? { ...v, cpt: e.target.value } : v)) }))} slotProps={{ htmlInput: { maxLength: 6 } }} />,
        ])}
      </Box>
    </LegacyFrame>
  )
  const tabList: [TabKey, string][] = [
    ['general', 'General Info'], ['details', 'Case Details'], ['others', 'Case Others'], ['takeover', 'Take Over/Others'], ...memberTabs, ['notes', 'Case Mgmt Notes'], ...memberTabsAfterNotes,
    ...(adjust && adjusted ? [['lg', 'LG'], ['worksheet', 'Worksheet']] as [TabKey, string][] : []),
  ]
  const panel: Record<string, () => ReactNode> = {
    general: () => (
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' } }}>
          <Box>
            {[['Add', member?.address1], ['', member?.address2], ['', member?.address3]].map(([l, v], i) => <L key={i} label={l ?? ''} w={60}><TextField size="small" fullWidth sx={box} value={v ?? ''} slotProps={{ input: { readOnly: true } }} /></L>)}
            <L label="PCode" w={60}><TextField size="small" sx={{ ...box, width: 110 }} value={member?.postCode ?? ''} slotProps={{ input: { readOnly: true } }} /><Typography sx={{ fontSize: 13 }}>Town</Typography><TextField size="small" fullWidth sx={box} value={member?.city ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
            <L label="State" w={60}><TextField size="small" fullWidth sx={box} value={member?.state ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
            <L label="Pol Num" w={60}><TextField size="small" fullWidth sx={box} value={member?.policyNo ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
          </Box>
          <Box>
            <L label="Ann Lmt" w={110}><TextField size="small" sx={box} value={member?.annualLimit == null ? '' : formatMoney(member.annualLimit)} slotProps={{ input: { readOnly: true } }} /></L>
            <L label="Avail. Lmt" w={110}><TextField size="small" sx={box} value={member?.availableLimit == null ? '' : formatMoney(member.availableLimit)} slotProps={{ input: { readOnly: true } }} error={(member?.availableLimit ?? 1) <= 2000} /></L>
            <L label="Insured Type" w={110}><TextField size="small" sx={box} value={member?.insured ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
            <L label="Plan" w={110}><TextField size="small" sx={box} value={member ? `${member.plan ?? ''} (${member.health ?? ''})` : ''} slotProps={{ input: { readOnly: true } }} /></L>
          </Box>
        </Box>
        <Table size="small">
          <TableHead><TableRow>{['Cover ID', 'Name', 'IC / BC / Passport', 'Relation', 'DOB'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(member?.patients ?? []).map((p) => (
              <TableRow key={p.coverId} hover selected={p.coverId === f.patientId} sx={{ cursor: 'pointer' }} onClick={() => setF((x) => ({ ...x, patientId: p.coverId }))}>
                <TableCell>{p.coverId}</TableCell><TableCell>{p.name}</TableCell><TableCell>{p.icBcPp}</TableCell><TableCell>{p.relation}</TableCell><TableCell>{toDmy(p.birthDate ?? '')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    ),
    details: () => (
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.15fr 1fr' } }}>
          <Box>
            <L label="Patient">{S('patientId', (member?.patients ?? []).map((p) => [p.coverId, `${p.coverId} - ${p.name}`]))}</L>
            <L label="Hospital">
              <Autocomplete size="small" fullWidth options={hospitalOptions} getOptionLabel={(o) => `${o.code} - ${o.name}`} filterOptions={(x) => x} isOptionEqualToValue={(a, b) => a.code === b.code} value={hospitalOptions.find((h) => h.code === f.hospitalCode) ?? (f.hospitalCode ? { code: f.hospitalCode, name: f.hospitalCode } : null)}
                onInputChange={(_, v, reason) => { if (reason === 'input') setHospitalSearch(v) }} onChange={(_, v) => setF((x) => ({ ...x, hospitalCode: v?.code ?? '' }))} renderInput={(p) => <TextField {...p} sx={box} required />} />
            </L>
            <L label="Hospital Name">{T('hospitalName', { slotProps: { htmlInput: { maxLength: 100 } } })}</L>
            <L label="Reasons" sx={{ alignItems: 'flex-start' }}>{T('reason', { multiline: true, minRows: 3, slotProps: { htmlInput: { maxLength: 500 } } })}</L>
            <L label="Ref By">{T('referredBy')}</L>
            <L label="Nat of Clm">{S('nature', opt(options.data?.natures), 200, true)}<Typography sx={{ fontSize: 13, width: 75, ml: 1 }}>Stay Type</Typography>{S('stayType', opt(options.data?.stayTypes), 200)}</L>
            <L label="Treat. Mode">{S('modality', opt(options.data?.modalities), 200, true)}<Typography sx={{ fontSize: 13, width: 75, ml: 1 }}>Cash Type</Typography>{S('payType', opt(options.data?.payTypes), 200)}</L>
            <L label="ESP Ref. No">{T('esp', { sx: { ...box, width: 200 }, required: f.payType === 'R', slotProps: { htmlInput: { maxLength: 20 } } })}</L>
          </Box>
          <Box>
            <L label="IC Num" w={90}><TextField size="small" fullWidth sx={box} value={patient?.icBcPp ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
            <L label="1st. Call" w={90}>{D('firstCall')}<Typography sx={{ fontSize: 13, width: 70, ml: 1 }}>D.O.A</Typography>{D('dateAdmitted')}</L>
            <L label="1st. Treated" w={90}>{D('firstTreated')}<Typography sx={{ fontSize: 13, width: 70, ml: 1 }}>D.O.D</Typography>{D('dateDischarge')}</L>
            <L label="Rsvr Amt" w={90}>{T('reserve', { type: 'number', required: true, sx: { ...box, width: 130 } })}<Typography sx={{ fontSize: 13, width: 70, ml: 1 }}>LG Amt</Typography>{T('lg', { type: 'number', required: true, sx: { ...box, width: 130 } })}</L>
            <L label="Rcur" w={90}>{S('recur', yn, 130)}<Typography sx={{ fontSize: 13, width: 70, ml: 1 }}>LG Time</Typography>{T('lgTime', { placeholder: 'hh:mm', sx: { ...box, width: 130 }, slotProps: { htmlInput: { maxLength: 5 } } })}</L>
            <L label="Fol. Req" w={90}>{S('followReq', yn)}</L>
            <L label="Fol. Up" w={90}>{S('followUp', yn, 130)}<Typography sx={{ fontSize: 13, width: 70, ml: 1 }}>Pending</Typography>{S('pending', yn, 130)}</L>
            <L label="Policy Year" w={90}>{T('policyYear', { type: 'number', sx: { ...box, width: 130 } })}<Typography sx={{ fontSize: 13, width: 70, ml: 1 }}>Patient Age</Typography>
              {T('age', { required: true, sx: { ...box, width: 55 }, slotProps: { htmlInput: { maxLength: 2 } } })}{S('ageUnit', [['W', 'W - Weeks'], ['M', 'M - Months'], ['Y', 'Y - Year']], 110)}</L>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          {diagFrame('first', 'Prem. Diag', true)}
          {diagFrame('final', 'Final Diag')}
          {diagFrame('ud', 'Underlying Disease')}
          <LegacyFrame title="Repudiation Resons">
            {f.rep.map((c, i) => (
              <Autocomplete key={i} size="small" options={options.data?.repudiation ?? []} getOptionLabel={(o) => `${o.code} - ${o.name}`} value={(options.data?.repudiation ?? []).find((o) => o.code === c) ?? null} disabled={!repudiating}
                onChange={(_, v) => setF((x) => ({ ...x, rep: x.rep.map((r, j) => (j === i ? v?.code ?? '' : r)) }))} renderInput={(p) => <TextField {...p} sx={box} required={repudiating && i === 0} />} />
            ))}
            {repudiating && <>
              <L label="Documents" w={80}>{S('document', opt(options.data?.repudiationSelections.filter((s) => s.code.startsWith('D'))))}</L>
              <L label="Personnel" w={80}>{S('personnel', opt(options.data?.repudiationSelections.filter((s) => s.code.startsWith('P'))))}</L>
              <L label="Attention" w={80}>{S('attention', opt(options.data?.repudiationSelections.filter((s) => s.code.startsWith('A'))))}</L>
              <L label="Underlying" w={80}>{S('underlying', yn, 140)}</L>
            </>}
            {!repudiating && <Typography variant="caption" color="text.secondary">Only for a repudiated claimability (RR, NR, PR, AR, BR, ER).</Typography>}
          </LegacyFrame>
        </Box>
      </Box>
    ),
    others: () => (
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' } }}>
        <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>
          {procFrame('procs', 'Surgical Procedure', 500)}
          {procFrame('nons', 'Non-Surgical Charges', 200)}
          {list('docs', 'Att Doc', 30)}
        </Box>
        <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>
          <LegacyFrame>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Investigation</Typography><Typography sx={{ fontSize: 13, fontWeight: 600 }}>Code</Typography>
              {f.invs.map((p, i) => [
                <TextField key={`d${i}`} size="small" sx={box} value={p.done} onChange={(e) => setF((x) => ({ ...x, invs: x.invs.map((v, j) => (j === i ? { ...v, done: e.target.value } : v)) }))} slotProps={{ htmlInput: { maxLength: 500 } }} />,
                <TextField key={`c${i}`} size="small" sx={box} value={p.code} onChange={(e) => setF((x) => ({ ...x, invs: x.invs.map((v, j) => (j === i ? { ...v, code: e.target.value } : v)) }))} slotProps={{ htmlInput: { maxLength: 10 } }} />,
              ])}
            </Box>
          </LegacyFrame>
          {list('med', 'Medical Management', 500)}
          {list('anae', 'Anaes', 30)}
        </Box>
      </Box>
    ),
    takeover: () => (
      <Box sx={{ display: 'grid', gap: 1 }}>
        <LegacyFrame title="Take Over Details">
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 13 }}>T/O Ind</Typography>{S('takeOverInd', yn, 120)}
            <Typography sx={{ fontSize: 13 }}>T/O Amt</Typography>{T('takeOverAmt', { type: 'number', sx: { ...box, width: 120 } })}
            <Typography sx={{ fontSize: 13 }}>Int/Ext TakeOver</Typography>{S('intExt', [['I', 'I - Internal'], ['E', 'E - External']], 150, true)}
            <Typography sx={{ fontSize: 13 }}>T/O PLN</Typography>{T('takeOverPlan', { sx: { ...box, width: 90 }, slotProps: { htmlInput: { maxLength: 4 } } })}
            <Typography sx={{ fontSize: 13 }}>Link Case No</Typography>{T('link', { sx: { ...box, width: 150 }, slotProps: { htmlInput: { maxLength: 15 } } })}
          </Box>
        </LegacyFrame>
        <LegacyFrame sx={{ maxWidth: 560 }}>
          <L label="Red Amt" w={140}>{T('deduction', { type: 'number', sx: { ...box, width: 160 }, title: 'Reduces the available limit' })}</L>
          <L label="Topup Lmt" w={140}>{S('topUp', yn, 160)}</L>
          <L label="Special App" w={140}>{S('special', opt(options.data?.specialApprovals), 300, true)}</L>
          <L label="Query Status" w={140}>{S('query', yn, 160)}</L>
          <L label="Pymt P'ding App" w={140}>{S('payPending', yn, 160)}</L>
          <L label="First Doc Date" w={140}>{D('firstDoc')}</L>
          <L label="Subseq. Doc Date" w={140}>{D('subDoc')}</L>
          <L label="Date Rec. Doc." w={140}>{D('docDate')}</L>
        </LegacyFrame>
      </Box>
    ),
    notes: () => (
      <Box sx={{ display: 'grid', gap: 1 }}>
        {f.remarks.map((r, i) => (
          <TextField key={i} size="small" label={`Page ${i + 1}`} value={r} multiline minRows={2} onChange={(e) => setF((x) => ({ ...x, remarks: x.remarks.map((v, j) => (j === i ? e.target.value : v)) }))} slotProps={{ htmlInput: { maxLength: 3900 } }} />
        ))}
        {member && <LegacyFrame title="Member management note"><CaseManagementNote memberNumber={member.memberNumber} area={area} /></LegacyFrame>}
      </Box>
    ),
    lg: () => (adjusted ? <CaseLgTab caseNumber={adjusted.no} lgAmount={f.lg ? Number(f.lg) : null} /> : null),
    worksheet: () => (adjusted ? <CaseWorksheetTab caseNumber={adjusted.no} /> : null),
  }
  const isMember = (t: TabKey): t is MemberTab => [...memberTabs, ...memberTabsAfterNotes].some(([k]) => k === t)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>{adjust ? 'Case Adjustment' : 'Case Registration'}</LegacyTitle>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {member?.planMessage && <Alert severity="info">{member.planMessage}</Alert>}
      {registered && <CaseAfterRegistration key={registered.caseNumber} caseNumber={registered.caseNumber} letters={registered.letters} lgAmount={registered.lg} lgTime={registered.lgTime} onDone={() => setRegistered(null)} />}

      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {adjust ? <>
          <Typography sx={{ fontSize: 13 }}>Case Num</Typography>
          <TextField size="small" sx={{ ...box, width: 150 }} value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) load.mutate(caseNo) }} slotProps={{ htmlInput: { maxLength: 15 } }} />
          <Button size="small" variant="outlined" disabled={!caseNo.trim() || load.isPending} onClick={() => load.mutate(caseNo)}>Go</Button>
          <Button size="small" variant="outlined" onClick={() => setSearching(true)}>Search</Button>
          <Button size="small" variant="outlined" disabled={!adjusted || step.isPending} onClick={() => step.mutate('previous')}>Pre</Button>
          <Button size="small" variant="outlined" disabled={step.isPending} onClick={() => step.mutate('next')}>Next</Button>
        </> : <>
          <Typography sx={{ fontSize: 13 }}>MBM Num</Typography>
          <TextField size="small" sx={{ ...box, width: 180 }} value={number} onChange={(e) => setNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && number.trim()) { setMessage(null); show.mutate(number) } }} slotProps={{ htmlInput: { maxLength: 15 } }} />
          <Button size="small" variant="outlined" disabled={!number.trim() || show.isPending} onClick={() => { setMessage(null); show.mutate(number) }}>Go</Button>
          <Button size="small" variant="outlined" onClick={() => setSearching(true)}>Search</Button>
        </>}
        <Typography sx={{ fontSize: 13, ml: 1 }}>Cas Status</Typography>
        <TextField select size="small" sx={{ ...box, width: 120 }} value={status} disabled={!adjust || !adjusted} onChange={(e) => setStatus(e.target.value)}>
          {[['O', 'O - Open'], ['C', 'C - Close'], ['D', 'D - Delete']].map(([c, n]) => <MenuItem key={c} value={c}>{n}</MenuItem>)}
        </TextField>
        <Typography sx={{ fontSize: 13, ml: 1 }}>Claimability</Typography>
        {S('claimability', opt(options.data?.claimability), 230)}
        <Typography sx={{ fontSize: 13, ml: 1 }}>Pending</Typography>
        {S('pending', yn, 100)}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr 1fr' } }}>
        <Box>
          <L label="Name" w={60}><TextField size="small" fullWidth sx={box} value={member?.name ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
          <L label="Payor" w={60}><TextField size="small" sx={{ ...box, width: 90 }} value={member?.payor ?? ''} slotProps={{ input: { readOnly: true } }} /><Typography sx={{ fontSize: 13 }}>IC Num</Typography><TextField size="small" fullWidth sx={box} value={member?.icBcPp ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
        </Box>
        <Box>
          <L label="Renewal" w={70}><TextField size="small" sx={{ ...box, width: 60 }} value={member?.renewal ?? ''} slotProps={{ input: { readOnly: true } }} /><Typography sx={{ fontSize: 13 }}>T/Over</Typography><TextField size="small" sx={{ ...box, width: 60 }} value={member?.takeOver ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
          <L label="Pol Status" w={70}><TextField size="small" fullWidth sx={yellow} value={member?.status ?? ''} slotProps={{ input: { readOnly: true } }} /></L>
        </Box>
        <Box>
          <L label="Eff Date" w={70}><TextField size="small" sx={box} value={toDmy(member?.effectiveDate ?? '')} slotProps={{ input: { readOnly: true } }} /></L>
          <L label="Exp Date" w={70}><TextField size="small" sx={box} value={toDmy(member?.expiryDate ?? '')} slotProps={{ input: { readOnly: true } }} error={expired} />{expired && <Typography color="error" sx={{ fontSize: 13 }}>Expired</Typography>}</L>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ opacity: member && !blocked ? 1 : 0.55, pointerEvents: member && !blocked ? 'auto' : 'none' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 34, '& .MuiTab-root': { minHeight: 34, textTransform: 'none', px: 1.25 } }}>
          {tabList.map(([k, l]) => <Tab key={k} value={k} label={l} />)}
        </Tabs>
        <Box sx={{ p: 1 }}>
          {member ? (isMember(tab) ? <CaseMemberTab memberNumber={member.memberNumber} area={area} tab={tab} /> : panel[tab]?.()) : <Typography color="text.secondary">{adjust ? 'Show a case first.' : 'Enter the member number and click Go.'}</Typography>}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="small" variant="outlined" disabled={!savedCase} title={savedCase ? '' : 'Register the case first'} onClick={() => setLgOpen(true)}>LG</Button>
        <Button size="small" variant="outlined" disabled={!savedCase} title={savedCase ? '' : 'Register the case first'} onClick={notification}>Notification</Button>
        <Button size="small" variant="outlined" disabled={!member} onClick={() => draft('take-home-drugs')}>T.Home Drugs</Button>
        <Button size="small" variant="outlined" disabled={!member} onClick={() => draft('doc-request-admission')}>Doc Req Adm</Button>
        <Button size="small" variant="outlined" disabled={!member} onClick={() => draft('doc-request-discharge')}>Doc Req Discharge</Button>
        <Typography sx={{ fontSize: 13, ml: 2 }}>Case Number</Typography>
        <TextField size="small" sx={{ ...yellow, width: 150 }} value={savedCase ?? ''} slotProps={{ input: { readOnly: true } }} />
        {adjusted && <Typography variant="body2" color="text.secondary">Last updated {adjusted.by ?? '-'} {toDmy(adjusted.on ?? '')}</Typography>}
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" disabled={!member || blocked || register.isPending || update.isPending || (adjust && !adjusted) || (!adjust && !!registered)} onClick={() => { setMessage(null); setConfirming(true) }}>{adjust ? 'Update' : 'Register'}</Button>
        <Button size="small" variant="outlined" onClick={clear}>Clear</Button>
        <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
      </Paper>
      <Typography variant="caption" color="text.secondary">* - Mandatory Fields.</Typography>

      <CaseSearchDialog open={searching} onClose={() => setSearching(false)} onPick={(no, item) => { setSearching(false); if (adjust) load.mutate(no); else { setNumber(item.memberNumber); show.mutate(item.memberNumber) } }} />
      <Dialog open={lgOpen} onClose={() => setLgOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Guarantee letters {savedCase}</DialogTitle>
        <DialogContent>{savedCase && <CaseLgTab caseNumber={savedCase} lgAmount={f.lg ? Number(f.lg) : null} />}</DialogContent>
        <DialogActions><Button onClick={() => setLgOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={confirming} onClose={() => setConfirming(false)}><DialogTitle>{adjust ? 'Update case' : 'Register case'}</DialogTitle><DialogContent><DialogContentText>Are you sure?</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirming(false)}>No</Button><Button variant="contained" disabled={register.isPending || update.isPending} onClick={() => (adjust ? update.mutate(ack) : register.mutate(ack))}>Yes</Button></DialogActions></Dialog>
      <Dialog open={!!prompt} onClose={() => setPrompt(null)}><DialogTitle>Please confirm</DialogTitle><DialogContent><DialogContentText>{prompt?.text}</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setPrompt(null)}>No</Button><Button variant="contained" onClick={() => { const a = { ...ack, ...prompt!.next }; setAck(a); setPrompt(null); if (adjust) update.mutate(a); else register.mutate(a) }}>Yes</Button></DialogActions></Dialog>
    </Box>
  )
}
