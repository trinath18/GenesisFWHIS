import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { adjustmentApi, type AdjustmentMember, type CancellationQuote, type PlanChangeQuote, type PrincipalAmendment, type SupplementaryCancelQuote, type SupplementaryDeleteQuote, type SupplementaryQuote } from '../../api/adjustment'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateInput } from '../../components/DateField'
import { Field, FieldGrid, RowsTable } from '../../components/DataTables'
import { LegacyFrame, LegacyRow as L, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox, legacyYellow } from '../../components/legacyStyles'
import { AdjustmentHistoryTab, CoveredPersonsList, FeesTab, MemberHistoryTab, MgmtNoteTab } from './AdjustmentTabs'
import { formatDate, formatMoney } from '../../lib/format'

type Form = Record<'name' | 'policyNo' | 'icBcPp' | 'dateOfBirth' | 'sex' | 'address1' | 'address2' | 'address3' | 'city' | 'state' | 'postCode' | 'race' | 'nationality' | 'salutation' | 'email' | 'telHome' | 'telMobile' | 'telOffice' | 'endorsementBordxDate' | 'effectiveDate' | 'batchNo', string>

const toForm = (m: AdjustmentMember): Form => ({
  name: m.name ?? '', policyNo: m.policyNo ?? '', icBcPp: m.icBcPp ?? '', dateOfBirth: m.dateOfBirth ?? '', sex: m.sex ?? '', address1: m.address1 ?? '', address2: m.address2 ?? '', address3: m.address3 ?? '',
  city: m.city ?? '', state: m.state ?? '', postCode: m.postCode ?? '', race: m.race ?? '', nationality: m.nationality ?? '', salutation: m.salutation ?? '', email: m.email ?? '',
  telHome: m.telHome ?? '', telMobile: m.telMobile ?? '', telOffice: m.telOffice ?? '', endorsementBordxDate: '', effectiveDate: '', batchNo: m.batchNo?.toString() ?? '',
})

