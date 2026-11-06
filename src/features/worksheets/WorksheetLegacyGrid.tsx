import { InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type { WorksheetLine } from '../../api/worksheets'
import { benefitGroup, legacyMoney, type WorksheetTotals } from './worksheetModel'

const cell = { border: '1px solid', borderColor: 'divider', py: 0.25, px: 0.75, fontSize: 13, whiteSpace: 'nowrap' } as const
const head = { ...cell, bgcolor: 'action.selected', fontWeight: 600 } as const
const blank = (v: string | null | undefined) => (v == null || v.trim() === '' ? '' : v)

/**
 * The legacy FGridMain: benefit group (merged), benefit, Days/Mths@Limit(MAX), Limit, Actual, Approved, Payable to Hosp, Due to/(frm) Mem, then the
 * totals rows (Total ... Bordereaux Amount). With `onType` the Limit column takes a typed limit (amount, negative deduction or FULL), as the legacy
 * FGrid_Click allowed; the worksheet is recalculated when the cell is left.
 */
export function WorksheetLegacyGrid({ lines, daysAtLimit, totals, typed, onType, onCommit, maxHeight = 520 }: {
  lines: WorksheetLine[]; daysAtLimit?: Record<number, string> | null; totals: WorksheetTotals
  typed?: Record<number, string>; onType?: (row: number, value: string) => void; onCommit?: () => void; maxHeight?: number
}) {
  const span = (i: number) => {
    const g = benefitGroup(lines[i].benefitCode)
    if (i > 0 && benefitGroup(lines[i - 1].benefitCode) === g) return 0
    let n = 1
    while (i + n < lines.length && benefitGroup(lines[i + n].benefitCode) === g) n++
    return n
  }
  const memberTotal = (totals.totalApproved ?? 0) - (totals.totalHospital ?? 0)
  const summary: [string, string, string, string, string][] = [
    ['Total', legacyMoney(totals.totalActual), legacyMoney(totals.totalApproved), legacyMoney(totals.totalHospital), legacyMoney(memberTotal)],
    ['Co-Payment R&B', '', '-', '', '-'],
    ['Underwriting Excess', '', '-', '', '-'],
    ['Total Excess', '', '', '', legacyMoney(totals.excess != null && totals.excess < 0 ? totals.excess : 0)],
    ['Excess Collected By Hospital', '', '', legacyMoney(totals.excess != null && totals.excess < 0 ? totals.excess : 0), ''],
    ['Limit Exceeded', '', legacyMoney(totals.limitExceeded ? -totals.limitExceeded : 0), '', ''],
    ['Main/Topup Policy', '', '-', '', ''],
    ['Hospital / Payor To Collect', '', '-', '', ''],
    ['Ex-Gratia(Not Payable)', '', '-', '', ''],
    ['BTBG', '', '-', '', '-'],
    ['Processing Fee', '', '-', '', ''],
    ['Major Medical Fee', '', '-', '', ''],
    ['Final Total', '', legacyMoney(totals.finalApproved), legacyMoney(totals.payableToHospital), legacyMoney(totals.payableToMember)],
    ['Bordereaux Amount', '', legacyMoney(totals.finalApproved), '', ''],
  ]
  return (
    <TableContainer sx={{ maxHeight, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small" stickyHeader sx={{ borderCollapse: 'collapse' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...head, width: 150 }} /><TableCell sx={head}>Benefits</TableCell><TableCell sx={head}>Days/Mths@Limit(MAX)</TableCell>
            {['Limit', 'Actual', 'Approved', 'Payable to Hosp', 'Due to/(frm)Mem'].map((h) => <TableCell key={h} sx={head} align="right">{h}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((l, i) => {
            const rows = span(i)
            return (
              <TableRow key={l.row} hover>
                {rows > 0 && <TableCell rowSpan={rows} sx={{ ...cell, bgcolor: 'action.hover', whiteSpace: 'normal', verticalAlign: 'middle' }}>{benefitGroup(l.benefitCode)}</TableCell>}
                <TableCell sx={{ ...cell, bgcolor: 'action.hover' }}>{l.label}</TableCell>
                <TableCell sx={{ ...cell, bgcolor: 'action.hover' }}>{daysAtLimit?.[l.row] ?? ''}</TableCell>
                <TableCell sx={{ ...cell, width: 120, p: onType ? 0 : cell.px }} align="right">
                  {onType ? (
                    <InputBase value={typed?.[l.row] ?? ''} placeholder={blank(l.limit)} onChange={(e) => onType(l.row, e.target.value)}
                      onBlur={() => onCommit?.()} onKeyDown={(e) => { if (e.key === 'Enter') onCommit?.() }}
                      inputProps={{ maxLength: 15, style: { textAlign: 'right', fontSize: 13, padding: '2px 6px' }, 'aria-label': `Limit ${l.label}` }}
                      sx={{ width: '100%', bgcolor: typed?.[l.row] ? 'legacy.highlight' : undefined, '& input::placeholder': { opacity: 1, color: 'text.primary' } }} />
                  ) : blank(l.limit)}
                </TableCell>
                <TableCell sx={cell} align="right">{blank(l.actual)}</TableCell>
                <TableCell sx={cell} align="right">{blank(l.approved)}</TableCell>
                <TableCell sx={cell} align="right">{blank(l.hospital)}</TableCell>
                <TableCell sx={cell} align="right">{blank(l.member)}</TableCell>
              </TableRow>
            )
          })}
          <TableRow><TableCell colSpan={8} sx={{ ...cell, py: 0.5 }} /></TableRow>
          {summary.map(([label, actual, approved, hosp, mem]) => (
            <TableRow key={label} sx={label === 'Final Total' ? { '& td': { fontWeight: 700, color: 'primary.main' } } : undefined}>
              <TableCell sx={{ ...cell, bgcolor: 'action.hover' }} /><TableCell colSpan={2} sx={{ ...cell, bgcolor: 'action.hover' }}>{label}</TableCell>
              <TableCell sx={cell} /><TableCell sx={cell} align="right">{actual}</TableCell><TableCell sx={cell} align="right">{approved}</TableCell>
              <TableCell sx={cell} align="right">{hosp}</TableCell><TableCell sx={cell} align="right">{mem}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
