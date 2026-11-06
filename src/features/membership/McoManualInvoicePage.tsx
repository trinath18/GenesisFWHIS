import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { mcoApi, mcoManualApi, type McoManualFilter, type McoManualListing } from '../../api/mco'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'
import { formatMoney } from '../../lib/format'
import { LegacyEm } from '../../components/LegacyForm'

const empty = { payor: '', memberFrom: '', memberTo: '', bordxFrom: '', bordxTo: '', batchFrom: '', batchTo: '', invoiceNo: '', invoiceDate: '' }
const num = (s: string) => (s.trim() === '' ? null : Number(s))

/** Legacy: MCOFees > Invoice Manual Upd. Find principals and covered persons that have no MCO invoice number and stamp one invoice number and date on all of them. */
export function McoManualInvoicePage() {
  const payors = useQuery({ queryKey: ['mco-payors'], queryFn: mcoApi.payors })
  const [f, setF] = useState(empty)
  const [listing, setListing] = useState<McoManualListing | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const filter = (): McoManualFilter => ({ payor: f.payor, memberFrom: f.memberFrom.trim() || null, memberTo: f.memberTo.trim() || null, bordxFrom: f.bordxFrom || null, bordxTo: f.bordxTo || null, batchFrom: num(f.batchFrom), batchTo: num(f.batchTo) })
  const search = useMutation({
    mutationFn: () => mcoManualApi.search(filter()),
    onSuccess: (l) => { setListing(l); setMessage(l.rows.length === 0 ? { severity: 'warning', text: 'No record found !' } : l.hasZeroMco ? { severity: 'warning', text: 'Zero MCO Fees Found !' } : null) },
    onError: (e) => { setListing(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const update = useMutation({
    mutationFn: () => mcoManualApi.update(filter(), f.invoiceNo, f.invoiceDate),
    onSuccess: (r) => { setConfirming(false); setListing(null); setMessage({ severity: 'success', text: `Records Updated: ${r.updated} row(s) now carry invoice ${r.invoiceNo}.` }) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((x) => ({ ...x, [k]: e.target.value })); setListing(null) }
  const date = (k: 'bordxFrom' | 'bordxTo' | 'invoiceDate') => (iso: string) => { setF((x) => ({ ...x, [k]: iso })); if (k !== 'invoiceDate') setListing(null) }
  const canUpdate = !!listing && listing.rows.length > 0 && !listing.hasZeroMco && !listing.truncated && f.invoiceNo.trim() !== '' && !!f.invoiceDate

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">MCO Invoice Update</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField select size="small" label="Payor" required value={f.payor} onChange={set('payor')} sx={{ width: 260 }}>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}</TextField>
        <TextField size="small" label="Member No. from" value={f.memberFrom} onChange={set('memberFrom')} /><TextField size="small" label="To" value={f.memberTo} onChange={set('memberTo')} />
        <DateField label="Bordx. Date from" value={f.bordxFrom} onChange={date('bordxFrom')} /><DateField label="Bordx. Date to" value={f.bordxTo} onChange={date('bordxTo')} />
        <TextField size="small" type="number" label="Batch No. from" value={f.batchFrom} onChange={set('batchFrom')} sx={{ width: 130 }} /><TextField size="small" type="number" label="Batch to" value={f.batchTo} onChange={set('batchTo')} sx={{ width: 110 }} />
        <Button variant="contained" disabled={!f.payor || search.isPending} onClick={() => { setMessage(null); search.mutate() }}>Search</Button>
        <Button variant="outlined" onClick={() => { setF(empty); setListing(null); setMessage(null) }}>Clear</Button>
      </Paper>
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField size="small" label="Invoice No." value={f.invoiceNo} onChange={(e) => setF((x) => ({ ...x, invoiceNo: e.target.value }))} slotProps={{ htmlInput: { maxLength: 40 } }} />
        <DateField label="Invoice Date" value={f.invoiceDate} onChange={date('invoiceDate')} />
        <Button variant="contained" color="secondary" disabled={!canUpdate || update.isPending} onClick={() => setConfirming(true)}>Update</Button>
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 120 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell>Member No.</TableCell><TableCell>Cover</TableCell><TableCell>Bordx. Date</TableCell><TableCell>Batch No.</TableCell><TableCell align="right">MCO Amt</TableCell></TableRow></TableHead>
          <TableBody>
            {(listing?.rows ?? []).map((r) => <TableRow key={`${r.memberNumber}-${r.coverId}`} hover><TableCell>{r.memberNumber}</TableCell><TableCell>{r.coverId}</TableCell><TableCell>{toDmy(r.bordxDate ?? '')}</TableCell><TableCell>{r.batchNo}</TableCell><TableCell align="right" sx={r.mco === 0 ? { color: 'error.main', fontWeight: 700 } : undefined}>{formatMoney(r.mco)}</TableCell></TableRow>)}
            {!listing && <TableRow><TableCell colSpan={5}>Select the payor and at least one more criterion, then Search.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2"><LegacyEm>Total MCO Amt</LegacyEm> {formatMoney(listing?.totalMco ?? 0)} &nbsp; <LegacyEm>Records</LegacyEm> {listing?.rows.length ?? 0}{listing?.truncated ? ' (more than 5,000 match; narrow the search)' : ''}</Typography>
      <ConfirmDialog open={confirming} busy={update.isPending} title="Update invoice" message={`Do you want to stamp invoice ${f.invoiceNo} (${toDmy(f.invoiceDate)}) on ${listing?.rows.length ?? 0} record(s)?`} onConfirm={() => update.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
