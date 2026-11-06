import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fwhsInvoiceApi, mcoApi, type FwhsInvoiceListing } from '../../api/mco'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'
import { formatMoney } from '../../lib/format'
import { LegacyEm } from '../../components/LegacyForm'

const titles: Record<string, string> = { none: 'FWHS MCO Fee', gst: 'FWHS MCO Fee (GST 6%)', sst: 'FWHS MCO Fee (SST)' }

function download(l: FwhsInvoiceListing, name: string) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [['Kind', 'Policy no', 'Date', 'Batch', 'Workers', 'MCO fee', 'Tax', 'Total', 'Invoice no'].join(','), ...l.rows.map((r) => [r.kind, r.policyNo, toDmy(r.date ?? ''), r.batchNo, r.workers, r.fee.toFixed(2), r.tax.toFixed(2), r.total.toFixed(2), r.invoiceNo].map(esc).join(','))]
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url)
}

/** Legacy: MCOFees > MCO Inv/Listing (plain, GST and SST variants). Print New lists a payor's uninvoiced fees for a date range and Print stamps the next FWMA invoice number on them; Re-Print lists an existing invoice. */
export function FwhsInvoicePage({ tax }: { tax: 'none' | 'gst' | 'sst' }) {
  const payors = useQuery({ queryKey: ['mco-payors'], queryFn: mcoApi.payors })
  const [q, setQ] = useState({ payor: '', mode: 'new' as 'new' | 'reprint', from: '', to: '', invoiceNo: '', tax })
  const [listing, setListing] = useState<FwhsInvoiceListing | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const query = { ...q, tax }
  const search = useMutation({ mutationFn: () => fwhsInvoiceApi.list(query), onSuccess: setListing, onError: (e) => { setListing(null); setMessage({ severity: 'error', text: (e as Error).message }) } })
  const print = useMutation({
    mutationFn: () => fwhsInvoiceApi.invoice(query),
    onSuccess: (r) => { setConfirming(false); setListing(r.listing); setMessage({ severity: 'success', text: `Invoice ${r.invoiceNo} created for ${r.rowsInvoiced} fee row(s).` }) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const set = (k: keyof typeof q) => (e: { target: { value: string } }) => { setQ((x) => ({ ...x, [k]: e.target.value })); setListing(null) }
  const ready = q.payor && (q.mode === 'new' ? q.from && q.to : q.invoiceNo.trim())

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">{titles[tax]}</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField select size="small" label="Print Status" value={q.mode} onChange={set('mode')} sx={{ width: 150 }}><MenuItem value="new">Print New</MenuItem><MenuItem value="reprint">Re-Print</MenuItem></TextField>
        <TextField select size="small" label="Payor" value={q.payor} onChange={set('payor')} sx={{ width: 280 }}>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}</TextField>
        {q.mode === 'new' ? (<>
          <DateField label="Bordereaux Date From" value={q.from} onChange={(iso) => { setQ((x) => ({ ...x, from: iso })); setListing(null) }} />
          <DateField label="To" value={q.to} onChange={(iso) => { setQ((x) => ({ ...x, to: iso })); setListing(null) }} />
        </>) : <TextField size="small" label="Invoice No." value={q.invoiceNo} onChange={set('invoiceNo')} slotProps={{ htmlInput: { maxLength: 15 } }} />}
        <Button variant="contained" disabled={!ready || search.isPending} onClick={() => { setMessage(null); search.mutate() }}>Search</Button>
        <Button variant="contained" color="secondary" disabled={!ready || q.mode !== 'new' || !listing || listing.rows.length === 0 || print.isPending} onClick={() => setConfirming(true)}>Print</Button>
        <Button variant="outlined" disabled={!listing || listing.rows.length === 0} onClick={() => download(listing!, `fwhs-mco-${q.payor}`)}>Download CSV</Button>
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 120 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell>Type</TableCell><TableCell>Policy no</TableCell><TableCell>Date</TableCell><TableCell>Batch</TableCell><TableCell align="right">Workers</TableCell><TableCell align="right">MCO fee</TableCell><TableCell align="right">{tax === 'none' ? 'Tax' : tax.toUpperCase()}</TableCell><TableCell align="right">Total</TableCell><TableCell>Invoice no</TableCell></TableRow></TableHead>
          <TableBody>
            {(listing?.rows ?? []).map((r, i) => <TableRow key={i} hover><TableCell>{r.kind}</TableCell><TableCell>{r.policyNo}</TableCell><TableCell>{toDmy(r.date ?? '')}</TableCell><TableCell>{r.batchNo}</TableCell><TableCell align="right">{r.workers}</TableCell><TableCell align="right">{formatMoney(r.fee)}</TableCell><TableCell align="right">{formatMoney(r.tax)}</TableCell><TableCell align="right">{formatMoney(r.total)}</TableCell><TableCell>{r.invoiceNo}</TableCell></TableRow>)}
            {!listing && <TableRow><TableCell colSpan={9}>Choose the print status and payor, enter the dates (or invoice number), then Search.</TableCell></TableRow>}
            {listing && listing.rows.length === 0 && <TableRow><TableCell colSpan={9}>No records found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2">{listing ? `${listing.payorName} - billing by ${listing.billingMode === 'I' ? 'policy / endorsement date' : 'submission date'}. ` : ''}<LegacyEm>TOTAL</LegacyEm> workers {listing?.totalWorkers ?? 0}, fee {formatMoney(listing?.totalFee ?? 0)}, tax {formatMoney(listing?.totalTax ?? 0)}, total {formatMoney(listing?.total ?? 0)} &nbsp; <LegacyEm>RECORDS</LegacyEm> {listing?.rows.length ?? 0}{listing?.truncated ? ' (first 2,000 shown)' : ''}</Typography>
      <ConfirmDialog open={confirming} busy={print.isPending} title="Print new invoice" message={`Do you want to create a new invoice for ${q.payor} from ${toDmy(q.from)} to ${toDmy(q.to)}? The next invoice number is stamped on the ${listing?.rows.length ?? 0} listed fee row(s).`} onConfirm={() => print.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
