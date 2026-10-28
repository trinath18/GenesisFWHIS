import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { mcoApi, type McoRefundRow } from '../../api/mco'
import { DateField } from '../../components/DateField'
import { formatDate, formatMoney } from '../../lib/format'

const empty = { payor: '', dateBy: 'effective', from: '', to: '', printStatus: 'N' }

/** Legacy: MCOFees > Refund Listing. Search the MCO refunds of one payor by endorsement effective date or endorsement bordx date; select a row to see its cancelled supplementary persons. */
export function McoRefundListingPage() {
  const payors = useQuery({ queryKey: ['mco-payors'], queryFn: mcoApi.payors })
  const [f, setF] = useState(empty)
  const [selected, setSelected] = useState<string | null>(null)
  const search = useMutation({ mutationFn: () => mcoApi.refundListing(f), onMutate: () => setSelected(null) })
  const supp = useQuery({ queryKey: ['mco-supp', selected], queryFn: () => mcoApi.refundSupplementary(selected!), enabled: !!selected })
  const l = search.data
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const dateLabel = f.dateBy === 'effective' ? 'Endt. Eff Date' : 'Endt. Bordx Date'
  const cell = (r: McoRefundRow) => [r.coverId, r.policyNo, r.name, r.icBcPp, formatDate(r.payorEffective), formatDate(r.payorExpiry), r.daysInsured, formatDate(r.endorsementEffective), formatDate(r.endorsementBordx), r.daysUtilised, r.monthsUtilised]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">MCO Refund Listing</Typography>
      {search.isError && <Alert severity="error">{(search.error as Error).message}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField select size="small" label="Payor" value={f.payor} onChange={set('payor')} sx={{ width: 280 }}>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Date Selection" value={f.dateBy} onChange={set('dateBy')} sx={{ width: 190 }}><MenuItem value="effective">Endt. Eff Date</MenuItem><MenuItem value="bordx">Endt. Bordx Date</MenuItem></TextField>
        <DateField label={`${dateLabel} from`} value={f.from} onChange={(iso) => setF((x) => ({ ...x, from: iso }))} />
        <DateField label="To" value={f.to} onChange={(iso) => setF((x) => ({ ...x, to: iso }))} />
        <TextField select size="small" label="Print Status" value={f.printStatus} onChange={set('printStatus')} sx={{ width: 130 }}><MenuItem value="N">N - No</MenuItem><MenuItem value="Y">Y - Yes</MenuItem></TextField>
        <Button variant="contained" disabled={!f.payor || search.isPending} onClick={() => search.mutate()}>Search</Button>
        <Button variant="outlined" onClick={() => { setF(empty); search.reset(); setSelected(null) }}>Clear</Button>
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 120 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>{['Member no', 'Cover', 'Policy no', 'Name', 'IC', 'Payor eff', 'Payor exp', 'Days insured', 'Endt. eff', 'Endt. bordx', 'Days used', 'Months used'].map((h) => <TableCell key={h}>{h}</TableCell>)}
            {['MCO fee', 'MCO utilised', 'MCO refund'].map((h) => <TableCell key={h} align="right">{h}</TableCell>)}{['Cases', 'CR note', 'Invoice no'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(l?.rows ?? []).map((r) => (
              <TableRow key={`${r.memberNumber}-${r.coverId}`} hover selected={selected === r.memberNumber} onClick={() => setSelected(r.memberNumber)} sx={{ cursor: 'pointer' }}>
                <TableCell>{r.memberNumber}</TableCell>{cell(r).map((c, i) => <TableCell key={i}>{c}</TableCell>)}
                <TableCell align="right">{formatMoney(r.mcoFee)}</TableCell><TableCell align="right">{formatMoney(r.mcoUtilised)}</TableCell><TableCell align="right">{formatMoney(r.mcoRefund)}</TableCell>
                <TableCell>{r.totalCases}</TableCell><TableCell>{r.creditNote}</TableCell><TableCell>{r.invoiceNo}</TableCell>
              </TableRow>
            ))}
            {!l && <TableRow><TableCell colSpan={18}>Select a payor, the date selection and dates, then Search.</TableCell></TableRow>}
            {l && l.rows.length === 0 && <TableRow><TableCell colSpan={18}>No records found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {selected && (
        <Paper variant="outlined" sx={{ p: 1, maxHeight: 150, overflow: 'auto' }}>
          <Typography variant="subtitle2">Cancelled supplementary persons of {selected}</Typography>
          {(supp.data ?? []).map((r) => <Box key={r.coverId} sx={{ fontSize: 13 }}>{r.coverId} &nbsp; {r.name} &nbsp; MCO {formatMoney(r.mcoFee)} &nbsp; refund {formatMoney(r.mcoRefund)} &nbsp; utilised {formatMoney(r.mcoUtilised)}</Box>)}
          {supp.isSuccess && supp.data.length === 0 && <Typography variant="body2" color="text.secondary">None.</Typography>}
        </Paper>
      )}
      <Typography variant="body2"><strong style={{ color: '#c62828' }}>Total MCO Refund</strong> {formatMoney(l?.totalRefund ?? 0)} &nbsp; <strong style={{ color: '#c62828' }}>TOTAL RECORDS</strong> {l?.rows.length ?? 0}
        {l?.truncated ? ' (first 2,000 shown; narrow the dates)' : ''}{l?.cancelledOnly ? ' - this payor lists cancelled members entered within 30 days only' : ''}</Typography>
    </Box>
  )
}
