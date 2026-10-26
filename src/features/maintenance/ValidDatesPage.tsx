import { Alert, Box, Button, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { validDatesApi, type ValidDateRanges } from '../../api/validDates'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatDate } from '../../lib/format'

const empty: ValidDateRanges = { effectiveStart: null, effectiveEnd: null, expiryStart: null, expiryEnd: null, birthStart: null, birthEnd: null }
const groups: { title: string; start: keyof ValidDateRanges; end: keyof ValidDateRanges }[] = [
  { title: 'Effective date', start: 'effectiveStart', end: 'effectiveEnd' },
  { title: 'Expiry date', start: 'expiryStart', end: 'expiryEnd' },
  { title: 'Date of birth', start: 'birthStart', end: 'birthEnd' },
]

/** Legacy: Maintenance > Date. The windows of dates the membership screens accept. */
export function ValidDatesPage() {
  const current = useQuery({ queryKey: ['valid-dates'], queryFn: validDatesApi.get })
  if (current.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (current.error) return <Alert severity="error">{(current.error as Error).message}</Alert>
  return <ValidDatesForm initial={current.data ?? empty} />
}

function ValidDatesForm({ initial }: { initial: ValidDateRanges }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(initial)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const save = useMutation({
    mutationFn: () => validDatesApi.save(values),
    onSuccess: (saved) => { setValues(saved); setConfirming(false); setMessage({ severity: 'success', text: 'Record saved.' }); void queryClient.invalidateQueries({ queryKey: ['valid-dates'] }) },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const set = (key: keyof ValidDateRanges) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value || null }))

  return (
    <>
      <Typography variant="h5" gutterBottom>Member Date Ranges</Typography>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert>}
      <Box sx={{ display: 'grid', gap: 2, maxWidth: 520 }}>
        {groups.map((g) => (
          <Box key={g.title} sx={{ display: 'flex', gap: 2 }}>
            <TextField size="small" type="date" label={`${g.title} - start`} value={(values[g.start] as string | null) ?? ''} onChange={set(g.start)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="end" value={(values[g.end] as string | null) ?? ''} onChange={set(g.end)} slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
        ))}
        {values.updatedBy && <Typography variant="caption" color="text.secondary">Last updated by {values.updatedBy} on {formatDate(values.updatedOn)}</Typography>}
        <Box><Button variant="contained" onClick={() => { setMessage(null); setConfirming(true) }} disabled={save.isPending}>Update</Button></Box>
      </Box>
      <ConfirmDialog open={confirming} busy={save.isPending} title="Save record" message="Do you want to save the record?" onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}
