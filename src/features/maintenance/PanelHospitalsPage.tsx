import { Alert, Autocomplete, Box, Button, Checkbox, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { panelHospitalsApi, type HospitalPanel } from '../../api/panelHospitals'
import { ConfirmDialog } from '../../components/ConfirmDialog'

/** Legacy: Maintenance > Panel Hospital Maintenance. Untick members to remove them, tick hospitals from the second list to add them. */
export function PanelHospitalsPage() {
  const queryClient = useQueryClient()
  const panels = useQuery({ queryKey: ['panels'], queryFn: panelHospitalsApi.panels })
  const [panel, setPanel] = useState<HospitalPanel | null>(null)
  const [search, setSearch] = useState('')
  const [remove, setRemove] = useState<Set<string>>(new Set())
  const [add, setAdd] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const code = panel?.code ?? ''
  const members = useQuery({ queryKey: ['panel-members', code], queryFn: () => panelHospitalsApi.members(code), enabled: !!code })
  const available = useQuery({ queryKey: ['panel-available', code, search], queryFn: () => panelHospitalsApi.available(code, search), enabled: !!code })

  const save = useMutation({
    mutationFn: () => panelHospitalsApi.apply(code, { add: [...add], remove: [...remove] }),
    onSuccess: (r) => {
      setMessage({ severity: 'success', text: `Record updated: ${r.added} added, ${r.refreshed} already on the panel, ${r.removed} removed.` })
      setAdd(new Set()); setRemove(new Set()); setConfirming(false)
      void queryClient.invalidateQueries({ queryKey: ['panel-members', code] })
      void queryClient.invalidateQueries({ queryKey: ['panel-available', code] })
    },
    onError: (e) => { setMessage({ severity: 'error', text: (e as Error).message }); setConfirming(false) },
  })

  const choose = (p: HospitalPanel | null) => { setPanel(p); setAdd(new Set()); setRemove(new Set()); setMessage(null); setSearch('') }
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); setter(n) }
  const changes = add.size + remove.size

  return (
    <>
      <Typography variant="h5" gutterBottom>Panel Hospital Maintenance</Typography>
      <Autocomplete
        size="small" sx={{ maxWidth: 480, mb: 2 }} options={panels.data ?? []} value={panel} loading={panels.isLoading}
        getOptionLabel={(p) => p.code} isOptionEqualToValue={(a, b) => a.code === b.code} onChange={(_, v) => choose(v)}
        renderInput={(params) => <TextField {...params} label="Hospital panel code" />}
      />
      {panels.error && <Alert severity="error">{(panels.error as Error).message}</Alert>}
      {message && <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert>}
      {!panel && <Typography color="text.secondary">Select a hospital panel code.</Typography>}
      {panel && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>Hospitals on this panel ({members.data?.length ?? 0}) - untick to remove</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell padding="checkbox" />{['Code', 'Hospital', 'Telephone', 'Fax', 'Town', 'State'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {(members.data ?? []).map((m) => (
                    <TableRow key={m.hospitalCode} hover>
                      <TableCell padding="checkbox"><Checkbox checked={!remove.has(m.hospitalCode)} onChange={() => toggle(remove, setRemove, m.hospitalCode)} slotProps={{ input: { 'aria-label': `Keep ${m.hospitalCode}` } }} /></TableCell>
                      <TableCell>{m.hospitalCode}</TableCell><TableCell>{m.name}</TableCell><TableCell>{m.telephone}</TableCell><TableCell>{m.fax}</TableCell><TableCell>{m.town}</TableCell><TableCell>{m.state}</TableCell>
                    </TableRow>
                  ))}
                  {members.data?.length === 0 && <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No hospitals on this panel yet.</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <Box>
            <Typography variant="subtitle1" gutterBottom>Add hospitals - tick to add</Typography>
            <TextField size="small" label="Search hospitals" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 1, width: 320 }} />
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell padding="checkbox" />{['Code', 'Hospital', 'Telephone', 'Fax'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {(available.data ?? []).map((h) => (
                    <TableRow key={h.hospitalCode} hover>
                      <TableCell padding="checkbox"><Checkbox checked={add.has(h.hospitalCode)} onChange={() => toggle(add, setAdd, h.hospitalCode)} slotProps={{ input: { 'aria-label': `Add ${h.hospitalCode}` } }} /></TableCell>
                      <TableCell>{h.hospitalCode}</TableCell><TableCell>{h.name}</TableCell><TableCell>{h.telephone}</TableCell><TableCell>{h.fax}</TableCell>
                    </TableRow>
                  ))}
                  {available.data?.length === 0 && <TableRow><TableCell colSpan={5}><Typography color="text.secondary">No other hospitals match.</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button variant="contained" disabled={changes === 0 || save.isPending} onClick={() => setConfirming(true)}>Update</Button>
            <Button disabled={changes === 0} onClick={() => { setAdd(new Set()); setRemove(new Set()) }}>Reset</Button>
            <Typography variant="body2" color="text.secondary">{add.size} to add, {remove.size} to remove</Typography>
          </Box>
        </Box>
      )}
      <ConfirmDialog
        open={confirming} busy={save.isPending} title="Update panel"
        message={`Do you want to update ${code}? ${add.size} hospital(s) will be added and ${remove.size} removed.`}
        onConfirm={() => save.mutate()} onCancel={() => setConfirming(false)}
      />
    </>
  )
}
