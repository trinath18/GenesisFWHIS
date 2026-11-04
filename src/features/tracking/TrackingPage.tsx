import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { trackingApi, type TrackingFilters } from '../../api/tracking'
import { FilterInput } from '../../components/FilterInput'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'

const cell = (type: string, v: string | number | null) =>
  v === null ? '' : type === 'date' ? formatDate(String(v)) : type === 'money' ? formatMoney(Number(v)) : String(v)

export function TrackingPage() {
  const { id = '' } = useParams()
  return <TrackingScreen key={id} id={id} />
}

function TrackingScreen({ id }: { id: string }) {
  const definition = useQuery({ queryKey: ['tracking', id], queryFn: () => trackingApi.definition(id) })
  const [draft, setDraft] = useState<TrackingFilters>({})
  const [applied, setApplied] = useState<TrackingFilters | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const result = useQuery({ queryKey: ['tracking', id, 'search', applied], queryFn: () => trackingApi.search(id, applied!), enabled: applied !== null })

  const submit = (e: FormEvent) => { e.preventDefault(); setApplied({ ...draft }) }
  const clear = () => { setDraft({}); setApplied(null) }
  const exportExcel = async () => {
    setExportError(null)
    try { download(await trackingApi.export(id, applied ?? draft), `${id}.xlsx`) } catch (err) { setExportError(err instanceof Error ? err.message : 'Export failed') }
  }
  const [printing, setPrinting] = useState<string | null>(null)
  const printOut = async (key: string) => {
    setExportError(null); setPrinting(key)
    try { download(await trackingApi.print(id, key, applied ?? draft), `${key}.pdf`) } catch (err) { setExportError(err instanceof Error ? err.message : 'Print failed') } finally { setPrinting(null) }
  }

  if (definition.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (definition.error) return <Alert severity="error">{(definition.error as Error).message}</Alert>
  const def = definition.data!

  return (
    <>
      <Typography variant="h5" gutterBottom>{def.title}</Typography>
      <Typography variant="caption" color="text.secondary">{def.module}</Typography>
      <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, my: 2 }}>
        {def.filters.map((f) => <FilterInput key={f.key} f={f} values={draft} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />)}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Button type="submit" variant="contained">Search</Button>
          <Button onClick={clear}>Clear</Button>
          <Button onClick={exportExcel} disabled={applied === null}>Excel</Button>
          {def.prints?.map((p) => <Button key={p.key} onClick={() => printOut(p.key)} disabled={applied === null || printing !== null}>{printing === p.key ? 'Printing...' : p.label}</Button>)}
        </Box>
      </Box>
      {exportError && <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>}
      {result.error && <Alert severity="error" sx={{ mb: 2 }}>{(result.error as Error).message}</Alert>}
      {applied === null && (
        <Typography color="text.secondary">
          {def.requiresFilter ? 'This screen reads a very large table: enter at least one filter, then press Search.' : `Enter filters and press Search. Leave them all empty to list the first ${def.maxRows} rows.`}
        </Typography>
      )}
      {result.isLoading && <Typography color="text.secondary">Searching...</Typography>}
      {result.data && (
        <>
          {result.data.truncated && <Alert severity="info" sx={{ mb: 1 }}>Showing the first {result.data.rows.length} rows. Add filters to narrow the search, or use Excel (up to 50,000 rows).</Alert>}
          {result.data.rows.length === 0
            ? <Alert severity="info">No Record Available</Alert>
            : (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '65vh' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>{result.data.columns.map((c) => <TableCell key={c.key} align={c.type === 'money' || c.type === 'number' ? 'right' : 'left'}>{c.header}</TableCell>)}</TableRow>
                  </TableHead>
                  <TableBody>
                    {result.data.rows.map((row, i) => (
                      <TableRow key={i} hover>
                        {row.map((v, j) => {
                          const c = result.data!.columns[j]
                          return <TableCell key={c.key} align={c.type === 'money' || c.type === 'number' ? 'right' : 'left'}>{cell(c.type, v)}</TableCell>
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          <Typography variant="caption" color="text.secondary">{result.data.rows.length} row(s)</Typography>
        </>
      )}
    </>
  )
}




