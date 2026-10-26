import { Alert, Autocomplete, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { summaryApi, type SummaryDefinition } from '../../api/summary'
import type { TrackingFilters } from '../../api/tracking'
import { FilterInput } from '../../components/FilterInput'
import { download } from '../../lib/download'
import { formatMoney } from '../../lib/format'

export function SummaryPage() {
  const { id = '' } = useParams()
  return <SummaryScreen key={id} id={id} />
}

type Option = { key: string; header: string }

function Picker({ label, options, value, onChange, max }: { label: string; options: Option[]; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  return (
    <Autocomplete
      multiple size="small" sx={{ minWidth: 320 }} options={options} value={options.filter((o) => value.includes(o.key))}
      getOptionLabel={(o) => o.header} isOptionEqualToValue={(a, b) => a.key === b.key}
      getOptionDisabled={(o) => max !== undefined && value.length >= max && !value.includes(o.key)}
      onChange={(_, v) => onChange(v.map((o) => o.key))}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  )
}

function SummaryScreen({ id }: { id: string }) {
  const definition = useQuery({ queryKey: ['summary', id], queryFn: () => summaryApi.definition(id) })
  if (definition.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (definition.error) return <Alert severity="error">{(definition.error as Error).message}</Alert>
  return <SummaryForm def={definition.data!} />
}

function SummaryForm({ def }: { def: SummaryDefinition }) {
  const [filters, setFilters] = useState<TrackingFilters>({})
  const [dims, setDims] = useState<string[]>(def.defaultDimensions)
  const [measures, setMeasures] = useState<string[]>(def.defaultMeasures)
  const [top, setTop] = useState('')
  const [applied, setApplied] = useState<{ filters: TrackingFilters; dims: string[]; measures: string[]; top?: number } | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const result = useQuery({
    queryKey: ['summary', def.id, 'run', applied],
    queryFn: () => summaryApi.run(def.id, applied!.filters, applied!),
    enabled: applied !== null,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(top)
    setApplied({ filters: { ...filters }, dims, measures, top: top && n > 0 ? n : undefined })
  }
  const exportExcel = async () => {
    setExportError(null)
    const a = applied ?? { filters, dims, measures }
    try { download(await summaryApi.export(def.id, a.filters, a), `${def.id}.xlsx`) } catch (err) { setExportError(err instanceof Error ? err.message : 'Export failed') }
  }

  return (
    <>
      <Typography variant="h5" gutterBottom>{def.title}</Typography>
      {def.description && <Typography variant="caption" color="text.secondary">{def.description}</Typography>}
      <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 1.5, my: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Picker label={`Group by (max ${def.maxDimensions})`} options={def.dimensions} value={dims} onChange={setDims} max={def.maxDimensions} />
          <Picker label="Measures" options={def.measures} value={measures} onChange={setMeasures} />
          <TextField size="small" label="Top N groups" type="number" value={top} onChange={(e) => setTop(e.target.value)} sx={{ width: 140 }} />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {def.filters.map((f) => <FilterInput key={f.key} f={f} values={filters} onChange={(k, v) => setFilters((d) => ({ ...d, [k]: v }))} />)}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={measures.length === 0}>Run</Button>
          <Button onClick={() => { setFilters({}); setApplied(null) }}>Clear filters</Button>
          <Button onClick={exportExcel} disabled={measures.length === 0}>Excel</Button>
        </Box>
      </Box>
      {exportError && <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>}
      {result.error && <Alert severity="error" sx={{ mb: 2 }}>{(result.error as Error).message}</Alert>}
      {applied === null && <Typography color="text.secondary">{def.requiresFilter ? 'This report reads a very large table: enter at least one filter, choose how to group, then press Run.' : 'Choose how to group, then press Run.'}</Typography>}
      {result.isLoading && <Typography color="text.secondary">Running...</Typography>}
      {result.data && (
        result.data.rows.length === 0 ? <Alert severity="info">No Record Available</Alert> : (
          <>
            {result.data.truncated && <Alert severity="info" sx={{ mb: 1 }}>Showing the first {result.data.rows.length} groups. Add filters or a Top N to narrow the result.</Alert>}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '60vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>{result.data.columns.map((c) => <TableCell key={c.key} align={c.type === 'text' ? 'left' : 'right'}>{c.header}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {result.data.rows.map((row, i) => (
                    <TableRow key={i} hover>
                      {row.map((v, j) => {
                        const c = result.data!.columns[j]
                        return <TableCell key={c.key} align={c.type === 'text' ? 'left' : 'right'}>{v === null ? '' : c.type === 'money' ? formatMoney(Number(v)) : c.type === 'number' ? Number(v).toLocaleString('en-US') : String(v)}</TableCell>
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary">{result.data.rows.length} group(s)</Typography>
          </>
        )
      )}
    </>
  )
}
