import { Box, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { casesApi, type CaseDetail } from '../../api/cases'
import { LegacyFrame, LegacyRow as L } from '../../components/LegacyForm'
import { legacyBox as box } from '../../components/legacyStyles'
import { formatDate, formatMoney } from '../../lib/format'
import { withLabel, yesNo } from './labels'

/** A read-only box, as the legacy inquiry form showed every field. */
function R({ v, w, multiline }: { v: string | number | null | undefined; w?: number | string; multiline?: boolean }) {
  return <TextField size="small" sx={{ ...box, width: w ?? '100%' }} value={v ?? ''} multiline={multiline} minRows={multiline ? 3 : undefined} slotProps={{ input: { readOnly: true } }} />
}
const t = (label: string, w = 85) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0, ml: 1 }}>{label}</Typography>

/** Three diagnosis rows: description, date onset, ICD (the legacy Prelim. Diag / Final Diag / Underlying Disease frames). */
function DiagFrame({ title, rows }: { title: string; rows: { text: string | null; date: string | null; code: string | null }[] }) {
  const three = [...rows, ...Array.from({ length: Math.max(0, 3 - rows.length) }, () => ({ text: null, date: null, code: null }))].slice(0, Math.max(3, rows.length))
  return (
    <LegacyFrame>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px', gap: 0.5 }}>
        <Typography sx={{ fontSize: 13 }}>{title}</Typography><Typography sx={{ fontSize: 13 }}>Date Onset</Typography><Typography sx={{ fontSize: 13 }}>ICD</Typography>
        {three.map((r, i) => [<R key={`t${i}`} v={r.text} />, <R key={`d${i}`} v={formatDate(r.date) === '-' ? '' : formatDate(r.date)} />, <R key={`c${i}`} v={r.code} />])}
      </Box>
    </LegacyFrame>
  )
}