/** Legacy: Membership > Adjustment, amendment of a principal's personal details (endorsement type A). Fee-changing endorsements follow later. */
export function AdjustmentPage() {
  const [number, setNumber] = useState('')
  const [member, setMember] = useState<AdjustmentMember | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const load = useMutation({
    mutationFn: (n?: string) => adjustmentApi.get(n ?? number),
    onSuccess: (m) => { setMember(m); setForm(toForm(m)); setNumber(m.memberNumber); setMessage(null) },
    onError: (e) => { setMember(null); setForm(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const save = useMutation({
    mutationFn: () => adjustmentApi.amend({ memberNumber: member!.memberNumber, ...form!, dateOfBirth: form!.dateOfBirth || null, endorsementBordxDate: form!.endorsementBordxDate || null, effectiveDate: form!.effectiveDate || null, batchNo: form!.batchNo ? Number(form!.batchNo) : null } as PrincipalAmendment),
    onSuccess: (r) => {
      setConfirming(false); setMember(r.member); setForm(toForm(r.member))
      setMessage(r.crossReferenceUpdated && r.renewalKeyUpdated ? { severity: 'success', text: 'Record updated.' } : { severity: 'error', text: 'Record updated, but the maintenance copies (cross reference / renewal key) could not be updated. Please tell IT to re-run the sync.' })
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const [cx, setCx] = useState({ cancelDate: '', bordx: '', batch: '' })
  const [cxQuote, setCxQuote] = useState<CancellationQuote | null>(null)
  const [cxConfirming, setCxConfirming] = useState(false)
  const cxRequest = () => ({ memberNumber: member!.memberNumber, cancelDate: cx.cancelDate || null, endorsementBordxDate: cx.bordx || null, batchNo: cx.batch ? Number(cx.batch) : null })
  const quoteCx = useMutation({
    mutationFn: () => adjustmentApi.quoteCancellation(cxRequest()),
    onSuccess: (q) => { setCxQuote(q); setMessage(null) },
    onError: (e) => { setCxQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const cancelCx = useMutation({
    mutationFn: () => adjustmentApi.cancel(cxRequest()),
    onSuccess: (r) => {
      setCxConfirming(false); setCxQuote(null)
      setMessage(r.crossReferenceUpdated ? { severity: 'success', text: 'Membership cancelled. Refund recorded.' } : { severity: 'error', text: 'Membership cancelled, but the maintenance cross reference could not be updated. Please tell IT to re-run the sync.' })
      load.mutate()
    },
    onError: (e) => { setCxConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const [pc, setPc] = useState({ plan: '', effective: '', bordx: '', batch: '', updateMco: true, updateLimit: false })
  const [pcQuote, setPcQuote] = useState<PlanChangeQuote | null>(null)
  const [pcConfirming, setPcConfirming] = useState(false)
  const pcRequest = () => ({ memberNumber: member!.memberNumber, newPlan: pc.plan, effectiveDate: pc.effective || null, endorsementBordxDate: pc.bordx || null, batchNo: pc.batch ? Number(pc.batch) : null, updateMcoFee: pc.updateMco, updateAnnualLimit: pc.updateLimit })
  const quotePc = useMutation({
    mutationFn: () => adjustmentApi.quotePlanChange(pcRequest()),
    onSuccess: (q) => { setPcQuote(q); setMessage(null) },
    onError: (e) => { setPcQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const changePc = useMutation({
    mutationFn: () => adjustmentApi.changePlan(pcRequest()),
    onSuccess: (r) => {
      setPcConfirming(false); setPcQuote(null)
      setMessage(r.crossReferenceUpdated ? { severity: 'success', text: 'Plan changed. Refund recorded.' } : { severity: 'error', text: 'Plan changed, but the maintenance copies could not be updated. Please tell IT to re-run the sync.' })
      load.mutate()
    },
    onError: (e) => { setPcConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const pcSet = (k: 'plan' | 'effective' | 'bordx' | 'batch') => (e: { target: { value: string } }) => { setPc((x) => ({ ...x, [k]: e.target.value })); setPcQuote(null) }
  const [se, setSe] = useState({ type: 'X', effective: '', bordx: '', batch: '' })
  const [seConfirming, setSeConfirming] = useState(false)
  const seLabel = se.type === 'X' ? 'suspend' : 'delete the policy of'
  const statusEndorse = useMutation({
    mutationFn: () => adjustmentApi.statusEndorsement({ memberNumber: member!.memberNumber, type: se.type, effectiveDate: se.effective || null, endorsementBordxDate: se.bordx || null, batchNo: se.batch ? Number(se.batch) : null }),
    onSuccess: (r) => {
      setSeConfirming(false)
      setMessage(r.crossReferenceUpdated ? { severity: 'success', text: r.type === 'X' ? 'Membership suspended.' : 'Policy deleted.' } : { severity: 'error', text: 'Saved, but the maintenance cross reference could not be updated. Please tell IT to re-run the sync.' })
      load.mutate()
    },
    onError: (e) => { setSeConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const emptySupp = { name: '', salutation: '', ic: '', dob: '', sex: '', rel: '', allergies: '', exclusion: '', plan: '', effective: '', bordx: '', batch: '', renew: '', policy: '', guarantee: '' }
  const [sp, setSp] = useState(emptySupp)
  const [spQuote, setSpQuote] = useState<SupplementaryQuote | null>(null)
  const [spConfirming, setSpConfirming] = useState(false)
  const spRequest = () => ({
    memberNumber: member!.memberNumber, name: sp.name, salutation: sp.salutation || null, icBcPp: sp.ic, dateOfBirth: sp.dob || null, sex: sp.sex, relationship: sp.rel, allergies: sp.allergies || null,
    exclusion: sp.exclusion || null, supplementaryPlan: sp.plan || null, effectiveDate: sp.effective || null, endorsementBordxDate: sp.bordx || null, batchNo: sp.batch ? Number(sp.batch) : null,
    renewalDiscount: sp.renew ? Number(sp.renew) : null, policyDiscount: sp.policy ? Number(sp.policy) : null, guaranteeRenewal: sp.guarantee || null,
  })
  const quoteSp = useMutation({
    mutationFn: () => adjustmentApi.quoteSupplementary(spRequest()),
    onSuccess: (q) => { setSpQuote(q); setMessage(null) },
    onError: (e) => { setSpQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const addSp = useMutation({
    mutationFn: () => adjustmentApi.addSupplementary(spRequest()),
    onSuccess: (r) => { setSpConfirming(false); setSpQuote(null); setSp(emptySupp); setMessage({ severity: 'success', text: `Supplementary person added as cover ${r.quote.coverId}.` }); load.mutate() },
    onError: (e) => { setSpConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const spSet = (k: keyof typeof emptySupp) => (e: { target: { value: string } }) => { setSp((x) => ({ ...x, [k]: e.target.value })); setSpQuote(null) }
  const [sc, setSc] = useState({ cover: '', effective: '', bordx: '', batch: '' })
  const [scQuote, setScQuote] = useState<SupplementaryCancelQuote | null>(null)
  const [scConfirming, setScConfirming] = useState(false)
  const scRequest = () => ({ memberNumber: member!.memberNumber, coverId: sc.cover, effectiveDate: sc.effective || null, endorsementBordxDate: sc.bordx || null, batchNo: sc.batch ? Number(sc.batch) : null })
  const quoteSc = useMutation({
    mutationFn: () => adjustmentApi.quoteSupplementaryCancel(scRequest()),
    onSuccess: (q) => { setScQuote(q); setMessage(null) },
    onError: (e) => { setScQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const cancelSc = useMutation({
    mutationFn: () => adjustmentApi.cancelSupplementary(scRequest()),
    onSuccess: (r) => { setScConfirming(false); setScQuote(null); setMessage({ severity: 'success', text: `Cover ${r.quote.coverId} cancelled.` }); load.mutate() },
    onError: (e) => { setScConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const scSet = (k: 'cover' | 'effective' | 'bordx' | 'batch') => (e: { target: { value: string } }) => { setSc((x) => ({ ...x, [k]: e.target.value })); setScQuote(null) }
  const [sd, setSd] = useState({ cover: '', effective: '', bordx: '', batch: '' })
  const [sdQuote, setSdQuote] = useState<SupplementaryDeleteQuote | null>(null)
  const [sdConfirming, setSdConfirming] = useState(false)
  const sdRequest = () => ({ memberNumber: member!.memberNumber, coverId: sd.cover, effectiveDate: sd.effective || null, endorsementBordxDate: sd.bordx || null, batchNo: sd.batch ? Number(sd.batch) : null })
  const quoteSd = useMutation({
    mutationFn: () => adjustmentApi.quoteSupplementaryDelete(sdRequest()),
    onSuccess: (q) => { setSdQuote(q); setMessage(null) },
    onError: (e) => { setSdQuote(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const deleteSd = useMutation({
    mutationFn: () => adjustmentApi.deleteSupplementary(sdRequest()),
    onSuccess: (r) => { setSdConfirming(false); setSdQuote(null); setMessage({ severity: 'success', text: `Cover ${r.quote.coverId} deleted (${r.rowsDeleted} rows).` }); load.mutate() },
    onError: (e) => { setSdConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const sdSet = (k: 'cover' | 'effective' | 'bordx' | 'batch') => (e: { target: { value: string } }) => { setSd((x) => ({ ...x, [k]: e.target.value })); setSdQuote(null) }
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))
  const submit = (e: FormEvent) => { e.preventDefault(); setMessage(null); load.mutate() }

  const [tab, setTab] = useState(0)
  const [showEdit, setShowEdit] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const overview = useQuery({ queryKey: ['adj-overview', member?.memberNumber], queryFn: () => adjustmentApi.overview(member!.memberNumber), enabled: !!member })
  const detail = overview.data?.detail
  const search = useMutation({ mutationFn: () => adjustmentApi.search(searchText), onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }) })
  const go = (n: string) => { setNumber(n); setMessage(null); setTab(0); setShowEdit(false); load.mutate(n) }
  const step = useMutation({
    mutationFn: (direction: 'next' | 'previous') => adjustmentApi.neighbour(member?.memberNumber ?? number, direction),
    onSuccess: (r) => go(r.memberNumber),
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  const openTab = (v: number) => {
    if (v === 1 && member && !['F', 'H'].includes(member.insurer?.trim() ?? '')) { setMessage({ severity: 'error', text: 'This Plan does not have supplementary' }); return }
    setTab(v)
  }
  const box = legacyBox
  const ro = (v: string | number | null | undefined, w: number | string = '100%', sx: object = box) => <TextField size="small" sx={{ ...sx, width: w }} value={v ?? ''} slotProps={{ input: { readOnly: true } }} />
  const E = (k: keyof Form, max: number, w: number | string = '100%', required = false) => <TextField size="small" sx={{ ...box, width: w }} required={required} value={form?.[k] ?? ''} onChange={set(k)} slotProps={{ htmlInput: { maxLength: max } }} />
  const ED = (k: keyof Form, w = 140) => <DateInput sx={{ ...box, width: w }} value={form?.[k] ?? ''} onChange={set(k)} />
  const t = (label: string, w = 85) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0, ml: 1 }}>{label}</Typography>
  const [othersOpen, setOthersOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Member Adjustment</LegacyTitle>
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 13 }}>Mem Num.</Typography>
          <TextField size="small" sx={{ ...box, width: 220 }} value={number} onChange={(e) => setNumber(e.target.value)} autoFocus slotProps={{ htmlInput: { maxLength: 15 } }} />
          <Button size="small" type="submit" variant="outlined" disabled={!number.trim() || load.isPending}>Go</Button>
          <Button size="small" variant="outlined" disabled={!number.trim() || step.isPending} onClick={() => step.mutate('previous')}>Pre</Button>
          <Button size="small" variant="outlined" disabled={step.isPending} onClick={() => step.mutate('next')}>Next</Button>
          <Button size="small" variant="outlined" onClick={() => { setSearchOpen(true); search.reset() }}>Search</Button>
        </Box>
      </Paper>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {!member && <Paper variant="outlined" sx={{ p: 2 }}><Typography color="text.secondary">Enter the membership number and click Go, or Search.</Typography></Paper>}
      {member && form && (
        <>
          <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.5 }}>
            <L label="Endt. Status" w={95}>{ro(detail?.endorseType, 150)}{t('Pol. Status')}{ro(member.status, 110, legacyYellow)}{t('Exp. Status')}{ro(detail?.expiredStatus, 90)}{t('Bat. Num', 70)}{E('batchNo', 6, 80, true)}</L>
            <L label="Endt Eff Date" w={95}>{ED('effectiveDate', 150)}{t('Endt Bordx Date')}{ED('endorsementBordxDate', 110)}{t('Data Status')}{ro(detail?.dataStatus, 90)}{t('Last Endt', 70)}{ro(detail?.endorsementDate ? formatDate(detail.endorsementDate) : '', 110)}</L>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.5 }}>
            <L label="Salutation" w={75}>{E('salutation', 5, 90)}{t('Mem Name', 75)}{E('name', 60, '100%', true)}{t('IC. Num', 60)}<Box sx={{ width: 220, flexShrink: 0 }}>{E('icBcPp', 30, '100%', true)}</Box></L>
            <L label="Payor" w={75}>{ro(member.payor, 90)}{t('Policy Num', 75)}{E('policyNo', 25)}{t('Hlt Type', 60)}<Box sx={{ width: 220, flexShrink: 0 }}>{ro(detail?.healthCode)}</Box></L>
          </Paper>
          <Paper variant="outlined">
            <Tabs value={tab} onChange={(_, v) => openTab(v)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 34, '& .MuiTab-root': { minHeight: 34, textTransform: 'none' } }}>
              <Tab label="Principal Details" /><Tab label="Supplementary" /><Tab label="Adjustment History" /><Tab label="Fees" /><Tab label="MBM History" /><Tab label="Mgmt Note" />
            </Tabs>
            <Box sx={{ p: 1 }} hidden={tab !== 0}>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' } }}>
                <Box>
                  <L label="Address" w={85}>{E('address1', 50)}</L>
                  <L label="" w={85}>{E('address2', 50)}</L>
                  <L label="" w={85}>{E('address3', 50)}</L>
                  <L label="PostCode" w={85}>{E('postCode', 6, 110)}{t('City/Town')}{E('city', 50)}</L>
                  <L label="State" w={85}>{E('state', 50)}</L>
                  <L label="Sex" w={85}>
                    <TextField select size="small" sx={{ ...box, width: 110 }} required value={form.sex} onChange={set('sex')}><MenuItem value="M">M - Male</MenuItem><MenuItem value="F">F - Female</MenuItem></TextField>
                    {t('TakeOver')}{ro(detail?.takeover)}
                  </L>
                  <L label="Birthdate" w={85}>{ED('dateOfBirth', 110)}{t('Age Band')}{ro(detail?.ageCode)}</L>
                  <L label="Race" w={85}>{E('race', 2, 110)}{t('Nationality')}{E('nationality', 10)}</L>
                  <L label="Renewal" w={85}>{ro(detail?.renewFlag, 110)}{t('Branch')}{ro(detail?.branchCode)}</L>
                </Box>
                <Box>
                  <L label="Ins Type" w={95}>{ro(member.insurer, 110)}{t('Plan Code', 75)}{ro(member.plan)}</L>
                  <L label="Eff Date" w={95}>{ro(formatDate(member.payorEffectiveDate), 110)}{t('Exp Date', 75)}{ro(formatDate(member.payorExpiryDate))}</L>
                  <L label="Final Exp Date" w={95}>{ro(formatDate(detail?.finalExpiryDate), 110)}{t('DOR', 75)}{ro(formatDate(detail?.valueDate))}</L>
                  <L label="Bordx. Date" w={95}>{ro(formatDate(detail?.bordxDate), 110)}{t('Batch Num', 75)}{ro(member.batchNo?.toString())}</L>
                  <L label="Pol. Year" w={95}>{ro(detail?.policyYear, 110)}</L>
                  <L label="Grp. Company" w={95}>{ro(detail?.groupCompany)}</L>
                </Box>
              </Box>
              {showEdit && <Box sx={{ mt: 1 }}>
      {member && form && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Cancel membership</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <DateInput label="Cancellation date" value={cx.cancelDate} onChange={(e) => { setCx({ ...cx, cancelDate: e.target.value }); setCxQuote(null) }} slotProps={{ inputLabel: { shrink: true } }} />
            <DateInput label="Cancel bordx date" value={cx.bordx} onChange={(e) => { setCx({ ...cx, bordx: e.target.value }); setCxQuote(null) }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Cancel batch no" value={cx.batch} onChange={(e) => { setCx({ ...cx, batch: e.target.value }); setCxQuote(null) }} sx={{ width: 140 }} />
            <Button variant="outlined" disabled={quoteCx.isPending} onClick={() => { setMessage(null); quoteCx.mutate() }}>Calculate refund</Button>
          </Box>
          {cxQuote && (
            <>
              <FieldGrid>
                <Field label="Premium on file" value={formatMoney(cxQuote.premium)} /><Field label="MCO fee on file" value={formatMoney(cxQuote.mcoFee)} />
                <Field label="Premium refund" value={formatMoney(cxQuote.refund.premiumReduction)} /><Field label="Premium remaining" value={formatMoney(cxQuote.refund.premiumEffective)} />
                <Field label="MCO refund" value={formatMoney(cxQuote.refund.mcoRefund)} /><Field label="MCO remaining" value={formatMoney(cxQuote.refund.mcoEffective)} />
              </FieldGrid>
              <Box><Button color="error" variant="contained" onClick={() => setCxConfirming(true)} disabled={cancelCx.isPending}>Cancel membership</Button></Box>
            </>
          )}
        </Paper>
      )}
      {member && form && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Change plan</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" label="New plan code" value={pc.plan} onChange={pcSet('plan')} slotProps={{ htmlInput: { maxLength: 8 } }} sx={{ width: 160 }} />
            <DateInput label="Plan change effective date" value={pc.effective} onChange={pcSet('effective')} slotProps={{ inputLabel: { shrink: true } }} />
            <DateInput label="Plan change bordx date" value={pc.bordx} onChange={pcSet('bordx')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Plan change batch no" value={pc.batch} onChange={pcSet('batch')} sx={{ width: 160 }} />
            <Button variant="outlined" disabled={quotePc.isPending} onClick={() => { setMessage(null); quotePc.mutate() }}>Calculate plan change</Button>
          </Box>
          {pcQuote && (
            <>
              <FieldGrid>
                <Field label="Old plan" value={pcQuote.oldPlan} /><Field label="New plan" value={pcQuote.newPlan} /><Field label="Age / band" value={`${pcQuote.ageText} / ${pcQuote.ageCode}`} />
                <Field label="New premium" value={formatMoney(pcQuote.premium)} /><Field label="Premium on file" value={formatMoney(pcQuote.currentPremium)} />
                <Field label="New MCO fee" value={formatMoney(pcQuote.mcoFee)} /><Field label="MCO fee on file" value={formatMoney(pcQuote.currentMcoFee)} />
                <Field label="Premium refund" value={formatMoney(pcQuote.refund.premiumReduction)} /><Field label="MCO refund" value={formatMoney(pcQuote.refund.mcoRefund)} />
                <Field label="Annual limit (now / new)" value={`${formatMoney(pcQuote.currentAnnualLimit)} / ${formatMoney(pcQuote.newAnnualLimit)}`} />
              </FieldGrid>
              {pcQuote.mcoFeeDiffers && <FormControlLabel control={<Checkbox checked={pc.updateMco} onChange={(e) => { setPc((x) => ({ ...x, updateMco: e.target.checked })); setPcQuote(null) }} />} label="Change the member's MCO fee to the new plan's fee" />}
              {pcQuote.annualLimitDiffers && pcQuote.newAnnualLimit !== null && <FormControlLabel control={<Checkbox checked={pc.updateLimit} onChange={(e) => setPc((x) => ({ ...x, updateLimit: e.target.checked }))} />} label="Change the annual limit" />}
              <Box><Button variant="contained" onClick={() => setPcConfirming(true)} disabled={changePc.isPending}>Change plan</Button></Box>
            </>
          )}
        </Paper>
      )}
      {member && form && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Suspend membership / delete policy</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField select size="small" label="Endorsement type" value={se.type} onChange={(e) => setSe({ ...se, type: e.target.value })} sx={{ width: 220 }}>
              <MenuItem value="X">X - Suspend Membership</MenuItem><MenuItem value="D">D - Delete Policy</MenuItem>
            </TextField>
            <DateInput label="Status effective date" value={se.effective} onChange={(e) => setSe({ ...se, effective: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <DateInput label="Status bordx date" value={se.bordx} onChange={(e) => setSe({ ...se, bordx: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Status batch no" value={se.batch} onChange={(e) => setSe({ ...se, batch: e.target.value })} sx={{ width: 140 }} />
            <Button color="error" variant="contained" disabled={statusEndorse.isPending} onClick={() => { setMessage(null); setSeConfirming(true) }}>Apply</Button>
          </Box>
        </Paper>
      )}
              </Box>}
            </Box>
            <Box sx={{ p: 2 }} hidden={tab !== 1}>
              <CoveredPersonsList number={member.memberNumber} />
      {member && form && (member.insurer?.trim() === 'F' || member.insurer?.trim() === 'H') && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Add supplementary person</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5 }}>
            <TextField size="small" label="Covered name" value={sp.name} onChange={spSet('name')} slotProps={{ htmlInput: { maxLength: 60 } }} />
            <TextField size="small" label="Covered salutation" value={sp.salutation} onChange={spSet('salutation')} slotProps={{ htmlInput: { maxLength: 5 } }} />
            <TextField size="small" label="Covered IC / passport" value={sp.ic} onChange={spSet('ic')} slotProps={{ htmlInput: { maxLength: 30 } }} />
            <DateInput label="Covered date of birth" value={sp.dob} onChange={spSet('dob')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select size="small" label="Covered sex" value={sp.sex} onChange={spSet('sex')}><MenuItem value="M">M - Male</MenuItem><MenuItem value="F">F - Female</MenuItem></TextField>
            <TextField size="small" label="Relationship code" value={sp.rel} onChange={spSet('rel')} slotProps={{ htmlInput: { maxLength: 1 } }} />
            <TextField size="small" label="Covered allergies" value={sp.allergies} onChange={spSet('allergies')} slotProps={{ htmlInput: { maxLength: 500 } }} />
            <TextField size="small" label="Covered exclusion" value={sp.exclusion} onChange={spSet('exclusion')} slotProps={{ htmlInput: { maxLength: 4000 } }} />
            <TextField size="small" label="Supplementary plan (if different)" value={sp.plan} onChange={spSet('plan')} slotProps={{ htmlInput: { maxLength: 4 } }} />
            <TextField size="small" type="number" label="Renewal discount %" value={sp.renew} onChange={spSet('renew')} />
            <TextField size="small" type="number" label="Policy discount %" value={sp.policy} onChange={spSet('policy')} />
            <TextField select size="small" label="Guarantee renewal (lifetime plans)" value={sp.guarantee} onChange={spSet('guarantee')}><MenuItem value="">(none)</MenuItem><MenuItem value="1">1 - No Life Time Limit</MenuItem><MenuItem value="3">3 - With Life Time Limit</MenuItem></TextField>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <DateInput label="Supplementary effective date" value={sp.effective} onChange={spSet('effective')} slotProps={{ inputLabel: { shrink: true } }} />
            <DateInput label="Supplementary bordx date" value={sp.bordx} onChange={spSet('bordx')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Supplementary batch no" value={sp.batch} onChange={spSet('batch')} sx={{ width: 170 }} />
            <Button variant="outlined" disabled={quoteSp.isPending} onClick={() => { setMessage(null); quoteSp.mutate() }}>Calculate supplementary</Button>
          </Box>
          {spQuote && (
            <>
              <FieldGrid>
                <Field label="Cover id" value={spQuote.coverId} /><Field label="Age / band" value={`${spQuote.ageText} / ${spQuote.ageCode}`} /><Field label="Plan" value={spQuote.plan} />
                <Field label="Cover period" value={`${formatDate(spQuote.effectiveDate)} - ${formatDate(spQuote.expiryDate)}`} /><Field label="Annual limit" value={formatMoney(spQuote.annualLimit)} />
                <Field label="Premium" value={formatMoney(spQuote.premium)} /><Field label="MCO fee" value={formatMoney(spQuote.mco)} />
                {spQuote.benefitLimits && <Field label="Benefit limits (kidney / cancer / home)" value={`${formatMoney(spQuote.benefitLimits.kidney)} / ${formatMoney(spQuote.benefitLimits.cancer)} / ${formatMoney(spQuote.benefitLimits.homeNursing)}`} />}
                {spQuote.lifetimeLimit && <Field label="Lifetime limit" value={formatMoney(spQuote.lifetimeLimit.limit)} />}
              </FieldGrid>
              <Box><Button variant="contained" onClick={() => setSpConfirming(true)} disabled={addSp.isPending}>Add supplementary person</Button></Box>
            </>
          )}
        </Paper>
      )}
      {member && form && (member.insurer?.trim() === 'F' || member.insurer?.trim() === 'H') && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Cancel supplementary person</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" label="Cover id to cancel" value={sc.cover} onChange={scSet('cover')} slotProps={{ htmlInput: { maxLength: 2 } }} sx={{ width: 150 }} />
            <DateInput label="Supplementary cancel date" value={sc.effective} onChange={scSet('effective')} slotProps={{ inputLabel: { shrink: true } }} />
            <DateInput label="Supplementary cancel bordx date" value={sc.bordx} onChange={scSet('bordx')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Supplementary cancel batch no" value={sc.batch} onChange={scSet('batch')} sx={{ width: 200 }} />
            <Button variant="outlined" disabled={quoteSc.isPending} onClick={() => { setMessage(null); quoteSc.mutate() }}>Calculate supplementary cancel</Button>
          </Box>
          {scQuote && (
            <>
              <FieldGrid>
                <Field label="Covered person" value={scQuote.name} /><Field label="Cover period" value={`${formatDate(scQuote.effectiveDate)} - ${formatDate(scQuote.expiryDate)}`} />
                <Field label="Premium on file" value={formatMoney(scQuote.premium)} /><Field label="MCO fee on file" value={formatMoney(scQuote.mcoFee)} />
                <Field label="Refund written" value={scQuote.refundWritten ? 'Yes' : 'No (plan status ' + scQuote.suppMcoStatus + ')'} />
                <Field label="Premium refund" value={formatMoney(scQuote.refund.premiumReduction)} /><Field label="MCO refund" value={formatMoney(scQuote.refund.mcoRefund)} />
              </FieldGrid>
              <Box><Button color="error" variant="contained" onClick={() => setScConfirming(true)} disabled={cancelSc.isPending}>Cancel supplementary person</Button></Box>
            </>
          )}
        </Paper>
      )}
      {member && form && (member.insurer?.trim() === 'F' || member.insurer?.trim() === 'H') && member.status !== 'C' && member.status !== 'D' && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1">Delete supplementary person</Typography>
          <Alert severity="warning">Deleting removes the covered person completely. A cover with cases, refunds or lifetime limits cannot be deleted; cancel it instead.</Alert>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" label="Cover id to delete" value={sd.cover} onChange={sdSet('cover')} slotProps={{ htmlInput: { maxLength: 2 } }} sx={{ width: 150 }} />
            <DateInput label="Supplementary delete date" value={sd.effective} onChange={sdSet('effective')} slotProps={{ inputLabel: { shrink: true } }} />
            <DateInput label="Supplementary delete bordx date" value={sd.bordx} onChange={sdSet('bordx')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Supplementary delete batch no" value={sd.batch} onChange={sdSet('batch')} sx={{ width: 200 }} />
            <Button variant="outlined" disabled={quoteSd.isPending} onClick={() => { setMessage(null); quoteSd.mutate() }}>Check supplementary delete</Button>
          </Box>
          {sdQuote && (
            <>
              <FieldGrid>
                <Field label="Covered person" value={sdQuote.name} /><Field label="Cover status" value={sdQuote.status} /><Field label="Cases" value={sdQuote.cases} />
                <Field label="Refund rows" value={sdQuote.refundRows} /><Field label="Lifetime-limit rows" value={sdQuote.lifetimeRows} /><Field label="Clinic / benefit rows" value={`${sdQuote.clinicRows} / ${sdQuote.benefitLimitRows}`} />
              </FieldGrid>
              {sdQuote.blockedReason ? <Alert severity="error">Cannot delete: this cover {sdQuote.blockedReason}.</Alert>
                : <Box><Button color="error" variant="contained" onClick={() => setSdConfirming(true)} disabled={deleteSd.isPending}>Delete supplementary person</Button></Box>}
            </>
          )}
        </Paper>
      )}
            </Box>
            <Box sx={{ p: tab >= 2 ? 1 : 0 }}>
              {tab === 2 && <AdjustmentHistoryTab number={member.memberNumber} />}
              {tab === 3 && <FeesTab number={member.memberNumber} />}
              {tab === 4 && <MemberHistoryTab number={member.memberNumber} />}
              {tab === 5 && <MgmtNoteTab key={member.memberNumber} number={member.memberNumber} initial={overview.data?.managementNote ?? null} />}
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size="small" variant="outlined" onClick={() => setOthersOpen(true)}>Others Details</Button>
            <Button size="small" variant="outlined" disabled={member.status === 'C' || member.status === 'D'} onClick={() => { setTab(0); setShowEdit((v) => !v) }}>Edit Status</Button>
            <Button size="small" variant="contained" disabled={save.isPending} onClick={() => { setMessage(null); setConfirming(true) }}>Save</Button>
            <Button size="small" variant="outlined" onClick={() => { setMember(null); setForm(null); setNumber(''); setMessage(null) }}>Exit</Button>
          </Paper>
          <Dialog open={othersOpen} onClose={() => setOthersOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Others Details</DialogTitle>
            <DialogContent>
              <LegacyFrame>
                <L label="E-mail" w={100}>{E('email', 50)}</L>
                <L label="Tel (H)" w={100}>{E('telHome', 12)}</L>
                <L label="Tel (M)" w={100}>{E('telMobile', 15)}</L>
                <L label="Tel (O)" w={100}>{E('telOffice', 15)}</L>
              </LegacyFrame>
              <Typography variant="caption" color="text.secondary">Saved with the rest of the amendment (Save).</Typography>
            </DialogContent>
            <DialogActions><Button onClick={() => setOthersOpen(false)}>Close</Button></DialogActions>
          </Dialog>
        </>
      )}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Search member</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={(e: FormEvent) => { e.preventDefault(); search.mutate() }} sx={{ display: 'flex', gap: 1, my: 1 }}>
            <TextField size="small" autoFocus label="Membership no, IC or name (min 4 characters)" value={searchText} onChange={(e) => setSearchText(e.target.value)} sx={{ flexGrow: 1 }} />
            <Button type="submit" variant="contained" disabled={search.isPending}>Search</Button>
          </Box>
          <RowsTable rows={search.data?.items ?? []} empty={search.isSuccess ? 'No members found.' : 'Enter a search text.'} columns={[
            { header: 'Member no', cell: (r) => <Button size="small" onClick={() => { setSearchOpen(false); go(r.number) }}>{r.number}</Button> },
            { header: 'Name', cell: (r) => r.name }, { header: 'IC', cell: (r) => r.icBcPp }, { header: 'Policy no', cell: (r) => r.policyNo }, { header: 'Status', cell: (r) => r.status },
          ]} />
        </DialogContent>
        <DialogActions><Button onClick={() => setSearchOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={sdConfirming} busy={deleteSd.isPending} title="Delete supplementary person" message={`Do you want to permanently delete cover ${sd.cover} of ${member?.memberNumber}? The record is kept in the audit log.`} onConfirm={() => deleteSd.mutate()} onCancel={() => setSdConfirming(false)} />
      <ConfirmDialog open={scConfirming} busy={cancelSc.isPending} title="Cancel supplementary person" message={`Do you want to cancel cover ${sc.cover} of ${member?.memberNumber} effective ${formatDate(sc.effective)}?`} onConfirm={() => cancelSc.mutate()} onCancel={() => setScConfirming(false)} />
      <ConfirmDialog open={spConfirming} busy={addSp.isPending} title="Add supplementary person" message={`Do you want to add ${sp.name} to ${member?.memberNumber}? The fees shown are recorded.`} onConfirm={() => addSp.mutate()} onCancel={() => setSpConfirming(false)} />
      <ConfirmDialog open={seConfirming} busy={statusEndorse.isPending} title="Confirm endorsement" message={`Do you want to ${seLabel} ${member?.memberNumber}? Covered persons follow the same status.`} onConfirm={() => statusEndorse.mutate()} onCancel={() => setSeConfirming(false)} />
      <ConfirmDialog open={pcConfirming} busy={changePc.isPending} title="Change plan" message={`Do you want to change ${member?.memberNumber} to plan ${pc.plan}? The new fees are recorded and a refund is calculated from ${formatDate(pc.effective)}.`} onConfirm={() => changePc.mutate()} onCancel={() => setPcConfirming(false)} />
      <ConfirmDialog open={cxConfirming} busy={cancelCx.isPending} title="Cancel membership" message={`Do you want to cancel ${member?.memberNumber} effective ${formatDate(cx.cancelDate)}? The covered persons are cancelled too and the refund is recorded.`} onConfirm={() => cancelCx.mutate()} onCancel={() => setCxConfirming(false)} />
      <ConfirmDialog open={confirming} busy={save.isPending} title="Save amendment" message={`Do you want to save the amendment for ${member?.memberNumber}? An amendment history entry will be recorded.`} onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
