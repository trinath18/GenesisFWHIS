import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { byModule, grantedSet, toAccess, userApi, type UserDetail } from '../../api/users'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { formatDate } from '../../lib/format'

const blank = { code: '', name: '', lgCode: '', password: '', group: '', serviceProvider: '', status: 'A', authorised: 'N', dateCreated: '' }
type Form = typeof blank
const formOf = (u: UserDetail): Form => ({ code: u.code, name: u.name, lgCode: u.lgCode ?? '', password: '', group: u.group ?? '', serviceProvider: u.serviceProvider ?? '',
  status: u.status ?? 'A', authorised: u.authorised ?? 'N', dateCreated: u.dateCreated ?? '' })

/**
 * Legacy: Maintenance > Security > User Permission (frmUserPermissionMaintenance). Pick a user to see them; Add or Edit, tick the screens they may open
 * (one check box per legacy access position, grouped by module) and Save. A password is only changed when one is typed.
 */
export function UserPermissionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const options = useQuery({ queryKey: ['user-maintenance-options'], queryFn: userApi.options })
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const users = useQuery({ queryKey: ['users', term], queryFn: () => userApi.list(term) })
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view')
  const [f, setF] = useState<Form>(blank)
  const [granted, setGranted] = useState<Set<number>>(new Set())
  const [confirm, setConfirm] = useState<'save' | 'delete' | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const fail = (e: unknown) => { setConfirm(null); setMessage({ severity: 'error', text: (e as Error).message }) }
  const positions = options.data?.positions ?? []
  const editing = mode !== 'view'

  const show = (u: UserDetail) => { setMode('view'); setF(formOf(u)); setGranted(grantedSet(u.access)) }
  const load = useMutation({ mutationFn: userApi.get, onSuccess: show, onError: fail })
  const save = useMutation({
    mutationFn: () => {
      const r = { code: f.code.trim(), name: f.name, lgCode: f.lgCode || null, password: f.password || null, group: f.group, serviceProvider: f.serviceProvider, status: f.status,
        authorised: f.authorised, access: toAccess(granted, positions.length) }
      return mode === 'add' ? userApi.create(r) : userApi.update(r)
    },
    onSuccess: (u) => {
      setConfirm(null); setMessage({ severity: 'success', text: mode === 'add' ? 'Record Saved...' : 'Record Updated...' }); show(u)
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    }, onError: fail,
  })
  const remove = useMutation({
    mutationFn: () => userApi.remove(f.code),
    onSuccess: () => { setConfirm(null); setMessage({ severity: 'success', text: 'Record Deleted... ' }); setF(blank); setGranted(new Set()); void queryClient.invalidateQueries({ queryKey: ['users'] }) },
    onError: fail,
  })

  const trySave = () => {
    setMessage(null)
    const problem = !f.code.trim() ? 'Please Enter User Code' : !f.name.trim() ? 'Please Enter User Name' : mode === 'add' && !f.password ? 'Please Enter Password'
      : !f.group ? 'Please Enter Department' : !f.serviceProvider ? 'Please Enter Service Provider' : f.password && (f.password.length < 8 || f.password.length > 10) ? 'Password must be 8 to 10 characters.' : null
    if (problem) setMessage({ severity: 'error', text: problem }); else setConfirm('save')
  }
  const setAll = (ps: number[], on: boolean) => setGranted((g) => { const n = new Set(g); for (const p of ps) { if (on) n.add(p); else n.delete(p) } return n })
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const text = (label: string, k: keyof Form, w = 200, opts: { disabled?: boolean; type?: string; max?: number } = {}) => (
    <LegacyRow label={label} w={120}>
      <TextField size="small" type={opts.type} sx={{ ...box, width: w }} value={f[k]} onChange={set(k)} disabled={!editing || opts.disabled} slotProps={{ htmlInput: { maxLength: opts.max } }} />
    </LegacyRow>
  )
  const select = (label: string, k: keyof Form, items: [string, string][], w = 200) => (
    <LegacyRow label={label} w={120}>
      <TextField select size="small" sx={{ ...box, width: w }} value={f[k]} onChange={set(k)} disabled={!editing}>{items.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}</TextField>
    </LegacyRow>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>User Permission Maintenance</LegacyTitle>
      {(options.isError || users.isError) && <Alert severity="error">{((options.error ?? users.error) as Error).message}</Alert>}
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' }, gap: 1, alignItems: 'start' }}>
        <LegacyFrame title="Users">
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" sx={{ ...box, flex: 1 }} placeholder="User code or name" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setTerm(search.trim()) }} />
            <Button size="small" variant="outlined" onClick={() => setTerm(search.trim())}>Search</Button>
          </Box>
          <Paper variant="outlined" sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
              '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& tr.sel td': { bgcolor: 'action.focus' } }}>
              <thead><tr><th>User</th><th>Name</th><th>Dept</th><th>SP</th><th>Status</th><th>Auth</th></tr></thead>
              <tbody>
                {(users.data ?? []).map((u) => (
                  <tr key={u.code} className={u.code === f.code && mode !== 'add' ? 'sel' : undefined} style={{ cursor: 'pointer' }} onClick={() => { if (!editing) { setMessage(null); load.mutate(u.code) } }}>
                    <td>{u.code}</td><td>{u.name}</td><td>{u.group}</td><td>{u.serviceProvider}</td><td>{u.status}</td><td>{u.authorised}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Paper>
          <Typography sx={{ fontSize: 13 }}>{users.data?.length ?? 0} user(s)</Typography>
        </LegacyFrame>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <LegacyFrame title="General">
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', columnGap: 2 }}>
              {text('User Code', 'code', 140, { disabled: mode !== 'add', max: 10 })}
              {text('User Name', 'name', 220, { max: 60 })}
              {text('LG Code', 'lgCode', 140, { max: 10 })}
              {text(mode === 'add' ? 'Password' : 'New Password', 'password', 140, { type: 'password', max: 10 })}
              {select('Department', 'group', (options.data?.groups ?? []).map((g) => [g.code, `${g.code} - ${g.name}`]), 220)}
              {select('Service Provider', 'serviceProvider', (options.data?.serviceProviders ?? []).map((s) => [s.code, `${s.code} - ${s.name}`]), 220)}
              {select('Status', 'status', [['A', 'A - Active'], ['S', 'S - Suspended']], 160)}
              {select('Authorised', 'authorised', [['Y', 'Y - Yes'], ['N', 'N - No']], 160)}
              <LegacyRow label="Date Created" w={120}><TextField size="small" sx={{ ...yellow, width: 140 }} value={formatDate(f.dateCreated)} slotProps={{ input: { readOnly: true } }} /></LegacyRow>
            </Box>
            {editing && mode === 'edit' && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Leave New Password empty to keep the current password.</Typography>}
          </LegacyFrame>

          <LegacyFrame title={`Access (${granted.size} of ${positions.length} screens)`}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" disabled={!editing} onClick={() => setAll(positions.map((p) => p.position), true)}>Check All</Button>
              <Button size="small" variant="outlined" disabled={!editing} onClick={() => setGranted(new Set())}>Uncheck All</Button>
            </Box>
            <Box sx={{ maxHeight: '45vh', overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1 }}>
              {byModule(positions).map(([module, ps]) => (
                <Paper key={module} variant="outlined" sx={{ p: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{module}</Typography>
                    <Button size="small" sx={{ minWidth: 0, fontSize: 11 }} disabled={!editing} onClick={() => setAll(ps.map((p) => p.position), true)}>All</Button>
                    <Button size="small" sx={{ minWidth: 0, fontSize: 11 }} disabled={!editing} onClick={() => setAll(ps.map((p) => p.position), false)}>None</Button>
                  </Box>
                  {ps.map((p) => (
                    <FormControlLabel key={p.position} sx={{ display: 'flex', ml: 0, '& .MuiFormControlLabel-label': { fontSize: 12.5 } }} title={p.usedBy ? `${p.position}: ${p.usedBy}` : String(p.position)}
                      control={<Checkbox size="small" sx={{ p: 0.25 }} checked={granted.has(p.position)} disabled={!editing} onChange={(e) => setAll([p.position], e.target.checked)} />}
                      label={`${p.position} ${p.caption}`} />
                  ))}
                </Paper>
              ))}
            </Box>
          </LegacyFrame>
        </Box>
      </Box>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {!editing && <Button size="small" variant="contained" onClick={() => { setMessage(null); setMode('add'); setF({ ...blank, dateCreated: new Date().toISOString().slice(0, 10) }); setGranted(new Set()) }}>Add</Button>}
          {!editing && <Button size="small" variant="outlined" disabled={!f.code} onClick={() => { setMessage(null); setMode('edit') }}>Edit</Button>}
          {editing && <Button size="small" variant="contained" color="warning" disabled={save.isPending} onClick={trySave}>Save</Button>}
          {editing && <Button size="small" variant="outlined" onClick={() => { setMessage(null); if (mode === 'edit') load.mutate(f.code); else { setMode('view'); setF(blank); setGranted(new Set()) } }}>Cancel</Button>}
          {!editing && <Button size="small" variant="outlined" color="error" disabled={!f.code} onClick={() => { setMessage(null); setConfirm('delete') }}>Delete</Button>}
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>

      <ConfirmDialog open={confirm === 'save'} busy={save.isPending} title="User Permission" message={`Do you want to save the record? ${f.code} with access to ${granted.size} screen(s).`}
        onConfirm={() => save.mutate()} onCancel={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === 'delete'} busy={remove.isPending} title="User Permission" message={`Do you want to delete the record? User ${f.code} (${f.name}) is archived and removed.`}
        confirmLabel="Delete" onConfirm={() => remove.mutate()} onCancel={() => setConfirm(null)} />
    </Box>
  )
}