/** Legacy "Case Det" tab of frmCaseInquiry. */
export function CaseDetTab({ d }: { d: CaseDetail }) {
  const h = d.header
  const m = d.member
  const repudiation = useQuery({ queryKey: ['case', h.caseNumber, 'repudiation'], queryFn: () => casesApi.repudiation(h.caseNumber) })
  const date = (v: string | null) => (v ? formatDate(v) : '')
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' } }}>
        <Box>
          <L label="Patient" w={95}><R v={`${h.coverId ?? ''} - ${h.patientName ?? ''}`} /></L>
          <L label="Hospital" w={95}><R v={h.hospitalName} /></L>
          <L label="Hospital Name" w={95}><R v={h.hospitalName} /></L>
          <L label="Reason" w={95} sx={{ alignItems: 'flex-start' }}><R v={h.admissionReason} multiline /></L>
          <L label="Refered By" w={95}><R v={h.referredBy} /></L>
        </Box>
        <Box>
          <L label="Nat of Clm" w={85}><R v={h.claimNature} w={130} />{t('Stay Type', 75)}<R v={h.stayType} /></L>
          <L label="Treat Mode" w={85}><R v={h.modality} w={130} />{t('Cash Type', 75)}<R v={h.payType} /></L>
          <L label="DOA" w={85}><R v={date(h.admitted)} w={130} />{t('DOD', 75)}<R v={date(h.discharged)} /></L>
          <L label="Cas Reg Date" w={85}><R v={date(h.registered)} w={130} />{t('ESP Ref No', 75)}<R v={h.espRefNo} /></L>
          <L label="Rsvr Amt" w={85}><R v={formatMoney(h.reserveAmount)} w={130} />{t('LG Amt', 75)}<R v={formatMoney(h.lgAmount)} /></L>
          <L label="LG Time" w={85}><R v={h.lgTime} w={130} />{t('Policy Year', 75)}<R v={h.policyYear} /></L>
          <L label="R&B Days" w={85}><R v={h.roomBoardDays} w={130} />{t('Claim ID', 75)}<R v={h.claimId} /></L>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <DiagFrame title="Prelim. Diag" rows={d.firstDiagnoses.map((x) => ({ text: x.description, date: x.dateOfService, code: x.icdCode }))} />
        <DiagFrame title="Final Diag" rows={d.finalDiagnoses.map((x) => ({ text: x.description, date: x.dateOfService, code: x.icdCode }))} />
        <DiagFrame title="Underlying Disease" rows={d.underlying.map((x) => ({ text: x.reason, date: x.dateOfService, code: x.code }))} />
        <LegacyFrame title="Repudiation Reason">
          {(repudiation.data?.reasons.length ? repudiation.data.reasons : [null, null, null]).map((r, i) => <R key={i} v={r ? `${r.code ?? ''} - ${r.description ?? ''}${r.reason ? ` (${r.reason})` : ''}` : ''} />)}
          {repudiation.data && (
            <Typography variant="caption" color="text.secondary">
              Issued by {repudiation.data.issuedBy ?? '-'} {date(repudiation.data.date)} · Document {repudiation.data.document ?? '-'} · Personnel {repudiation.data.personnel ?? '-'} · Attention {repudiation.data.attention ?? '-'}
            </Typography>
          )}
        </LegacyFrame>
      </Box>
      <LegacyFrame title="Member and policy">
        <Box sx={{ display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          <L label="Plan" w={95}><R v={[m.insurerCode, m.planCode, m.healthCode].filter(Boolean).join(' / ')} /></L>
          <L label="Product" w={95}><R v={m.productName} /></L>
          <L label="Payor" w={95}><R v={m.payorCode} /></L>
          <L label="Payor Eff" w={95}><R v={date(m.payorEffDate)} /></L>
          <L label="Payor Exp" w={95}><R v={`${date(m.payorExpDate)}${m.expiredStatus ? ` (${m.expiredStatus})` : ''}`} /></L>
          <L label="Avail. Lmt" w={95}><R v={formatMoney(m.availableLimit)} /></L>
          <L label="Pol Status" w={95}><R v={m.status} /></L>
          <L label="Group Co." w={95}><R v={m.groupCompany} /></L>
          <L label="Address" w={95}><R v={m.address} /></L>
        </Box>
      </LegacyFrame>
    </Box>
  )
}

/** Legacy "Others" tab: procedures with their OPCS codes and fees, investigations, medical management, attending doctors and anaesthetists. */
export function CaseOthersLegacyTab({ d }: { d: CaseDetail }) {
  const c = d.clinical
  const procFrame = (nonSurgical: boolean) => {
    const rows = c.procedures.filter((p) => p.nonSurgical === nonSurgical)
    const six = [...rows, ...Array.from({ length: Math.max(0, 6 - rows.length) }, () => null)]
    return (
      <LegacyFrame>
        <Box sx={{ display: 'grid', gridTemplateColumns: nonSurgical ? '1fr 90px 100px' : '1fr 90px 100px 100px', gap: 0.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{nonSurgical ? 'Non-Surgical Procedures' : 'Surgical Procedures'}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>OPCS</Typography><Typography sx={{ fontSize: 13, fontWeight: 600 }}>Actual</Typography>
          {!nonSurgical && <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Anaes Actual</Typography>}
          {six.map((p, i) => [
            <R key={`p${i}`} v={p?.procedure} />, <R key={`c${i}`} v={p?.cptCode} />,
            <R key={`a${i}`} v={p ? formatMoney(nonSurgical ? p.nonSurgicalFees : p.surgeonFees) : ''} />,
            ...(nonSurgical ? [] : [<R key={`n${i}`} v={p ? formatMoney(p.anaesthetistFees) : ''} />]),
          ])}
        </Box>
      </LegacyFrame>
    )
  }
  const lines = (title: string, items: string[], n: number) => (
    <LegacyFrame title={title}>{[...items, ...Array.from({ length: Math.max(0, n - items.length) }, () => '')].map((v, i) => <R key={i} v={v} />)}</LegacyFrame>
  )
  const invs = Array.from({ length: Math.max(3, c.investigationsDone.length, c.investigationCodes.length) }, (_, i) => [c.investigationsDone[i] ?? '', c.investigationCodes[i] ?? ''])
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' } }}>
        <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>{procFrame(false)}{procFrame(true)}</Box>
        <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>
          {lines('Att Doc', c.attendingDoctors, 5)}
          {lines('Anaes', c.anaesthetists, 3)}
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' } }}>
        <LegacyFrame title="Investigation">
          {invs.map(([done, code], i) => <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 0.5 }}><R v={done} /><R v={code} /></Box>)}
        </LegacyFrame>
        {lines('Medical Management', c.medicalSurgicalManagement, 3)}
        {lines('Medication on Discharge', c.medicationOnDischarge, 3)}
      </Box>
      {d.complaint && (
        <LegacyFrame title="Complaint">
          <L label="Complaint Date" w={110}><R v={formatDate(d.complaint.date)} w={130} />{t('Complainant', 90)}<R v={d.complaint.complainant} /></L>
          <L label="Complaint Issue" w={110}><R v={d.complaint.issue} />{t('Action', 60)}<R v={d.complaint.action} /></L>
        </LegacyFrame>
      )}
    </Box>
  )
}

