import { Alert, Box, Button, Chip, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { worksheetApi, type WorksheetAdjustmentView, type WorksheetSaveResult } from '../../api/worksheets'
import { Field, FieldGrid } from '../../components/DataTables'
import { formatMoney } from '../../lib/format'
import { WorksheetCaseHeader, WorksheetInvoices } from './WorksheetGrid'
import { WorksheetSavePanel } from './WorksheetSavePanel'

const blank = (v: string | null | undefined) => (v == null || v.trim() === '' ? '-' : v)

/**
 * Legacy: Worksheet > WorkSheet Adjustment (frmNewWSAdjust2010). Recalculates a saved worksheet version from its invoices (after an invoice was corrected, or with
 * limits typed by the claims officer) and rewrites it. Only the latest version can be amended, and only until it goes on a bordereau. A follow-up bill is a new
 * invoice and a new version through Worksheet Registration.
 */
export function WorksheetAdjustmentPage() {
  const [caseNo, setCaseNo] = useState('')
  const [data, setData] = useState<WorksheetAdjustmentView | null>(null)
  const [typed, setTyped] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<WorksheetSaveResult | null>(null)
  const load = useMutation({
    mutationFn: (version?: number) => worksheetApi.adjustment(caseNo, version),
    onSuccess: (d) => { setData(d); setTyped({}) }, onError: () => setData(null),
  })
  const recalc = useMutation({
    mutationFn: () => worksheetApi.adjustmentCalculate(data!.case.caseNumber, data!.version, Object.fromEntries(Object.entries(typed).filter(([, v]) => v.trim() !== ''))),
    onSuccess: setData,
  })
  const error = load.error ?? recalc.error
  const calc = data?.recalculated.calculation
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">Worksheet Adjustment</Typography>
      {saved && <Alert severity="success" onClose={() => setSaved(null)}>Worksheet {saved.worksheetNumber} amended: approved {formatMoney(saved.finalApproved)}, hospital {formatMoney(saved.payableToHospital)}, member {formatMoney(saved.payableToMember)}{saved.balanceAfter != null ? `; annual balance now ${formatMoney(saved.balanceAfter)}` : ''}.</Alert>}
      {error && <Alert severity="error">{(error as Error).message}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" label="Case Num" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && caseNo.trim()) load.mutate(undefined) }} slotProps={{ htmlInput: { maxLength: 20 } }} />
        <Button variant="contained" disabled={!caseNo.trim() || load.isPending} onClick={() => load.mutate(undefined)}>Show</Button>
        {data && (
          <TextField select size="small" label="Version" value={data.version} onChange={(e) => load.mutate(Number(e.target.value))} sx={{ width: 120 }}>
            {data.versions.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        )}
        {data && <Chip color={data.canAmend ? 'success' : 'default'} label={data.canAmend ? 'Can be amended' : 'Read only'} />}
      </Paper>
      {data && <WorksheetCaseHeader c={data.case} />}
      {data?.blockedReason && <Alert severity="info">{data.blockedReason}</Alert>}
      {data && calc && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell><TableCell>Benefit</TableCell><TableCell align="right">Saved Limit</TableCell><TableCell align="right">Saved Approved</TableCell>
                  <TableCell align="right">Limit</TableCell><TableCell sx={{ width: 140 }}>Typed limit</TableCell><TableCell align="right">Actual</TableCell>
                  <TableCell align="right">Approved</TableCell><TableCell align="right">Hospital</TableCell><TableCell align="right">Member</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.lines.map((l, i) => {
                  const old = data.saved.lines[i]
                  const changed = (old?.approved ?? '-') !== (l.approved ?? '-')
                  return (
                    <TableRow key={l.row} hover>
                      <TableCell>{l.benefitCode}</TableCell><TableCell>{l.label}</TableCell>
                      <TableCell align="right">{blank(old?.limit)}</TableCell><TableCell align="right">{blank(old?.approved)}</TableCell>
                      <TableCell align="right">{blank(l.limit)}</TableCell>
                      <TableCell>
                        <TextField size="small" variant="standard" placeholder="amount / FULL" disabled={!data.canAmend || !data.recalculated.claimable} value={typed[l.row] ?? ''}
                          onChange={(e) => setTyped((t) => ({ ...t, [l.row]: e.target.value }))} slotProps={{ htmlInput: { maxLength: 15 } }} />
                      </TableCell>
                      <TableCell align="right">{blank(l.actual)}</TableCell>
                      <TableCell align="right" sx={changed ? { fontWeight: 600, color: 'warning.main' } : undefined}>{blank(l.approved)}</TableCell>
                      <TableCell align="right">{blank(l.hospital)}</TableCell><TableCell align="right">{blank(l.member)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" disabled={!data.canAmend || recalc.isPending} onClick={() => recalc.mutate()}>Recalculate</Button>
            <Button disabled={Object.keys(typed).length === 0 || load.isPending} onClick={() => load.mutate(data.version)}>Reset limits</Button>
          </Box>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <FieldGrid>
              <Field label="Saved Approved" value={formatMoney(data.saved.totalApproved)} /><Field label="Recalculated Approved" value={formatMoney(calc.finalApproved)} />
              <Field label="Saved Payable to Hospital" value={formatMoney(data.saved.payableToHospital)} /><Field label="Payable to Hospital" value={formatMoney(calc.payableToHospital)} />
              <Field label="Saved Payable to Member" value={formatMoney(data.saved.payableToMember)} /><Field label="Payable to Member" value={formatMoney(calc.payableToMember)} />
              <Field label="Excess (member pays)" value={formatMoney(calc.excess)} /><Field label="Annual Balance" value={calc.annualBalance == null ? 'No annual limit' : formatMoney(calc.annualBalance)} />
            </FieldGrid>
          </Paper>
          {calc.limitExceeded && <Alert severity="warning">The approved amount exceeds the member's annual balance; the final approved amount is capped.</Alert>}
          <WorksheetInvoices rows={data.recalculated.invoices} empty="No invoices in this version." />
          {data.canAmend && (
            <WorksheetSavePanel key={`${data.case.caseNumber}-${data.version}`} data={data.recalculated} typed={typed} initial={data.details}
              title={`Amend worksheet ${data.case.caseNumber}-${data.version}`} action="Amend Worksheet"
              submit={(r) => worksheetApi.amend(data.case.caseNumber, data.version, r)} onSaved={(r) => { setSaved(r); load.mutate(data.version) }} />
          )}
        </>
      )}
    </Box>
  )
}
