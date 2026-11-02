import { Alert } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { worksheetApi, type WorksheetPreview, type WorksheetSaveResult } from '../../api/worksheets'
import { formatMoney } from '../../lib/format'
import { WorksheetForm } from './WorksheetForm'
import { previewModel } from './worksheetModel'

const filled = (t: Record<number, string>) => Object.fromEntries(Object.entries(t).filter(([, v]) => v.trim() !== ''))

/**
 * Legacy: Worksheet > Worksheet Registration (frmNewWorksheet2010, "Register New Worksheet"). The invoices waiting for the next version, added up per benefit
 * row, with the plan's limits, the approved amounts and the payable split; Close WS saves the version.
 */
export function WorksheetRegistrationPage() {
  const [caseNo, setCaseNo] = useState('')
  const [data, setData] = useState<WorksheetPreview | null>(null)
  const [typed, setTyped] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<WorksheetSaveResult | null>(null)
  const load = useMutation({ mutationFn: (no: string) => worksheetApi.preview(no), onSuccess: (d) => { setData(d); setTyped({}) }, onError: () => setData(null) })
  const recalc = useMutation({ mutationFn: (t: Record<number, string>) => worksheetApi.calculate(data!.case.caseNumber, filled(t)), onSuccess: setData })
  const go = (no?: string) => { setSaved(null); load.mutate((no ?? caseNo).trim()) }
  // After Close WS the saved version stays on screen (its documents can be printed) until the next case is shown.
  const shown = saved && data ? { ...previewModel(data), version: saved.version } : data ? previewModel(data) : null
  return (
    <WorksheetForm key={`${data?.case.caseNumber}-${data?.version}`} screen="worksheet-registration" title="Register New Worksheet"
      caseNo={caseNo} setCaseNo={setCaseNo} onGo={go} loading={load.isPending} error={load.error ?? recalc.error} model={shown}
      canSave={!saved} typed={typed} setTyped={setTyped} onRecalc={(t) => data && recalc.mutate(t ?? typed)}
      submit={(r) => worksheetApi.save(data!.case.caseNumber, r)} onSaved={setSaved} savedVersion={saved?.version ?? null}
      notice={<>
        {saved && <Alert severity="success">Worksheet {saved.worksheetNumber} saved: approved {formatMoney(saved.finalApproved)}, hospital {formatMoney(saved.payableToHospital)}, member {formatMoney(saved.payableToMember)}{saved.debitCreditNote ? `, note ${saved.debitCreditNote}` : ''}{saved.balanceAfter != null ? `; annual balance now ${formatMoney(saved.balanceAfter)}` : ''}{saved.excessNumber ? `; excess ${saved.excessNumber}` : ''}.</Alert>}
        {data && !saved && data.invoices.length === 0 && <Alert severity="warning">There are no open invoices for version {data.version}; a worksheet cannot be saved without any invoice.</Alert>}
        {data?.sameLimit && <Alert severity="info" sx={{ py: 0 }}>Days left on the linked case limit this worksheet.</Alert>}
      </>} />
  )
}