/** Legacy "Take Over/Others" tab. */
export function TakeOverLegacyTab({ d }: { d: CaseDetail }) {
  const h = d.header
  const c = d.clinical
  const date = (v: string | null) => (v ? formatDate(v) : '')
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13 }}>T/O Ind</Typography><R v={h.takeOverIndicator} w={80} />
          <Typography sx={{ fontSize: 13 }}>T/O Amt</Typography><R v={formatMoney(h.takeOverAmount)} w={120} />
          <Typography sx={{ fontSize: 13 }}>Int/Ext TakeOver</Typography><R v={h.internalExternalTakeOver} w={80} />
          <Typography sx={{ fontSize: 13 }}>T/O Pln</Typography><R v={h.takeOverPlan} w={80} />
          <Typography sx={{ fontSize: 13 }}>Link Case</Typography><R v={h.linkCaseNumber} w={140} />
        </Box>
      </LegacyFrame>
      <LegacyFrame sx={{ maxWidth: 760 }}>
        <L label="Red Amt" w={110}><R v={formatMoney(c.reductionAmount)} w={150} />{t("Pymt P'ding App", 120)}<R v={withLabel(c.payPending, yesNo)} w={150} /></L>
        <L label="Topup Lmt" w={110}><R v={withLabel(h.topupLimit, yesNo)} w={150} />{t('First Doc Date', 120)}<R v={date(c.firstDoctorDate)} w={150} /></L>
        <L label="Special App" w={110}><R v={h.caseIndicator} w={150} />{t('Subseq. Doc Date', 120)}<R v={date(c.subsequentDoctorDate)} w={150} /></L>
        <L label="Query Status" w={110}><R v={withLabel(h.query, yesNo)} w={150} /></L>
      </LegacyFrame>
      <LegacyFrame title="Follow-up (hidden on the legacy form)" sx={{ maxWidth: 760 }}>
        <L label="1st. Call" w={110}><R v={c.firstCall} w={150} />{t('1st. Treated', 120)}<R v={c.firstTreated} w={150} /></L>
        <L label="Recur" w={110}><R v={withLabel(c.conditionWillRecur, yesNo)} w={150} />{t('Fol. Req', 120)}<R v={withLabel(c.followUpRequired, yesNo)} w={150} /></L>
        <L label="Fol. Up" w={110}><R v={c.followUp} w={150} />{t('Patient Age', 120)}<R v={[c.patientAge, c.patientAgeUnit].filter(Boolean).join(' ')} w={150} /></L>
      </LegacyFrame>
    </Box>
  )
}

