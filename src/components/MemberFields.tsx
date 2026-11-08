import { Autocomplete, MenuItem, TextField, type SxProps, type Theme } from '@mui/material'

/**
 * A drop-down of fixed choices with a blank first item. A stored value missing from the list (old data) is still shown, so opening a record never blanks it.
 */
export function CodeSelect({ value, onChange, items, label, required, disabled, sx }: {
  value: string; onChange: (v: string) => void; items: [string, string][]; label?: string; required?: boolean; disabled?: boolean; sx?: SxProps<Theme>
}) {
  const v = value.trim() // codes can come back padded (CHAR columns)
  const known = !v || items.some(([c]) => c === v)
  return (
    <TextField select size="small" label={label} required={required} disabled={disabled} sx={sx} value={v} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">&nbsp;</MenuItem>
      {!known && <MenuItem value={v}>{v}</MenuItem>}
      {items.map(([c, l]) => <MenuItem key={c} value={c}>{l}</MenuItem>)}
    </TextField>
  )
}

/** Pick from the list or type a value, like the legacy editable combo boxes (City/Town, State); what is typed is kept in capitals. */
export function PickText({ value, onChange, options, max, label, required, disabled, sx, inputSx }: {
  value: string; onChange: (v: string) => void; options: string[]; max: number; label?: string; required?: boolean; disabled?: boolean; sx?: SxProps<Theme>; inputSx?: SxProps<Theme>
}) {
  return (
    <Autocomplete freeSolo size="small" options={options} disabled={disabled} inputValue={value} onInputChange={(_, v) => { const next = v.toUpperCase().slice(0, max); if (next !== value) onChange(next) }}
      sx={sx ?? { width: '100%', minWidth: 0 }} renderInput={(p) => <TextField {...p} label={label} sx={inputSx} required={required} placeholder="Pick or type" />} />
  )
}
