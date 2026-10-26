import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { hospitalsApi } from '../../api/hospitals'

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function HospitalsPage() {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useQuery({ queryKey: ['hospitals', search], queryFn: () => hospitalsApi.list(search) })
  const [exportError, setExportError] = useState<string | null>(null)

  const exportAs = async (kind: 'pdf' | 'xlsx') => {
    setExportError(null)
    try {
      download(await hospitalsApi[kind](search), `hospitals.${kind}`)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    setSearch(input)
  }

  return (
    <>
      <Typography variant="h5" gutterBottom>Hospitals</Typography>
      <Box component="form" onSubmit={onSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" label="Search code or name" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" variant="contained">Search</Button>
        <Button onClick={() => exportAs('pdf')}>PDF</Button>
        <Button onClick={() => exportAs('xlsx')}>Excel</Button>
      </Box>
      {(error || exportError) && <Alert severity="error" sx={{ mb: 2 }}>{(error as Error | null)?.message ?? exportError}</Alert>}
      <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>{['Code', 'Name', 'Town', 'State', 'Telephone', 'Email', 'Status'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>}
            {data?.map((h) => (
              <TableRow key={h.code} hover>
                <TableCell>{h.code}</TableCell><TableCell>{h.name}</TableCell><TableCell>{h.town}</TableCell>
                <TableCell>{h.state}</TableCell><TableCell>{h.telephone}</TableCell><TableCell>{h.email}</TableCell><TableCell>{h.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary">{data ? `${data.length} record(s)` : ''}</Typography>
    </>
  )
}
