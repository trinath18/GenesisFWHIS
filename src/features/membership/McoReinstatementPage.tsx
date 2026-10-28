import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { mcoReinstatementApi, type McoReinstatementListing, type McoReinstatementQuery } from '../../api/mco'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'
import { formatMoney } from '../../lib/format'

const empty: McoReinstatementQuery = { mode: 'batch', payor: '', bordxDate: '', batchNo: '', invoiceNo: '' }

/** Legacy: MCOFees > MCO Reinstatement. List the reinstated members of a bordx batch (or of an invoice) and Print to give the batch its MCO invoice number. */
export function McoReinstatementPage() {
  const payors = useQuery({ queryKey: ['mco-reinstatement-payors'], queryFn: mcoReinstatementApi.payors })
  const [q, setQ] = useState(empty)
  const [listing, setListing] = useState<McoReinstatementListing | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const search = useMutation({
    mutationFn: () => mcoReinstatementApi.list(q),
    onSuccess: (l) => { setListing(l); if (l.rows.length === 0) setMessage({ severity: 'warning', text: 'Record not found !' }) },
    onError: (e) => { setListing(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const print = useMutation({
    mutationFn: () => mcoReinstatementApi.invoice(q),
    onSuccess: (r) => { setConfirming(false); setListing(r.listing); setMessage({ severity: 'success', text: `Invoice ${r.invoiceNo} created for ${r.rowsInvoiced} reinstated row(s).` }) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const set = (k: keyof McoReinstatementQuery) => (e: { target: { value: string } }) => { setQ((x) => ({ ...x, [k]: e.target.value })); setListing(null) }
  const ready = q.mode === 'batch' ? q.payor && q.bordxDate && q.batchNo : q.invoiceNo.trim()
  const canPrint = q.mode === 'batch' && !!listing && listing.rows.length > 0 && !listing.invoiced

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">MCO Reinstatement Invoice</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField select size="small" label="Report Type" value={q.mode} onChange={(e) => { setQ({ ...empty, mode: e.target.value as 'batch' | 'invoice' }); setListing(null); setMessage(null) }} sx={{ width: 200 }}><MenuItem value="batch">Single/Batch</MenuItem><MenuItem value="invoice">Invoice No</MenuItem></TextField>
        {q.mode === 'batch' ? (<>
          <TextField select size="small" label="Payor" value={q.payor} onChange={set('payor')} sx={{ width: 260 }}>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}</TextField>
          <DateField label="Bordx Date" required value={q.bordxDate} onChange={(iso) => { setQ((x) => ({ ...x, bordxDate: iso })); setListing(null) }} />
          <TextField size="small" type="number" label="Batch No" required value={q.batchNo} onChange={set('batchNo')} sx={{ width: 120 }} />
        </>) : <TextField size="small" label="Invoice No" value={q.invoiceNo} onChange={set('invoiceNo')} slotProps={{ htmlInput: { maxLength: 40 } }} />}
        <Button variant="contained" disabled={!ready || search.isPending} onClick={() => { setMessage(null); search.mutate() }}>Search</Button>
        <Button variant="contained" color="secondary" disabled={!canPrint || print.isPending} onClick={() => setConfirming(true)}>Print</Button>
        <Button variant="outlined" onClick={() => { setQ(empty); setListing(null); setMessage(null) }}>Clear</Button>
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 120 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>{['Member No.', 'Cover', 'Name', 'Rel', 'Bordx', 'Batch', 'Policy No', 'Payor eff', 'Payor exp', 'Type', 'Lapsed', 'Reinstated'].map((h) => <TableCell key={h}>{h}</TableCell>)}<TableCell align="right">MCO fee</TableCell><TableCell>Invoice No</TableCell><TableCell>Invoice date</TableCell></TableRow></TableHead>
          <TableBody>
            {(listing?.rows ?? []).map((r) => <TableRow key={`${r.memberNumber}-${r.coverId}-${r.batch}`} hover><TableCell>{r.memberNumber}</TableCell><TableCell>{r.coverId}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.relation}</TableCell><TableCell>{toDmy(r.bordxDate ?? '')}</TableCell><TableCell>{r.batch}</TableCell><TableCell>{r.policyNo}</TableCell><TableCell>{toDmy(r.payorEffective ?? '')}</TableCell><TableCell>{toDmy(r.payorExpiry ?? '')}</TableCell><TableCell>{r.type}</TableCell><TableCell>{toDmy(r.lapsedDate ?? '')}</TableCell><TableCell>{toDmy(r.reinstateDate ?? '')}</TableCell><TableCell align="right">{formatMoney(r.mcoFee)}</TableCell><TableCell>{r.invoiceNo}</TableCell><TableCell>{toDmy(r.invoiceDate ?? '')}</TableCell></TableRow>)}
            {!listing && <TableRow><TableCell colSpan={15}>Choose the report type and criteria, then Search.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2"><strong style={{ color: '#c62828' }}>Total Principal</strong> {listing?.totalPrincipal ?? 0} &nbsp; <strong style={{ color: '#c62828' }}>Total Supp</strong> {listing?.totalSupplementary ?? 0} &nbsp; <strong style={{ color: '#c62828' }}>Reinstatement MCO Fees</strong> {formatMoney(listing?.totalFee ?? 0)}{listing?.invoiced ? ' - already invoiced; reprint it by invoice number' : ''}</Typography>
      <ConfirmDialog open={confirming} busy={print.isPending} title="Print invoice" message={`Do you want to create the MCO reinstatement invoice for ${listing?.rows.length ?? 0} row(s)? The next invoice number is stamped on all of them.`} onConfirm={() => print.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
