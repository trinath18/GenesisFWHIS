import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { trackingApi, type TrackingFilterDef, type TrackingFilters } from '../../api/tracking'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'

/** One input per filter, chosen from the filter kind sent by the API. Ranges use `<key>.from` / `<key>.to`. */
function FilterInput({ f, values, onChange }: { f: TrackingFilterDef; values: TrackingFilters; onChange: (key: string, value: string) => void }) {
  const set = (key: string) => (e: { target: { value: string } }) => onChange(key, e.target.value)
  if (f.kind === 'DateRange') {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" type="date" label={`${f.label} from`} value={values[`${f.key}.from`] ?? ''} onChange={set(`${f.key}.from`)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="to" value={values[`${f.key}.to`] ?? ''} onChange={set(`${f.key}.to`)} slotProps={{ inputLabel: { shrink: true } }} />
      </Box>
    )
  }
  if (f.kind === 'TextRange') {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" label={`${f.label} from`} value={values[`${f.key}.from`] ?? ''} onChange={set(`${f.key}.from`)} />
        <TextField size="small" label="to" value={values[`${f.key}.to`] ?? ''} onChange={set(`${f.key}.to`)} />
      </Box>
    )
  }
  if (f.kind === 'Choice') {
    return (
      <TextField select size="small" label={f.label} value={values[f.key] ?? ''} onChange={set(f.key)} sx={{ minWidth: 200 }}>
        <MenuItem value="">(any)</MenuItem>
        {f.choices?.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
      </TextField>
    )
  }
  const hint = f.kind === 'Prefix' ? 'starts with' : f.kind === 'Contains' ? 'contains' : undefined
  return <TextField size="small" label={f.label} helperText={hint} value={values[f.key] ?? ''} onChange={set(f.key)} />
}

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


