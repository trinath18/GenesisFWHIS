import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { InvoiceCase } from '../../api/invoices'
import type { WorksheetInvoiceRef, WorksheetLine } from '../../api/worksheets'
import { Field, FieldGrid, RowsTable } from '../../components/DataTables'
import { formatDate, formatMoney } from '../../lib/format'

type Part = 'limit' | 'actual' | 'approved' | 'hospital' | 'member'
const heads: Record<Part, string> = { limit: 'Limit', actual: 'Actual', approved: 'Approved', hospital: 'Hospital', member: 'Member' }
const blank = (v: string | null) => (v == null || v.trim() === '' ? '-' : v)

/** The legacy worksheet grid: one row per benefit with its limit, actual, approved, hospital and member amounts (as stored). */
export function WorksheetGrid({ lines, show }: { lines: WorksheetLine[]; show: Part[] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead><TableRow><TableCell>Code</TableCell><TableCell>Benefit</TableCell>{show.map((s) => <TableCell key={s} align="right">{heads[s]}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {lines.map((l) => (
            <TableRow key={l.row} hover>
              <TableCell>{l.benefitCode}</TableCell><TableCell>{l.label}</TableCell>
              {show.map((s) => <TableCell key={s} align="right">{blank(l[s])}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export function WorksheetCaseHeader({ c }: { c: InvoiceCase }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <FieldGrid>
        <Field label="Case Num" value={c.caseNumber} /><Field label="Mem Num" value={c.memberNumber} /><Field label="Mem Name" value={c.memberName} />
        <Field label="Policy Num" value={c.policyNo} /><Field label="Plan" value={c.planCode} /><Field label="Hospital" value={c.hospitalName ?? c.hospitalCode} />
        <Field label="DOA" value={formatDate(c.admitted)} /><Field label="DOD" value={formatDate(c.discharged)} />
      </FieldGrid>
    </Paper>
  )
}

export function WorksheetInvoices({ rows, empty }: { rows: WorksheetInvoiceRef[]; empty: string }) {
  return (
    <>
      <Typography variant="subtitle2">Invoices</Typography>
      <RowsTable rows={rows} empty={empty} columns={[
        { header: 'Inv Num', cell: (r) => r.invoiceNo }, { header: 'Inv Date', cell: (r) => formatDate(r.invoiceDate) }, { header: 'Pay To', cell: (r) => (r.payTo === 'M' ? 'Member' : 'Hospital') },
        { header: 'Amount', align: 'right', cell: (r) => formatMoney(r.amount) }, { header: 'Payable', align: 'right', cell: (r) => formatMoney(r.payAmount) },
      ]} />
    </>
  )
}
