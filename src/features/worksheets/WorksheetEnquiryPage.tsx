import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { worksheetApi, type WorksheetEnquiry } from '../../api/worksheets'
import { Field, FieldGrid } from '../../components/DataTables'
import { formatDate, formatMoney } from '../../lib/format'
import { WorksheetCaseHeader, WorksheetGrid, WorksheetInvoices } from './WorksheetGrid'

/** Legacy: Worksheet > Worksheet Enquiry (frmWorksheetEnq). Every saved worksheet version of a case, read-only. */
export function WorksheetEnquiryPage() {
  const [caseNo, setCaseNo] = useState('')
  const [data, setData] = useState<WorksheetEnquiry | null>(null)
  const [version, setVersion] = useState<number | null>(null)
  const load = useMutation({
    mutationFn: () => worksheetApi.enquiry(caseNo),
    onSuccess: (d) => { setData(d); setVersion(d.versions.at(-1)?.version ?? null) },
    onError: () => setData(null),
  })
  const v = data?.versions.find((x) => x.version === version)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Worksheet Enquiry</Typography>
      {load.isError && <Alert severity="error">{(load.error as Error).message}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" label="Case Num" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) load.mutate() }} slotProps={{ htmlInput: { maxLength: 20 } }} />
        <Button variant="contained" disabled={!caseNo.trim() || load.isPending} onClick={() => load.mutate()}>Show</Button>
        {data && data.versions.length > 0 && (
          <TextField select size="small" label="Version" value={version ?? ''} onChange={(e) => setVersion(Number(e.target.value))} sx={{ width: 120 }}>
            {data.versions.map((x) => <MenuItem key={x.version} value={x.version}>{x.version}</MenuItem>)}
          </TextField>
        )}
      </Paper>
      {data && <WorksheetCaseHeader c={data.case} />}
      {data && data.versions.length === 0 && <Alert severity="info">This case has no worksheet yet.</Alert>}
      {data && v && (
        <>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <FieldGrid>
              <Field label="WS Num" value={`${data.case.caseNumber}-${v.version}`} /><Field label="Status" value={v.worksheetStatusName ? `${v.worksheetStatus} - ${v.worksheetStatusName}` : v.worksheetStatus} />
              <Field label="Opened" value={`${formatDate(v.opened)} ${v.openedBy ?? ''}`} /><Field label="Closed" value={formatDate(v.closed)} />
              <Field label="Total Actual" value={formatMoney(v.totalActual)} /><Field label="Total Approved" value={formatMoney(v.totalApproved)} />
              <Field label="Payable to Hospital" value={formatMoney(v.payableToHospital)} /><Field label="Payable to Member" value={formatMoney(v.payableToMember)} />
              <Field label="Excess" value={formatMoney(v.excess)} /><Field label="Balance Limit" value={formatMoney(v.balanceLimit)} />
              <Field label="Bordx Ref" value={v.bordxRefNo} /><Field label="Credit/Debit Note" value={v.debitCreditRefNo ? `${v.debitCreditRefNo} ${formatDate(v.debitCreditDate)}` : null} />
            </FieldGrid>
          </Paper>
          <WorksheetGrid lines={v.lines} show={['limit', 'actual', 'approved', 'hospital', 'member']} />
          <WorksheetInvoices rows={v.invoices} empty="No invoices recorded for this version." />
        </>
      )}
    </Box>
  )
}
