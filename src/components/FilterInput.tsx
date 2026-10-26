import { Box, MenuItem, TextField } from '@mui/material'
import type { TrackingFilterDef, TrackingFilters } from '../api/tracking'

/** One input per filter, chosen from the filter kind sent by the API. Ranges use `<key>.from` / `<key>.to`. */
export function FilterInput({ f, values, onChange }: { f: TrackingFilterDef; values: TrackingFilters; onChange: (key: string, value: string) => void }) {
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

