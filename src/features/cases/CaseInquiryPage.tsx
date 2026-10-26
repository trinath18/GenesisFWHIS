import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { casesApi, type CaseSearchBy } from '../../api/cases'
import { formatDate, formatMoney } from '../../lib/format'
import { CaseDetailView } from './CaseDetailView'
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

export function CaseInquiryPage() {
  const [params, setParams] = useSearchParams()
  const by = (params.get('by') as CaseSearchBy | null) ?? 'CaseNo'
  const q = params.get('q') ?? ''
  const selected = params.get('case')
  const [type, setType] = useState<CaseSearchBy>(by)
  const [input, setInput] = useState(q)
  const [formError, setFormError] = useState<string | null>(null)
  const min = searchTypes.find((s) => s.value === by)?.minLength ?? 3

  const search = useQuery({ queryKey: ['case-search', by, q], queryFn: () => casesApi.search(by, q), enabled: q.length >= min })
  const items = search.data?.items

  // Same behaviour as the legacy form: a single match opens the case straight away.
  useEffect(() => {
    if (items?.length === 1 && selected !== items[0].caseNumber) setParams({ by, q, case: items[0].caseNumber }, { replace: true })
  }, [items, by, q, selected, setParams])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = input.trim()
    const required = searchTypes.find((s) => s.value === type)!.minLength
    if (value.length < required) return setFormError(`Enter at least ${required} character${required > 1 ? 's' : ''}.`)
    if (!allowed.test(value)) return setFormError('That value contains characters that are not allowed.')
    setFormError(null)
    setParams({ by: type, q: value })
  }

  return (
    <>
      <Typography variant="h5" gutterBottom>Case Inquiry</Typography>
      <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Search by" value={type} onChange={(e) => setType(e.target.value as CaseSearchBy)} sx={{ width: 220 }}>
          {searchTypes.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Search value" value={input} onChange={(e) => setInput(e.target.value)} autoFocus sx={{ width: 280 }} />
        <Button type="submit" variant="contained">Search</Button>
      </Box>
      {formError && <Alert severity="warning" sx={{ mb: 2 }}>{formError}</Alert>}
      {search.error && <Alert severity="error" sx={{ mb: 2 }}>{(search.error as Error).message}</Alert>}
      {search.isLoading && <Typography color="text.secondary">Searching...</Typography>}
      {items && items.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>No Record Available</Alert>}
      {items && items.length > 1 && (
        <>
          {search.data?.truncated && <Alert severity="info" sx={{ mb: 1 }}>Showing the first {items.length} cases. Enter more characters to narrow the search.</Alert>}
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, mb: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>{['Case No', 'Member No', 'Cover', 'Name', 'Policy No', 'Plan', 'Hospital', 'Admitted', 'Discharged', 'Reserve', 'Status'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.caseNumber} hover selected={c.caseNumber === selected} sx={{ cursor: 'pointer' }} onClick={() => setParams({ by, q, case: c.caseNumber })}>
                    <TableCell>{c.caseNumber}</TableCell><TableCell>{c.memberNumber}</TableCell><TableCell>{c.coverId}</TableCell><TableCell>{c.memberName}</TableCell>
                    <TableCell>{c.policyNo}</TableCell><TableCell>{c.planCode}</TableCell><TableCell>{c.hospitalCode}</TableCell>
                    <TableCell>{formatDate(c.admitted)}</TableCell><TableCell>{formatDate(c.discharged)}</TableCell>
                    <TableCell align="right">{formatMoney(c.reserveAmount)}</TableCell><TableCell>{withLabel(c.status, statusLabels)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      {selected && <CaseDetailView key={selected} caseNumber={selected} />}
    </>
  )
}
