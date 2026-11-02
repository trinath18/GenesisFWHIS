import { Alert, Chip, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { worksheetApi, type WorksheetAdjustmentView, type WorksheetSaveResult } from '../../api/worksheets'
import { formatMoney } from '../../lib/format'
import { WorksheetForm } from './WorksheetForm'
import { previewModel } from './worksheetModel'

const filled = (t: Record<number, string>) => Object.fromEntries(Object.entries(t).filter(([, v]) => v.trim() !== ''))

/**
 * Legacy: Worksheet > WorkSheet Adjustment (frmNewWSAdjust2010). A saved version recalculated from its invoices (after an invoice was corrected, or with
 * limits typed by the claims officer) and rewritten. Only the latest version can be amended, and only until it goes on a bordereau.
 */
export function WorksheetAdjustmentPage() {
  const [caseNo, setCaseNo] = useState('')
  const [data, setData] = useState<WorksheetAdjustmentView | null>(null)
  const [typed, setTyped] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<WorksheetSaveResult | null>(null)
  const [stamp, setStamp] = useState(0)
  const load = useMutation({
    mutationFn: ({ no, version }: { no: string; version?: number }) => worksheetApi.adjustment(no, version),
    onSuccess: (d) => { setData(d); setTyped({}); setStamp((s) => s + 1) }, onError: () => setData(null),
  })
  const recalc = useMutation({
    mutationFn: (t: Record<number, string>) => worksheetApi.adjustmentCalculate(data!.case.caseNumber, data!.version, filled(t)), onSuccess: setData,
  })
  const s = data?.saved
  return (
    <WorksheetForm key={`${data?.case.caseNumber}-${data?.version}-${stamp}`} screen="worksheet-adjustment" title="Worksheet Adjustment"
      caseNo={caseNo} setCaseNo={setCaseNo} onGo={(no) => { setSaved(null); load.mutate({ no: (no ?? caseNo).trim() }) }} loading={load.isPending}
      error={load.error ?? recalc.error} model={data ? previewModel(data.recalculated) : null} initial={data?.details}
      canSave={!!data?.canAmend} typed={typed} setTyped={setTyped} onRecalc={(t) => data?.canAmend && recalc.mutate(t ?? typed)}
      submit={(r) => worksheetApi.amend(data!.case.caseNumber, data!.version, r)} saveLabel="Update" savedVersion={data?.version ?? null}
      onSaved={(r) => { setSaved(r); load.mutate({ no: data!.case.caseNumber, version: data!.version }) }}
      headerExtra={data && (
        <>
          <Typography variant="body2" sx={{ ml: 1 }}>Version</Typography>
          <TextField select size="small" value={data.version} onChange={(e) => load.mutate({ no: data.case.caseNumber, version: Number(e.target.value) })} sx={{ width: 90 }}>
            {data.versions.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
          <Chip size="small" color={data.canAmend ? 'success' : 'default'} label={data.canAmend ? 'Can be amended' : 'Read only'} />
        </>
      )}
      notice={<>
        {saved && <Alert severity="success" onClose={() => setSaved(null)}>Worksheet {saved.worksheetNumber} amended: approved {formatMoney(saved.finalApproved)}, hospital {formatMoney(saved.payableToHospital)}, member {formatMoney(saved.payableToMember)}{saved.balanceAfter != null ? `; annual balance now ${formatMoney(saved.balanceAfter)}` : ''}{saved.excessNumber ? `; excess ${saved.excessNumber}` : ''}.</Alert>}
        {data?.blockedReason && <Alert severity="info">{data.blockedReason}</Alert>}
        {s && data && s.totalApproved !== data.recalculated.calculation.finalApproved && (
          <Alert severity="warning">Saved: approved {formatMoney(s.totalApproved)}, hospital {formatMoney(s.payableToHospital)}, member {formatMoney(s.payableToMember)}. Recalculated from the invoices: approved {formatMoney(data.recalculated.calculation.finalApproved)}. Update rewrites the worksheet with the recalculated figures.</Alert>
        )}
      </>} />
  )
}
