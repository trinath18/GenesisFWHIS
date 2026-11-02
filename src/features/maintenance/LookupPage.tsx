import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { GENERATED_PLAN_HEALTH, lookupApi, PLAN_BATCH_MAX, type LookupField, type LookupMeta, type LookupOption, type LookupRow, type PlanBatchEntry } from '../../api/lookups'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'

/** Generic list / add / edit / delete screen for every code table in the server's lookup catalog. */
export function LookupPage() {
  const { id = '' } = useParams()
  return <LookupScreen key={id} id={id} />
}

function LookupScreen({ id }: { id: string }) {
  const meta = useQuery({ queryKey: ['lookup-meta', id], queryFn: () => lookupApi.meta(id) })
  if (meta.isLoading) return <Typography color="text.secondary">Loading...</Typography>
  if (meta.error) return <Alert severity="error">{(meta.error as Error).message}</Alert>
  return <LookupTable meta={meta.data!} />
}

type Editing = { mode: 'add' } | { mode: 'edit'; row: LookupRow }

function LookupTable({ meta }: { meta: LookupMeta }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [deleting, setDeleting] = useState<LookupRow | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const rows = useQuery({ queryKey: ['lookup-rows', meta.id, search], queryFn: () => lookupApi.rows(meta.id, search) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['lookup-rows', meta.id] })

  const remove = useMutation({
    mutationFn: (row: LookupRow) => lookupApi.remove(meta.id, row.key),
    onSuccess: () => { setMessage({ severity: 'success', text: 'Record deleted.' }); setDeleting(null); void refresh() },
    onError: (e) => { setMessage({ severity: 'error', text: (e as Error).message }); setDeleting(null) },
  })

  return (
    <>
      <Typography variant="h5" gutterBottom>{meta.title}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="contained" onClick={() => { setMessage(null); setEditing({ mode: 'add' }) }}>Add</Button>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {rows.error && <Alert severity="error" sx={{ mb: 2 }}>{(rows.error as Error).message}</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '65vh' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>{meta.fields.map((f) => <TableCell key={f.key} align={f.kind === 'Money' ? 'right' : 'left'}>{f.label}</TableCell>)}<TableCell align="right">Actions</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {(rows.data ?? []).map((row) => (
              <TableRow key={row.key} hover>
                {meta.fields.map((f) => <TableCell key={f.key} align={f.kind === 'Money' ? 'right' : 'left'} sx={f.multiline ? { maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : undefined}>{f.kind === 'Money' && row.values[f.key] ? Number(row.values[f.key]).toLocaleString('en-US', { minimumFractionDigits: 2 }) : f.kind === 'Date' ? toDmy(row.values[f.key] ?? '') : row.values[f.key]}</TableCell>)}
                <TableCell align="right">
                  <Button size="small" onClick={() => { setMessage(null); setEditing({ mode: 'edit', row }) }}>Edit</Button>
                  {meta.allowDelete && <Button size="small" color="error" onClick={() => setDeleting(row)}>Delete</Button>}
                </TableCell>
              </TableRow>
            ))}
            {rows.data?.length === 0 && <TableRow><TableCell colSpan={meta.fields.length + 1}><Typography color="text.secondary">No Record Available</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {editing && (
        <RecordDialog
          meta={meta} editing={editing} onClose={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); setMessage({ severity: 'success', text }); void refresh() }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null} busy={remove.isPending} title="Delete record" confirmLabel="Delete"
        message={`Do you want to delete '${deleting?.key}'?`}
        onConfirm={() => deleting && remove.mutate(deleting)} onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function RecordDialog({ meta, editing, onClose, onSaved }: { meta: LookupMeta; editing: Editing; onClose: () => void; onSaved: (message: string) => void }) {
  const initial = editing.mode === 'edit' ? Object.fromEntries(meta.fields.map((f) => [f.key, editing.row.values[f.key] ?? ''])) : {}
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Adding plans works like the legacy "No of Plan Code": up to six plans per save, sharing everything except code and description.
  const batch = meta.id === 'plan-code' && editing.mode === 'add'
  const [planCount, setPlanCount] = useState(1)
  const [plans, setPlans] = useState<PlanBatchEntry[]>(Array.from({ length: PLAN_BATCH_MAX }, () => ({ code: '', description: '' })))
  const generated = values.health === GENERATED_PLAN_HEALTH

  const save = useMutation({
    mutationFn: async () => {
      if (batch) {
        const shared = Object.fromEntries(Object.entries(values).filter(([k]) => k !== 'code' && k !== 'description'))
        const entries = generated ? plans.slice(0, planCount).map((p) => ({ code: '', description: p.description })) : plans
        const rows = await lookupApi.createPlans(shared, generated ? planCount : 0, entries)
        return `${rows.length} plan${rows.length === 1 ? '' : 's'} saved: ${rows.map((r) => r.values.code).join(', ')}.`
      }
      if (editing.mode === 'add') { await lookupApi.create(meta.id, values); return 'Record saved.' }
      await lookupApi.update(meta.id, editing.row.key, values)
      return 'Record updated.'
    },
    onSuccess: (text) => onSaved(text),
    onError: (e) => { setError((e as Error).message); setConfirming(false) },
  })

  const fields = meta.fields.filter((f) => !((f.isKey && meta.keyIsIdentity || f.key === meta.generatedField) && editing.mode === 'add') && !(batch && (f.key === 'code' || f.key === 'description')))
  const wide = fields.length > 10
  const required = (f: LookupField) => f.required || (f.requiredWhen !== null && values[f.requiredWhen.field] === f.requiredWhen.value)

  return (
    <>
      <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth={wide ? 'md' : 'sm'}>
        <DialogTitle>{editing.mode === 'add' ? 'Add' : 'Edit'} - {meta.title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, gridTemplateColumns: wide ? { xs: '1fr', sm: '1fr 1fr' } : '1fr', pt: '8px !important' }}>
          {error && <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{error}</Alert>}
          {fields.map((f) => (
            <Box key={f.key} sx={f.multiline ? { gridColumn: '1 / -1' } : undefined}>
              <FieldInput
                metaId={meta.id} field={f} required={required(f)} disabled={f.isKey && editing.mode === 'edit'}
                value={values[f.key] ?? ''} onChange={(value) => setValues((v) => ({ ...v, [f.key]: value }))}
              />
            </Box>
          ))}
          {batch && (
            <Box sx={{ gridColumn: '1 / -1', display: 'grid', gap: 1.5 }}>
              <Typography variant="subtitle2">Plan codes</Typography>
              {generated ? (
                <>
                  <TextField select size="small" label="No of plan codes" required value={planCount} sx={{ maxWidth: 200 }} onChange={(e) => setPlanCount(Number(e.target.value))}>
                    {Array.from({ length: PLAN_BATCH_MAX }, (_, i) => <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>)}
                  </TextField>
                  <Typography variant="body2" color="text.secondary">Codes are generated from the first letter of the group company.</Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Enter up to {PLAN_BATCH_MAX} plan codes; empty rows are skipped.</Typography>
              )}
              {plans.slice(0, generated ? planCount : PLAN_BATCH_MAX).map((p, i) => (
                <Box key={i} sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' } }}>
                  <TextField
                    size="small" label={`Plan code ${i + 1}`} required={!generated && i === 0} disabled={generated} value={generated ? '(generated)' : p.code}
                    slotProps={{ htmlInput: { maxLength: 4 } }}
                    onChange={(e) => setPlans((all) => all.map((x, j) => j === i ? { ...x, code: e.target.value } : x))}
                  />
                  <TextField
                    size="small" label={`Description ${i + 1}`} value={p.description} slotProps={{ htmlInput: { maxLength: 200 } }}
                    onChange={(e) => setPlans((all) => all.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button variant="contained" onClick={() => { setError(null); setConfirming(true) }} disabled={save.isPending}>Save</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={confirming} busy={save.isPending} title="Save record" message="Do you want to save the record?" onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)} />
    </>
  )
}

const optionText = (o: LookupOption) => o.label ? `${o.value} - ${o.label}` : o.value

/** One input of the record dialog: date picker, drop-down (fixed choices or a code-table list) or text box. */
function FieldInput({ metaId, field: f, value, required, disabled, onChange }: {
  metaId: string; field: LookupField; value: string; required: boolean; disabled: boolean; onChange: (value: string) => void
}) {
  const options = useQuery({ queryKey: ['lookup-options', metaId, f.key], queryFn: () => lookupApi.options(metaId, f.key), enabled: f.hasOptions, staleTime: 60_000 })

  if (f.kind === 'Date') return <DateField label={f.label} required={required} value={value} onChange={onChange} />

  if (f.hasOptions) {
    const list = options.data ?? []
    // A saved code that is no longer in the code table is still shown, so editing a legacy row does not blank it.
    const current = value ? list.find((o) => o.value.toUpperCase() === value.toUpperCase()) ?? { value, label: null } : null
    return (
      <Autocomplete
        size="small" options={list} value={current} disabled={disabled} loading={options.isLoading}
        getOptionLabel={optionText} isOptionEqualToValue={(a, b) => a.value === b.value}
        onChange={(_, o) => onChange(o?.value ?? '')}
        renderInput={(params) => <TextField {...params} label={f.label} required={required} error={options.isError} helperText={options.isError ? 'Could not load the list.' : undefined} />}
      />
    )
  }

  return (
    <TextField
      fullWidth label={f.label} required={required} size="small" value={value}
      select={f.kind === 'Choice'} multiline={f.multiline} minRows={f.multiline ? 3 : undefined} disabled={disabled}
      slotProps={{ htmlInput: { maxLength: f.kind === 'Choice' ? undefined : f.maxLength, inputMode: f.kind === 'Money' ? 'decimal' : f.kind === 'Integer' ? 'numeric' : undefined } }}
      onChange={(e) => onChange(e.target.value)}
    >
      {f.kind === 'Choice' && [
        <MenuItem key="" value="">(none)</MenuItem>,
        ...(f.choices ?? []).map((c, i) => <MenuItem key={c} value={c}>{f.choiceLabels?.[i] ? `${c} - ${f.choiceLabels[i]}` : c}</MenuItem>),
      ]}
    </TextField>
  )
}
