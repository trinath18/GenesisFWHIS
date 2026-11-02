import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { caseAdjustmentTabsApi, type CaseSearchItem } from '../../api/caseRegistration'
import { toDmy } from '../../lib/dates'
import { formatMoney } from '../../lib/format'

const kinds: [string, string][] = [['memberno', 'Mem Num'], ['caseno', 'Case Num'], ['name', 'Member Name'], ['ic', 'IC Num'], ['policyno', 'Policy Num'], ['espRefNo', 'ESP Ref Num'], ['claimId', 'Claim ID']]

/** The "List of Cases" search of the legacy Case Adjustment form. */
export function CaseSearchDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (caseNumber: string, item: CaseSearchItem) => void }) {
  const [by, setBy] = useState('memberno')
  const [q, setQ] = useState('')
  const search = useMutation({ mutationFn: () => caseAdjustmentTabsApi.search(by, q.trim()) })
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>List of Cases</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <TextField select size="small" label="Search by" value={by} onChange={(e) => setBy(e.target.value)} sx={{ width: 180 }}>{kinds.map(([c, n]) => <MenuItem key={c} value={c}>{n}</MenuItem>)}</TextField>
          <TextField size="small" label="Search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim().length >= 3) search.mutate() }} sx={{ flex: 1 }} helperText={q.trim().length > 0 && q.trim().length < 3 ? 'Search String must be at least 3 characters!' : ' '} />
          <Button variant="contained" disabled={q.trim().length < 3 || search.isPending} onClick={() => search.mutate()}>Search</Button>
        </div>
        {search.isError && <Alert severity="error">{(search.error as Error).message}</Alert>}
        {search.data?.items.length === 0 && <Alert severity="info">No Record Available</Alert>}
        {search.data?.truncated && <Alert severity="warning">Only the first rows are shown; refine the search.</Alert>}
        {!!search.data?.items.length && (
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow>{['Case No', 'Mem No', 'Name', 'Policy No', 'Admitted', 'Discharged', 'Status', 'Reserve'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {search.data.items.map((c) => (
                  <TableRow key={c.caseNumber} hover sx={{ cursor: 'pointer' }} onClick={() => onPick(c.caseNumber, c)}>
                    <TableCell>{c.caseNumber}</TableCell><TableCell>{c.memberNumber}</TableCell><TableCell>{c.memberName}</TableCell><TableCell>{c.policyNo}</TableCell><TableCell>{toDmy(c.admitted ?? '')}</TableCell><TableCell>{toDmy(c.discharged ?? '')}</TableCell><TableCell>{c.status}</TableCell><TableCell align="right">{formatMoney(c.reserveAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Exit</Button></DialogActions>
    </Dialog>
  )
}
