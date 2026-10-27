import { TextField, type TextFieldProps } from '@mui/material'
import { useState } from 'react'
import { maskDmy, toDmy, toIso } from '../lib/dates'

interface Props extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> { value: string; onChange: (iso: string) => void }

/** Date entry in the legacy dd/mm/yyyy format. `value` and `onChange` use ISO yyyy-mm-dd ('' when empty or not a valid date). */
export function DateField({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(toDmy(value))
  const [previous, setPrevious] = useState(value)
  if (value !== previous) { setPrevious(value); if (value !== toIso(text)) setText(toDmy(value)) }
  const invalid = text.length === 10 && toIso(text) === ''
  return (
    <TextField size="small" placeholder="dd/mm/yyyy" {...rest} value={text} error={invalid || rest.error} helperText={invalid ? 'Invalid date' : rest.helperText}
      onChange={(e) => { const m = maskDmy(e.target.value); setText(m); onChange(toIso(m)) }} slotProps={{ htmlInput: { maxLength: 10, inputMode: 'numeric' }, inputLabel: { shrink: true } }} />
  )
}

