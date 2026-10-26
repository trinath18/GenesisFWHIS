import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { lookupApi, type LookupMeta, type LookupRow } from '../../api/lookups'
import { ConfirmDialog } from '../../components/ConfirmDialog'

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
            <TableRow>{meta.fields.map((f) => <TableCell key={f.key}>{f.label}</TableCell>)}<TableCell align="right">Actions</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {(rows.data ?? []).map((row) => (
              <TableRow key={row.key} hover>
                {meta.fields.map((f) => <TableCell key={f.key}>{row.values[f.key]}</TableCell>)}
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

  const save = useMutation({
    mutationFn: () => editing.mode === 'add' ? lookupApi.create(meta.id, values) : lookupApi.update(meta.id, editing.row.key, values),
    onSuccess: () => onSaved(editing.mode === 'add' ? 'Record saved.' : 'Record updated.'),
    onError: (e) => { setError((e as Error).message); setConfirming(false) },
  })

  return (
    <>
      <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>{editing.mode === 'add' ? 'Add' : 'Edit'} - {meta.title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          {meta.fields.map((f) => (
            <TextField
              key={f.key} label={f.label} required={f.required} size="small" value={values[f.key] ?? ''}
              disabled={f.isKey && editing.mode === 'edit'} slotProps={{ htmlInput: { maxLength: f.maxLength } }}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          ))}
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
