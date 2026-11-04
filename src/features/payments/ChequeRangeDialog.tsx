import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { hospitalPaymentApi, type ChequeRangeListing, type ChequeRangeRequest } from '../../api/payments'
import { legacyBox as box } from '../../components/legacyStyles'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'

const blank: ChequeRangeRequest = { accountType: '', chequeNoFrom: '', chequeNoTo: '' }

/**
 * Legacy Print Cheque Range (frmPrintChequeRange, opened from Payment to Hospital): pick the voucher series and a cheque number range, Search lists the
 * cheques not yet printed, and Print (enabled only when the list is complete) prints them and marks them printed so they drop out of the list.
 */
export function ChequeRangeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [r, setR] = useState<ChequeRangeRequest>(blank)
  const [listing, setListing] = useState<ChequeRangeListing | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const accounts = useQuery({ queryKey: ['cheque-accounts'], queryFn: hospitalPaymentApi.chequeAccounts, enabled: open })
  const fail = (e: unknown) => { setConfirm(false); setMessage({ severity: 'error', text: (e as Error).message }) }
  const search = useMutation({
    mutationFn: () => hospitalPaymentApi.chequeRange(r),
    onSuccess: (l) => { setListing(l); setMessage(l.problem ? { severity: 'warning', text: l.problem } : null) }, onError: fail,
  })
  const print = useMutation({
    mutationFn: () => hospitalPaymentApi.printChequeRange(r),
    onSuccess: (f) => {
      download(f.blob, f.fileName)
      setConfirm(false); setMessage({ severity: 'success', text: `${listing?.cheques.length ?? 0} cheque(s) printed and marked printed.` }); setListing(null)
    }, onError: fail,
  })
  const set = (k: keyof ChequeRangeRequest) => (e: { target: { value: string } }) => { setR((x) => ({ ...x, [k]: e.target.value })); setListing(null); setConfirm(false) }
  const canPrint = !!listing && listing.cheques.length > 0 && !listing.problem
  const total = listing?.cheques.reduce((a, c) => a + c.amount, 0) ?? 0
  const table = { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
    '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0 }, '& td.n': { textAlign: 'right' } } as const

  return (
    <Dialog open={open} onClose={print.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Print Cheque Range</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', pt: 1 }}>
          <TextField select size="small" label="Payment type" sx={{ ...box, minWidth: 220 }} value={r.accountType} onChange={set('accountType')}>
            {(accounts.data ?? []).map((a) => (
              <MenuItem key={a.accountType} value={a.accountType}>{a.accountType}{a.bankAccount ? ` - A/C ${a.bankAccount}` : ''} ({a.vouchers.toLocaleString()} PV)</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="Cheque No from" sx={{ ...box, width: 170 }} value={r.chequeNoFrom} onChange={set('chequeNoFrom')} />
          <TextField size="small" label="To" sx={{ ...box, width: 170 }} value={r.chequeNoTo} onChange={set('chequeNoTo')} />
          <Button size="small" variant="contained" disabled={search.isPending} onClick={() => { setMessage(null); search.mutate() }}>Search</Button>
        </Box>
        <Paper variant="outlined" sx={{ maxHeight: '45vh', overflow: 'auto' }}>
          <Box component="table" sx={table}>
            <thead><tr><th>Cheque No</th><th>Cheque Date</th><th>Amount</th><th>Payee</th><th>PV No</th><th>A/C</th></tr></thead>
            <tbody>
              {listing?.cheques.map((c) => (
                <tr key={`${c.chequeNo}-${c.pvNo}`}>
                  <td>{c.chequeNo}</td><td>{formatDate(c.chequeDate)}</td><td className="n">{formatMoney(c.amount)}</td><td>{c.payee}</td><td>{c.pvNo}</td><td>{c.bankAccount ?? c.accountType}</td>
                </tr>
              ))}
              {!listing?.cheques.length && <tr><td colSpan={6}>Enter the payment type and cheque range, then click Search.</td></tr>}
            </tbody>
          </Box>
        </Paper>
        <Typography sx={{ fontSize: 13 }}>
          Cheque(s) listed: {listing?.cheques.length ?? 0}{listing?.expected != null ? ` of ${listing.expected} in the range` : ''}, total {formatMoney(total)}
        </Typography>
      </DialogContent>
      <DialogActions>
        {confirm
          ? <>
            <Typography sx={{ fontSize: 13, mr: 'auto', pl: 2 }}>Do you want to print now? The cheques will be marked printed.</Typography>
            <Button onClick={() => setConfirm(false)} disabled={print.isPending}>No</Button>
            <Button variant="contained" color="warning" disabled={print.isPending} onClick={() => print.mutate()}>Yes</Button>
          </>
          : <>
            <Button variant="contained" disabled={!canPrint} onClick={() => setConfirm(true)}>Print</Button>
            <Button onClick={onClose}>Exit</Button>
          </>}
      </DialogActions>
    </Dialog>
  )
}
