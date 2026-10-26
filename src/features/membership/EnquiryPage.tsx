import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { membershipApi } from '../../api/membership'
import { formatDate } from '../../lib/format'
import { MemberDetailView } from './MemberDetailView'

const MIN_LENGTH = 3

export function EnquiryPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const selected = params.get('member')
  const [input, setInput] = useState(q)
  const [formError, setFormError] = useState<string | null>(null)

  const search = useQuery({ queryKey: ['member-search', q], queryFn: () => membershipApi.search(q), enabled: q.length >= MIN_LENGTH })
  const items = search.data?.items

  // Same behaviour as the legacy form: a single match opens the member straight away.
  useEffect(() => {
    if (items?.length === 1 && selected !== items[0].number) {
      setParams({ q, member: items[0].number }, { replace: true })
    }
  }, [items, q, selected, setParams])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = input.trim()
    if (value.length < MIN_LENGTH) return setFormError(`Enter at least ${MIN_LENGTH} characters of the membership number.`)
    if (!/^[A-Za-z0-9*\- ]+$/.test(value)) return setFormError('Only letters, digits, * and - are allowed.')
    setFormError(null)
    setParams({ q: value })
  }

  return (
    <>
      <Typography variant="h5" gutterBottom>Membership Enquiry</Typography>
      <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" label="Membership No (prefix)" value={input} onChange={(e) => setInput(e.target.value)} autoFocus sx={{ width: 280 }} />
        <Button type="submit" variant="contained">Search</Button>
      </Box>
      {formError && <Alert severity="warning" sx={{ mb: 2 }}>{formError}</Alert>}
      {search.error && <Alert severity="error" sx={{ mb: 2 }}>{(search.error as Error).message}</Alert>}
      {search.isLoading && <Typography color="text.secondary">Searching...</Typography>}
      {items && items.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>No record found!</Alert>}
      {items && items.length > 1 && (
        <>
          {search.data?.truncated && <Alert severity="info" sx={{ mb: 1 }}>Showing the first {items.length} matches. Enter more characters to narrow the search.</Alert>}
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, mb: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>{['Member No', 'Cover', 'Name', 'IC/BC/PP', 'Policy No', 'Status', 'Payor Eff', 'Payor Exp', 'Group Company'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.number} hover selected={m.number === selected} sx={{ cursor: 'pointer' }} onClick={() => setParams({ q, member: m.number })}>
                    <TableCell>{m.number}</TableCell><TableCell>{m.coverId}</TableCell><TableCell>{m.name}</TableCell><TableCell>{m.icBcPp}</TableCell>
                    <TableCell>{m.policyNo}</TableCell><TableCell>{m.status}</TableCell><TableCell>{formatDate(m.payorEffDate)}</TableCell>
                    <TableCell>{formatDate(m.payorExpDate)}</TableCell><TableCell>{m.groupCompany}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      {selected && <MemberDetailView key={selected} number={selected} />}
    </>
  )
}
