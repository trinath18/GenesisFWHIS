import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { mcoReceiptApi, type McoReceiptRow } from '../../api/mco'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'
import { formatMoney } from '../../lib/format'

const types: [string, string][] = [['M', 'M - MCO FEES'], ['A', 'A - Others'], ['C', 'C - Client'], ['F', 'F - Fine'], ['O', 'O - Others']]
const defaultAccount: Record<string, string> = { F: '6720', C: '2040' }
const blank = { type: 'M', receiptNo: '', date: '', amount: '', chq: '', chqDate: '', remarks: '', account: '' }
const blankSearch = { payor: '', numberFrom: '', numberTo: '', dateFrom: '', dateTo: '', creditNotes: false, onlyOpen: true }

/** Legacy: MCOFees > Receipt MCO/Others (and the Manual variant where the receipt number is typed). Receipt MCO invoices (type M) or record other receipts (A, C, F, O). */
export function McoReceiptPage({ manual }: { manual: boolean }) {
  const payors = useQuery({ queryKey: ['mco-receipt-payors'], queryFn: mcoReceiptApi.payors })
  const [h, setH] = useState(blank)
  const [s, setS] = useState(blankSearch)
  const [found, setFound] = useState<Awaited<ReturnType<typeof mcoReceiptApi.invoices>> | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [existing, setExisting] = useState<Awaited<ReturnType<typeof mcoReceiptApi.list>> | null>(null)
  const [edit, setEdit] = useState<McoReceiptRow | null>(null)
  const [editValues, setEditValues] = useState({ date: '', amount: '', chq: '', chqDate: '', remarks: '', allocated: '' })
  const [confirm, setConfirm] = useState<'save' | { del: McoReceiptRow } | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const fail = (e: unknown) => { setConfirm(null); setMessage({ severity: 'error', text: (e as Error).message }) }
  const isM = h.type === 'M'
  const net = (found?.rows ?? []).filter((r) => checked.has(r.number)).reduce((a, r) => a + (r.kind === 'CreditNote' ? -r.total : r.total), 0)

  const searchInvoices = useMutation({
    mutationFn: () => mcoReceiptApi.invoices({ payor: s.payor, numberFrom: s.numberFrom, numberTo: s.numberTo, dateFrom: s.dateFrom, dateTo: s.dateTo, creditNotes: String(s.creditNotes), onlyOpen: String(s.onlyOpen) }),
    onSuccess: (r) => { setFound(r); setChecked(new Set()); if (r.rows.length === 0) setMessage({ severity: 'warning', text: 'No record found!' }) }, onError: fail,
  })
  const searchReceipts = useMutation({ mutationFn: () => mcoReceiptApi.list({ type: h.type, receiptFrom: h.receiptNo.trim(), receiptTo: h.receiptNo.trim(), dateFrom: h.date }), onSuccess: setExisting, onError: fail })
  const save = useMutation({
    mutationFn: () => mcoReceiptApi.create({ type: h.type, receiptNo: manual ? h.receiptNo : null, receiptDate: h.date || null, amount: h.amount ? Number(h.amount) : null, chequeNo: h.chq || null, chequeDate: h.chqDate || null, remarks: h.remarks || null,
      accountCode: h.account || null, invoices: isM ? [...checked] : null }, manual),
    onSuccess: (r) => {
      setConfirm(null); setChecked(new Set()); setMessage({ severity: r.difference !== 0 ? 'warning' : 'success', text: `Record Saved... Receipt No ${r.receiptNo}${isM ? ` (${r.lines} line(s), allocated ${formatMoney(r.allocated)}${r.difference !== 0 ? `, differs from the receipt amount by ${formatMoney(r.difference)}` : ''})` : ''}` })
      setH((x) => ({ ...x, receiptNo: manual ? x.receiptNo : r.receiptNo })); void mcoReceiptApi.list({ type: h.type, receiptFrom: r.receiptNo, receiptTo: r.receiptNo }).then(setExisting)
      if (isM) searchInvoices.mutate()
    }, onError: fail,
  })
  const update = useMutation({
    mutationFn: () => mcoReceiptApi.update(edit!.kind, edit!.index, { receiptDate: editValues.date || null, amount: editValues.amount ? Number(editValues.amount) : null, chequeNo: editValues.chq || null, chequeDate: editValues.chqDate || null, remarks: editValues.remarks || null, allocated: editValues.allocated ? Number(editValues.allocated) : null }),
    onSuccess: () => { setEdit(null); setMessage({ severity: 'success', text: 'Record Updated...' }); searchReceipts.mutate() }, onError: fail,
  })
  const remove = useMutation({ mutationFn: (r: McoReceiptRow) => mcoReceiptApi.remove(r.kind, r.index), onSuccess: () => { setConfirm(null); setMessage({ severity: 'success', text: 'Record Deleted...' }); searchReceipts.mutate() }, onError: fail })
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setH((x) => ({ ...x, [k]: e.target.value, ...(k === 'type' ? { account: defaultAccount[e.target.value] ?? '' } : {}) }))
  const canSave = !!h.date && !!h.amount && (!manual || !!h.receiptNo.trim()) && (isM ? checked.size > 0 : !!(h.account || defaultAccount[h.type]))
  const startEdit = (r: McoReceiptRow) => { setEdit(r); setEditValues({ date: r.receiptDate ?? '', amount: String(r.amount ?? ''), chq: r.chequeNo ?? '', chqDate: r.kind === 'M' ? (r.chequeDate ? r.chequeDate.split('/').reverse().join('-') : '') : (r.chequeDate ? r.chequeDate.split('/').reverse().join('-') : ''), remarks: r.remarks ?? '', allocated: String(r.allocated ?? '') }) }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5 }}>
      <Typography variant="h5">{manual ? 'Receipt MCO/Others Manual' : 'Receipt MCO/Others'}</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField select size="small" label="Rec. Type" value={h.type} onChange={set('type')} sx={{ width: 170 }}>{types.map(([c, t]) => <MenuItem key={c} value={c}>{t}</MenuItem>)}</TextField>
        <TextField size="small" label="Receipt No" value={h.receiptNo} disabled={!manual} onChange={set('receiptNo')} helperText={manual ? ' ' : 'generated'} slotProps={{ htmlInput: { maxLength: 20 } }} />
        <DateField label="Receipt Date" required value={h.date} onChange={(iso) => setH((x) => ({ ...x, date: iso }))} />
        <TextField size="small" type="number" label="Receipt Amount" required value={h.amount} onChange={set('amount')} slotProps={{ htmlInput: { min: 0, step: '0.01' } }} />
        <TextField size="small" label="Chq. No" value={h.chq} onChange={set('chq')} slotProps={{ htmlInput: { maxLength: 20 } }} />
        <DateField label="Chq. Date" value={h.chqDate} onChange={(iso) => setH((x) => ({ ...x, chqDate: iso }))} />
        {!isM && <TextField size="small" label="Acc Code" value={h.account} onChange={set('account')} slotProps={{ htmlInput: { maxLength: 15 } }} />}
        <TextField size="small" label="Remarks" value={h.remarks} onChange={set('remarks')} slotProps={{ htmlInput: { maxLength: 50 } }} sx={{ width: 260 }} />
        <Button variant="contained" disabled={!canSave || save.isPending} onClick={() => { setMessage(null); setConfirm('save') }}>Save</Button>
        <Button variant="outlined" disabled={searchReceipts.isPending} onClick={() => searchReceipts.mutate()}>Find receipts</Button>
        <Button variant="outlined" onClick={() => { setH(blank); setS(blankSearch); setFound(null); setChecked(new Set()); setExisting(null); setMessage(null) }}>Clear</Button>
      </Paper>
      {isM && (
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField select size="small" label="Payor" value={s.payor} onChange={(e) => setS({ ...s, payor: e.target.value })} sx={{ width: 240 }}>{(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}</TextField>
          <TextField size="small" label="Invoice No fr" value={s.numberFrom} onChange={(e) => setS({ ...s, numberFrom: e.target.value })} sx={{ width: 130 }} /><TextField size="small" label="To" value={s.numberTo} onChange={(e) => setS({ ...s, numberTo: e.target.value })} sx={{ width: 110 }} />
          <DateField label="Invoice Date fr" value={s.dateFrom} onChange={(iso) => setS({ ...s, dateFrom: iso })} /><DateField label="To" value={s.dateTo} onChange={(iso) => setS({ ...s, dateTo: iso })} />
          <FormControlLabel control={<Checkbox size="small" checked={s.creditNotes} onChange={(e) => setS({ ...s, creditNotes: e.target.checked })} />} label="Credit notes" />
          <FormControlLabel control={<Checkbox size="small" checked={s.onlyOpen} onChange={(e) => setS({ ...s, onlyOpen: e.target.checked })} />} label="Not yet receipted" />
          <Button variant="contained" disabled={!s.payor || searchInvoices.isPending} onClick={() => { setMessage(null); searchInvoices.mutate() }}>Search</Button>
        </Paper>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 100 }}>
        <Table size="small" stickyHeader>
          {isM && found ? (<>
            <TableHead><TableRow><TableCell padding="checkbox" /><TableCell>Invoice / CR No</TableCell><TableCell>Date</TableCell><TableCell align="right">Amount</TableCell><TableCell>Type</TableCell><TableCell>Received</TableCell><TableCell>Receipt No</TableCell></TableRow></TableHead>
            <TableBody>{found.rows.map((r) => (
              <TableRow key={r.number} hover><TableCell padding="checkbox"><Checkbox size="small" checked={checked.has(r.number)} disabled={r.receiptLines > 0} onChange={() => setChecked((c) => { const n = new Set(c); if (n.has(r.number)) n.delete(r.number); else n.add(r.number); return n })} /></TableCell>
                <TableCell>{r.number}</TableCell><TableCell>{toDmy(r.date ?? '')}</TableCell><TableCell align="right">{formatMoney(r.kind === 'CreditNote' ? -r.total : r.total)}</TableCell><TableCell>{r.kind === 'CreditNote' ? 'CR note' : 'Invoice'}</TableCell><TableCell>{r.receiptLines ? formatMoney(r.received) : ''}</TableCell><TableCell>{r.receiptNo}</TableCell></TableRow>))}
              {found.rows.length === 0 && <TableRow><TableCell colSpan={7}>No record found!</TableCell></TableRow>}</TableBody>
          </>) : existing ? (<>
            <TableHead><TableRow><TableCell>Receipt No</TableCell><TableCell>Date</TableCell><TableCell align="right">Amount</TableCell><TableCell>Type</TableCell><TableCell>Invoice</TableCell><TableCell align="right">Allocated</TableCell><TableCell>Chq. No</TableCell><TableCell>Chq. Date</TableCell><TableCell>Acc</TableCell><TableCell>Remarks</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{existing.rows.map((r) => (
              <TableRow key={`${r.kind}${r.index}`} hover><TableCell>{r.receiptNo}</TableCell><TableCell>{toDmy(r.receiptDate ?? '')}</TableCell><TableCell align="right">{formatMoney(r.amount)}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.invoiceNo}</TableCell><TableCell align="right">{r.allocated === null ? '' : formatMoney(r.allocated)}</TableCell>
                <TableCell>{r.chequeNo}</TableCell><TableCell>{r.chequeDate}</TableCell><TableCell>{r.accountCode}</TableCell><TableCell>{r.remarks}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => startEdit(r)}>Edit</Button><Button size="small" color="error" onClick={() => setConfirm({ del: r })}>Delete</Button></TableCell></TableRow>))}
              {existing.rows.length === 0 && <TableRow><TableCell colSpan={11}>No record found!</TableCell></TableRow>}</TableBody>
          </>) : <TableBody><TableRow><TableCell>{isM ? 'Search invoices to receipt, or find existing receipts.' : 'Enter the receipt and Save, or find existing receipts.'}</TableCell></TableRow></TableBody>}
        </Table>
      </TableContainer>
      <Typography variant="body2">{isM && found ? <><strong style={{ color: '#c62828' }}>Selected net</strong> {formatMoney(net)} &nbsp; <strong style={{ color: '#c62828' }}>Receipt amount</strong> {formatMoney(Number(h.amount || 0))} &nbsp; <strong style={{ color: '#c62828' }}>Difference</strong> {formatMoney(Number(h.amount || 0) - net)}</> : existing ? <><strong style={{ color: '#c62828' }}>Total Amt</strong> {formatMoney(existing.totalAmount)} &nbsp; <strong style={{ color: '#c62828' }}>Records</strong> {existing.rows.length}</> : ''}</Typography>
      <ConfirmDialog open={confirm === 'save'} busy={save.isPending} title="Save receipt" message={`Do you want to save the record?${isM ? ` ${checked.size} invoice(s), net ${formatMoney(net)}.` : ''}`} onConfirm={() => save.mutate()} onCancel={() => setConfirm(null)} />
      <ConfirmDialog open={!!confirm && confirm !== 'save'} busy={remove.isPending} title="Delete record" message="Do you want to delete this record?" onConfirm={() => remove.mutate((confirm as { del: McoReceiptRow }).del)} onCancel={() => setConfirm(null)} />
      <Dialog open={!!edit} onClose={() => setEdit(null)}><DialogTitle>Edit receipt {edit?.receiptNo}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5, pt: '8px !important' }}>
          <DateField label="Receipt Date" required value={editValues.date} onChange={(iso) => setEditValues((v) => ({ ...v, date: iso }))} />
          <TextField size="small" type="number" label="Receipt Amount" value={editValues.amount} onChange={(e) => setEditValues((v) => ({ ...v, amount: e.target.value }))} />
          {edit?.kind === 'M' && <TextField size="small" type="number" label={`Allocated to ${edit.invoiceNo}`} value={editValues.allocated} onChange={(e) => setEditValues((v) => ({ ...v, allocated: e.target.value }))} />}
          <TextField size="small" label="Chq. No" value={editValues.chq} onChange={(e) => setEditValues((v) => ({ ...v, chq: e.target.value }))} /><DateField label="Chq. Date" value={editValues.chqDate} onChange={(iso) => setEditValues((v) => ({ ...v, chqDate: iso }))} />
          <TextField size="small" label="Remarks" value={editValues.remarks} onChange={(e) => setEditValues((v) => ({ ...v, remarks: e.target.value }))} slotProps={{ htmlInput: { maxLength: 50 } }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="contained" disabled={update.isPending} onClick={() => update.mutate()}>Update</Button></DialogActions></Dialog>
    </Box>
  )
}

