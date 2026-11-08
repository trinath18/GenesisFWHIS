import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material'
import { useRef, useState } from 'react'
import { isoDate, maskDmy, toDmy, toIso } from '../lib/dates'

interface Props extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> { value: string; onChange: (iso: string) => void }

/**
 * Date entry in the legacy dd/mm/yyyy format, typed or picked from the calendar button. `value` and `onChange` use ISO yyyy-mm-dd ('' when empty or not a
 * valid date); `value` may also carry a time, as DateTime columns do.
 */
export function DateField({ value, onChange, sx, slotProps, ...rest }: Props) {
  const iso = isoDate(value)
  const [text, setText] = useState(toDmy(iso))
  const [previous, setPrevious] = useState(iso)
  if (iso !== previous) { setPrevious(iso); if (iso !== toIso(text)) setText(toDmy(iso)) }
  const picker = useRef<HTMLInputElement>(null)
  const invalid = text.length === 10 && toIso(text) === ''
  const given = (slotProps ?? {}) as { input?: object; htmlInput?: object; inputLabel?: object }
  const readOnly = !!(given.input as { readOnly?: boolean } | undefined)?.readOnly
  const openCalendar = () => {
    const input = picker.current
    if (!input) return
    try { input.showPicker() } catch { input.focus() }
  }
  const calendar = rest.disabled || readOnly ? undefined : (
    <InputAdornment position="end" sx={{ ml: 0, mr: 0 }}>
      <IconButton size="small" tabIndex={-1} aria-label={typeof rest.label === 'string' ? `Choose ${rest.label}` : 'Choose date'} onClick={openCalendar} sx={{ p: 0.125, mr: -0.25 }}>
        <CalendarMonthOutlined sx={{ fontSize: 16 }} />
      </IconButton>
      <input ref={picker} type="date" tabIndex={-1} aria-hidden min="1900-01-01" value={toIso(text)} onChange={(e) => { setText(toDmy(e.target.value)); onChange(e.target.value) }}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, padding: 0, border: 0, opacity: 0, pointerEvents: 'none' }} />
    </InputAdornment>
  )
  return (
    <TextField size="small" placeholder="dd/mm/yyyy" {...rest} sx={[{ '& .MuiInputBase-adornedEnd': { pr: 0.5 } }, ...(Array.isArray(sx) ? sx : [sx]), { '& .MuiInputBase-adornedEnd .MuiInputBase-input': { pr: 0 } }]}
      value={text} error={invalid || rest.error} helperText={invalid ? 'Invalid date' : rest.helperText}
      onChange={(e) => { const m = maskDmy(e.target.value); setText(m); onChange(toIso(m)) }}
      slotProps={{ ...given, input: { ...given.input, endAdornment: calendar }, htmlInput: { ...given.htmlInput, maxLength: 10, inputMode: 'numeric' }, inputLabel: { ...given.inputLabel, shrink: true } }} />
  )
}


/** Drop-in for a TextField of type date: keeps the onChange(event) shape (event.target.value is yyyy-mm-dd) but shows and accepts dd/mm/yyyy. */
export function DateInput({ value, onChange, ...rest }: Omit<Props, 'onChange'> & { onChange: (e: { target: { value: string } }) => void }) {
  return <DateField {...rest} value={value} onChange={(iso) => onChange({ target: { value: iso } })} />
}

