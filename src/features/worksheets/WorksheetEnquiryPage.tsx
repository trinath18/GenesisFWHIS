import { Alert, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { worksheetApi, type WorksheetEnquiry, type WorksheetVersion } from '../../api/worksheets'
import { formatDate } from '../../lib/format'
import { WorksheetForm } from './WorksheetForm'
import { parseLegacyMoney, type WorksheetModel } from './worksheetModel'

function versionModel(e: WorksheetEnquiry, v: WorksheetVersion): WorksheetModel {
  const hospital = v.lines.reduce((sum, l) => sum + (parseLegacyMoney(l.hospital) ?? 0), 0)
  return {
    caseNumber: e.case.caseNumber, version: v.version, claimability: v.worksheetStatus, claimable: true, lines: v.lines, annualBalance: v.previousBalance,
    invoices: v.invoices,
    totals: {
      totalActual: v.totalActual, totalApproved: v.totalApproved, totalHospital: hospital, excess: v.excess, limitExceeded: v.limitExceeded,
      finalApproved: v.finalApproved ?? v.totalApproved, payableToHospital: v.payableToHospital, payableToMember: v.payableToMember,
    },
  }
}

/** Legacy: Worksheet > Worksheet Enquiry (frmWorksheetEnq). Every saved worksheet version of a case in the worksheet form, read-only, with its documents. */
export function WorksheetEnquiryPage() {
  const [caseNo, setCaseNo] = useState('')
  const [data, setData] = useState<WorksheetEnquiry | null>(null)
  const [version, setVersion] = useState<number | null>(null)
  const load = useMutation({
    mutationFn: (no: string) => worksheetApi.enquiry(no),
    onSuccess: (d) => { setData(d); setVersion(d.versions.at(-1)?.version ?? null) },
    onError: () => setData(null),
  })
  const v = data?.versions.find((x) => x.version === version)
  return (
    <WorksheetForm key={`${data?.case.caseNumber}-${version}`} screen="worksheet-enquiry" title="Worksheet Enquiry" caseNo={caseNo} setCaseNo={setCaseNo}
      onGo={(no) => load.mutate((no ?? caseNo).trim())} loading={load.isPending} error={load.error} model={data && v ? versionModel(data, v) : null}
      canSave={false} showSaved typed={{}} setTyped={() => {}} onRecalc={() => {}} savedVersion={v?.version ?? null}
      headerExtra={data && data.versions.length > 0 && (
        <>
          <Typography variant="body2" sx={{ ml: 1 }}>Version</Typography>
          <TextField select size="small" value={version ?? ''} onChange={(e) => setVersion(Number(e.target.value))} sx={{ width: 90 }}>
            {data.versions.map((x) => <MenuItem key={x.version} value={x.version}>{x.version}</MenuItem>)}
          </TextField>
        </>
      )}
      notice={<>
        {data && data.versions.length === 0 && <Alert severity="info">This case has no worksheet yet.</Alert>}
        {v && <Typography variant="body2" color="text.secondary">Opened {formatDate(v.opened)} by {v.openedBy ?? '-'}{v.bordxRefNo ? ` · Bordx ${v.bordxRefNo}` : ''}{v.debitCreditRefNo ? ` · Note ${v.debitCreditRefNo} ${formatDate(v.debitCreditDate)}` : ''}</Typography>}
      </>} />
  )
}
