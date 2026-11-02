import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { worksheetApi, type WorksheetPreview, type WorksheetSaveResult } from '../../api/worksheets'
import { Field, FieldGrid } from '../../components/DataTables'
import { formatMoney } from '../../lib/format'
import { WorksheetCaseHeader, WorksheetInvoices } from './WorksheetGrid'
import { WorksheetSavePanel } from './WorksheetSavePanel'

const blank = (v: string | null) => (v == null || v.trim() === '' ? '-' : v)

/**
 * Legacy: Worksheet > Worksheet Registration (frmNewWorksheet2010). The invoices waiting for the next version, added up per benefit row, with the plan's
 * limits, approved amounts and the payable split. A claims officer can type a limit on any row (an amount, a negative deduction or FULL), as in the legacy
 * grid, then save the worksheet.
 */
export function WorksheetRegistrationPage() {
  const [caseNo, setCaseNo] = useState('')
  const [data, setData] = useState<WorksheetPreview | null>(null)
  const [typed, setTyped] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<WorksheetSaveResult | null>(null)
  const load = useMutation({ mutationFn: () => worksheetApi.preview(caseNo), onSuccess: (d) => { setData(d); setTyped({}) }, onError: () => setData(null) })
  const onSaved = (r: WorksheetSaveResult) => { setSaved(r); load.mutate() }
  const recalc = useMutation({
    mutationFn: () => worksheetApi.calculate(data!.case.caseNumber, Object.fromEntries(Object.entries(typed).filter(([, v]) => v.trim() !== ''))),
    onSuccess: setData,
  })
  const calc = data?.calculation
  const error = load.error ?? recalc.error
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Worksheet Registration</Typography>
      {saved && <Alert severity="success" onClose={() => setSaved(null)}>Worksheet {saved.worksheetNumber} saved: approved {formatMoney(saved.finalApproved)}, hospital {formatMoney(saved.payableToHospital)}, member {formatMoney(saved.payableToMember)}{saved.debitCreditNote ? `, note ${saved.debitCreditNote}` : ''}{saved.balanceAfter != null ? `; annual balance now ${formatMoney(saved.balanceAfter)}` : ''}.</Alert>}
      {error && <Alert severity="error">{(error as Error).message}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" label="Case Num" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) load.mutate() }} slotProps={{ htmlInput: { maxLength: 20 } }} />
        <Button variant="contained" disabled={!caseNo.trim() || load.isPending} onClick={() => load.mutate()}>Show</Button>
        {data && <Chip label={`Worksheet ${data.case.caseNumber}-${data.version}`} />}
        {data && <Chip color={data.claimable ? 'success' : 'error'} label={`Claimability ${data.claimability ?? '-'}`} />}
        {data?.sameLimit && <Chip color="warning" label="Same-limit days from the linked case" />}
      </Paper>
      {data && <WorksheetCaseHeader c={data.case} />}
      {data && data.invoices.length === 0 && <Alert severity="warning">There are no open invoices for version {data.version}; a worksheet cannot be saved without any invoice.</Alert>}
      {data && !data.claimable && <Alert severity="warning">The case is not claimable, so no benefits are approved.</Alert>}
      {calc?.limitExceeded && <Alert severity="warning">The approved amount exceeds the member's annual balance of {formatMoney(calc.annualBalance)}; the final approved amount is capped.</Alert>}

      {data && calc && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell><TableCell>Benefit</TableCell><TableCell align="right">Limit</TableCell><TableCell sx={{ width: 140 }}>Typed limit</TableCell>
                  <TableCell align="right">Actual</TableCell><TableCell align="right">Approved</TableCell><TableCell align="right">Hospital</TableCell><TableCell align="right">Member</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.lines.map((l) => (
                  <TableRow key={l.row} hover>
                    <TableCell>{l.benefitCode}</TableCell><TableCell>{l.label}</TableCell><TableCell align="right">{blank(l.limit)}</TableCell>
                    <TableCell>
                      <TextField size="small" variant="standard" placeholder="amount / FULL" disabled={!data.claimable} value={typed[l.row] ?? ''}
                        onChange={(e) => setTyped((t) => ({ ...t, [l.row]: e.target.value }))} slotProps={{ htmlInput: { maxLength: 15 } }} />
                    </TableCell>
                    <TableCell align="right">{blank(l.actual)}</TableCell><TableCell align="right">{blank(l.approved)}</TableCell>
                    <TableCell align="right">{blank(l.hospital)}</TableCell><TableCell align="right">{blank(l.member)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" disabled={!data.claimable || recalc.isPending} onClick={() => recalc.mutate()}>Recalculate</Button>
            <Button disabled={Object.keys(typed).length === 0 || load.isPending} onClick={() => load.mutate()}>Reset limits</Button>
          </Box>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <FieldGrid>
              <Field label="Total Actual" value={formatMoney(calc.totalActual)} /><Field label="Total Approved" value={formatMoney(calc.totalApproved)} />
              <Field label="Final Approved" value={formatMoney(calc.finalApproved)} /><Field label="Annual Balance" value={calc.annualBalance == null ? 'No annual limit' : formatMoney(calc.annualBalance)} />
              <Field label="Hospital Bill" value={formatMoney(calc.totalHospital)} /><Field label="Payable to Hospital" value={formatMoney(calc.payableToHospital)} />
              <Field label="Payable to Member" value={formatMoney(calc.payableToMember)} /><Field label="Excess (member pays)" value={formatMoney(calc.excess)} />
              <Field label="R&B / ICU Days Allowed" value={`${calc.daysAllowed.board} / ${calc.daysAllowed.icu}`} />
            </FieldGrid>
          </Paper>
          <WorksheetInvoices rows={data.invoices} empty="No open invoices." />
          {data.invoices.length > 0 && <WorksheetSavePanel key={`${data.case.caseNumber}-${data.version}`} data={data} typed={typed} onSaved={onSaved} />}
        </>
      )}
    </Box>
  )
}
