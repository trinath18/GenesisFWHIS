import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { casesApi, type CaseSearchBy } from '../../api/cases'
import { formatDate, formatMoney } from '../../lib/format'
import { statusLabels, withLabel } from './labels'

const searchTypes: { value: CaseSearchBy; label: string; minLength: number }[] = [
  { value: 'CaseNo', label: 'Case No (prefix)', minLength: 3 },
  { value: 'MemberNo', label: 'Member No (prefix)', minLength: 3 },
  { value: 'PolicyNo', label: 'Policy No', minLength: 1 },
  { value: 'Name', label: 'Member name (contains)', minLength: 3 },
  { value: 'Ic', label: 'IC / BC / Passport', minLength: 1 },
  { value: 'EspRefNo', label: 'ESP Ref No', minLength: 1 },
  { value: 'ClaimId', label: 'Claim ID', minLength: 1 },
]
const allowed = /^[A-Za-z0-9 .,'/\-()@*]+$/

/** The Search button of the legacy Case Inquiry form: find cases by case, member, policy, name, IC, ESP ref or claim ID. */
export function CaseInquirySearchDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (caseNumber: string) => void }) {
  const [type, setType] = useState<CaseSearchBy>('MemberNo')
  const [input, setInput] = useState('')
  const [run, setRun] = useState<{ by: CaseSearchBy; q: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const search = useQuery({ queryKey: ['case-search', run?.by, run?.q], queryFn: () => casesApi.search(run!.by, run!.q), enabled: !!run })
  const items = search.data?.items

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = input.trim()
    const required = searchTypes.find((s) => s.value === type)!.minLength
    if (value.length < required) return setFormError(`Search String must be at least ${required} character${required > 1 ? 's' : ''}!`)
    if (!allowed.test(value)) return setFormError('That value contains characters that are not allowed.')
    setFormError(null)
    setRun({ by: type, q: value })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>List of Cases</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
        <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, pt: 1, flexWrap: 'wrap' }}>
          <TextField select size="small" label="Search by" value={type} onChange={(e) => setType(e.target.value as CaseSearchBy)} sx={{ width: 220 }}>
            {searchTypes.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Search" value={input} onChange={(e) => setInput(e.target.value)} autoFocus sx={{ flex: 1, minWidth: 220 }} />
          <Button type="submit" variant="contained">Search</Button>
        </Box>
        {formError && <Alert severity="warning">{formError}</Alert>}
        {search.error && <Alert severity="error">{(search.error as Error).message}</Alert>}
        {search.isLoading && <Typography color="text.secondary">Searching...</Typography>}
        {items && items.length === 0 && <Alert severity="info">No Record Available</Alert>}
        {search.data?.truncated && <Alert severity="info">Showing the first {items?.length} cases. Enter more characters to narrow the search.</Alert>}
        {!!items?.length && (
          <TableContainer sx={{ maxHeight: 380 }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow>{['Case No', 'Member No', 'Cover', 'Name', 'Policy No', 'Plan', 'Hospital', 'Admitted', 'Discharged', 'Reserve', 'Status'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.caseNumber} hover sx={{ cursor: 'pointer' }} onClick={() => onPick(c.caseNumber)}>
                    <TableCell>{c.caseNumber}</TableCell><TableCell>{c.memberNumber}</TableCell><TableCell>{c.coverId}</TableCell><TableCell>{c.memberName}</TableCell>
                    <TableCell>{c.policyNo}</TableCell><TableCell>{c.planCode}</TableCell><TableCell>{c.hospitalCode}</TableCell>
                    <TableCell>{formatDate(c.admitted)}</TableCell><TableCell>{formatDate(c.discharged)}</TableCell>
                    <TableCell align="right">{formatMoney(c.reserveAmount)}</TableCell><TableCell>{withLabel(c.status, statusLabels)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Exit</Button></DialogActions>
    </Dialog>
  )
}
