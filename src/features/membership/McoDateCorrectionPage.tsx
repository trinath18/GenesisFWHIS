import { Alert, Box, Button, Checkbox, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { mcoApi, mcoDateCorrectionApi, type McoCorrectionListing, type McoDateFilter } from '../../api/mco'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'
import { formatMoney } from '../../lib/format'

const empty = { payor: '', memberFrom: '', memberTo: '', bordxFrom: '', bordxTo: '', batchFrom: '', batchTo: '', invoiceFrom: '', invoiceTo: '', invoiceDate: '', batchNo: '' }
const num = (s: string) => (s.trim() === '' ? null : Number(s))
const key = (r: { memberNumber: string; coverId: string }) => `${r.memberNumber}|${r.coverId}`

/** Legacy: MCOFees > Date Correction. Search members, tick rows that already have an invoice and change their invoice date (and, optionally, batch number). */
export function McoDateCorrectionPage() {
  const payors = useQuery({ queryKey: ['mco-payors'], queryFn: mcoApi.payors })
  const [f, setF] = useState(empty)
  const [listing, setListing] = useState<McoCorrectionListing | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const filter = (): McoDateFilter => ({ payor: f.payor, memberFrom: f.memberFrom.trim() || null, memberTo: f.memberTo.trim() || null, bordxFrom: f.bordxFrom || null, bordxTo: f.bordxTo || null, batchFrom: num(f.batchFrom), batchTo: num(f.batchTo), invoiceFrom: f.invoiceFrom.trim() || null, invoiceTo: f.invoiceTo.trim() || null })
  const search = useMutation({
    mutationFn: () => mcoDateCorrectionApi.search(filter()),
    onSuccess: (l) => { setListing(l); setChecked(new Set()); if (l.rows.length === 0) setMessage({ severity: 'warning', text: 'Record Not Found!' }) },
    onError: (e) => { setListing(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const update = useMutation({
    mutationFn: () => mcoDateCorrectionApi.update((listing?.rows ?? []).filter((r) => checked.has(key(r))).map((r) => ({ memberNumber: r.memberNumber, coverId: r.coverId })), f.invoiceDate, num(f.batchNo)),
    onSuccess: (r) => { setConfirming(false); setMessage({ severity: 'success', text: `Record updated: ${r.updated} row(s) now have invoice date ${toDmy(r.invoiceDate)}.` }); search.mutate() },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((x) => ({ ...x, [k]: e.target.value })); if (k !== 'invoiceDate' && k !== 'batchNo') { setListing(null); setChecked(new Set()) } }
  const toggle = (k: string) => setChecked((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const canUpdate = checked.size > 0 && !!f.invoiceDate

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">MCO Invoice Correction</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField select size="small" label="Payor" required value={f.payor} onChange={set('payor')} sx={{ width: 260 }}>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}</TextField>
        <TextField size="small" label="Member No. from" value={f.memberFrom} onChange={set('memberFrom')} /><TextField size="small" label="To" value={f.memberTo} onChange={set('memberTo')} />
        <DateField label="Bordx. Date from" value={f.bordxFrom} onChange={(iso) => { setF((x) => ({ ...x, bordxFrom: iso })); setListing(null) }} /><DateField label="Bordx. Date to" value={f.bordxTo} onChange={(iso) => { setF((x) => ({ ...x, bordxTo: iso })); setListing(null) }} />
        <TextField size="small" type="number" label="Batch No. from" value={f.batchFrom} onChange={set('batchFrom')} sx={{ width: 130 }} /><TextField size="small" type="number" label="Batch to" value={f.batchTo} onChange={set('batchTo')} sx={{ width: 110 }} /><TextField size="small" label="Invoice No. from" value={f.invoiceFrom} onChange={set('invoiceFrom')} sx={{ width: 140 }} /><TextField size="small" label="To" value={f.invoiceTo} onChange={set('invoiceTo')} sx={{ width: 120 }} />
        <Button variant="contained" disabled={!f.payor || search.isPending} onClick={() => { setMessage(null); search.mutate() }}>Search</Button>
        <Button variant="outlined" onClick={() => { setF(empty); setListing(null); setChecked(new Set()); setMessage(null) }}>Clear</Button>
      </Paper>
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <DateField label="Invoice Date" required value={f.invoiceDate} onChange={(iso) => setF((x) => ({ ...x, invoiceDate: iso }))} /><TextField size="small" type="number" label="Batch No. (optional)" value={f.batchNo} onChange={set('batchNo')} sx={{ width: 170 }} />
        <Button variant="contained" color="secondary" disabled={!canUpdate || update.isPending} onClick={() => setConfirming(true)}>Update</Button>
        <Typography variant="body2" sx={{ alignSelf: 'center' }}>{checked.size} selected</Typography>
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 120 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell padding="checkbox" /><TableCell>Member No.</TableCell><TableCell>Cover</TableCell><TableCell>Name</TableCell><TableCell>Bordx. Date</TableCell><TableCell>Batch No.</TableCell><TableCell>Invoice No.</TableCell><TableCell>Invoice Date</TableCell><TableCell align="right">MCO Fee</TableCell><TableCell>Payor eff</TableCell><TableCell>Payor exp</TableCell></TableRow></TableHead>
          <TableBody>
            {(listing?.rows ?? []).map((r) => (
              <TableRow key={key(r)} hover>
                <TableCell padding="checkbox"><Checkbox size="small" checked={checked.has(key(r))} disabled={!r.invoiceNo} onChange={() => toggle(key(r))} title={r.invoiceNo ? '' : 'Please generate Invoice!'} /></TableCell>
                <TableCell>{r.memberNumber}</TableCell><TableCell>{r.coverId}</TableCell><TableCell>{r.name}</TableCell><TableCell>{toDmy(r.bordxDate ?? '')}</TableCell><TableCell>{r.batchNo}</TableCell>
                <TableCell>{r.invoiceNo}</TableCell><TableCell>{toDmy(r.invoiceDate ?? '')}</TableCell><TableCell align="right">{formatMoney(r.mco)}</TableCell><TableCell>{toDmy(r.payorEffective ?? '')}</TableCell><TableCell>{toDmy(r.payorExpiry ?? '')}</TableCell>
              </TableRow>
            ))}
            {!listing && <TableRow><TableCell colSpan={11}>Select the payor and at least one more criterion, then Search.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2"><strong style={{ color: '#c62828' }}>Records</strong> {listing?.rows.length ?? 0}{listing?.truncated ? ' (first 2,000 shown; narrow the search)' : ''}. Only rows that already have an invoice number can be selected.</Typography>
      <ConfirmDialog open={confirming} busy={update.isPending} title="Update invoice date" message={`Do you want to set the invoice date of ${checked.size} record(s) to ${toDmy(f.invoiceDate)}${f.batchNo.trim() ? ` and the batch number to ${f.batchNo}` : ''}?`} onConfirm={() => update.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}


