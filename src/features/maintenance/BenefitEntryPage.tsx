import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { benefitApi, type BenefitLine } from '../../api/benefits'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { LegacyEm } from '../../components/LegacyForm'

const hasValue = (l: BenefitLine) => l.days !== null || !!l.amount?.trim() || !!l.perDisability?.trim()

/** Legacy: Maintenance > Benefits > Benefit Entry. Pick health type, insured type, plan and effective date, then enter the benefits of every sub category in the grid. */
export function BenefitEntryPage() {
  const options = useQuery({ queryKey: ['benefit-options'], queryFn: benefitApi.options })
  const [k, setK] = useState({ health: '', insured: '', plan: '', effectiveDate: '' })
  const [lines, setLines] = useState<BenefitLine[] | null>(null)
  const [exists, setExists] = useState(false)
  const [confirm, setConfirm] = useState<'save' | 'delete' | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null)
  const plans = (options.data?.plans ?? []).filter((p) => !k.health || p.health === k.health)
  const fail = (e: unknown) => { setConfirm(null); setMessage({ severity: 'error', text: (e as Error).message }) }
  const complete = () => !!(k.health && k.insured && k.plan && k.effectiveDate)
  const request = () => ({ ...k, lines: (lines ?? []).map((l) => ({ code: l.code, days: l.days, amount: l.amount?.trim() || null, perDisability: l.perDisability?.trim() || null })) })

  const search = useMutation({
    mutationFn: () => benefitApi.entry(k),
    onSuccess: (e) => { setLines(e.lines); setExists(e.exists); setMessage(e.exists ? null : { severity: 'info', text: 'No benefits are stored for this plan, insured type and effective date yet. Enter them and Save to add.' }) },
    onError: fail,
  })
  const save = useMutation({
    mutationFn: () => (exists ? benefitApi.update(request()) : benefitApi.add(request())),
    onSuccess: (e) => { setConfirm(null); setLines(e.lines); setExists(true); setMessage({ severity: 'success', text: exists ? 'Record Updated...' : 'Record Saved...' }) },
    onError: fail,
  })
  const remove = useMutation({
    mutationFn: () => benefitApi.remove(k),
    onSuccess: () => { setConfirm(null); setLines(null); setExists(false); setMessage({ severity: 'success', text: 'Record Deleted...' }) },
    onError: fail,
  })
  const edit = (code: string, patch: Partial<BenefitLine>) => setLines((l) => (l ?? []).map((x) => (x.code === code ? { ...x, ...patch } : x)))
  const clear = () => { setK({ health: '', insured: '', plan: '', effectiveDate: '' }); setLines(null); setExists(false); setMessage(null) }
  const total = (lines ?? []).filter(hasValue).length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5 }}>
      <Typography variant="h5">Benefits Maintenance - Benefit Entry</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5 }}>
        <TextField select size="small" required label="Health Type" value={k.health} onChange={(e) => { setK({ ...k, health: e.target.value, plan: '' }); setLines(null) }}>
          {(options.data?.healthPlans ?? []).map((h) => <MenuItem key={h.code} value={h.code}>{h.code} - {h.description}</MenuItem>)}
        </TextField>
        <TextField select size="small" required label="Plan Code" value={k.plan} onChange={(e) => { setK({ ...k, plan: e.target.value }); setLines(null) }}>
          {plans.map((p) => <MenuItem key={p.code} value={p.code}>{p.code}</MenuItem>)}
        </TextField>
        <TextField select size="small" required label="Insured Type" value={k.insured} onChange={(e) => { setK({ ...k, insured: e.target.value }); setLines(null) }}>
          {(options.data?.insured ?? []).map((i) => <MenuItem key={i.code} value={i.code}>{i.code} - {i.description}</MenuItem>)}
        </TextField>
        <DateField label="Eff Date" required value={k.effectiveDate} onChange={(iso) => { setK({ ...k, effectiveDate: iso }); setLines(null) }} />
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 120 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell>Sub Cat Code</TableCell><TableCell>Sub Cat</TableCell><TableCell align="right">Days/Months</TableCell><TableCell align="right">RM (Days/Months)</TableCell><TableCell align="right">RM Per Disability</TableCell></TableRow></TableHead>
          <TableBody>
            {(lines ?? []).map((l) => (
              <TableRow key={l.code} hover>
                <TableCell>{l.code}</TableCell><TableCell>{l.name}</TableCell>
                <TableCell><TextField size="small" variant="standard" type="number" value={l.days ?? ''} onChange={(e) => edit(l.code, { days: e.target.value === '' ? null : Number(e.target.value) })} slotProps={{ htmlInput: { min: 0, max: 32767, style: { textAlign: 'right' } } }} /></TableCell>
                <TableCell><TextField size="small" variant="standard" value={l.amount ?? ''} onChange={(e) => edit(l.code, { amount: e.target.value })} slotProps={{ htmlInput: { maxLength: 30, style: { textAlign: 'right' } } }} /></TableCell>
                <TableCell><TextField size="small" variant="standard" value={l.perDisability ?? ''} onChange={(e) => edit(l.code, { perDisability: e.target.value })} slotProps={{ htmlInput: { maxLength: 30, style: { textAlign: 'right' } } }} /></TableCell>
              </TableRow>
            ))}
            {!lines && <TableRow><TableCell colSpan={5}>Choose health type, plan, insured type and effective date, then Search.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ flexGrow: 1 }}>Bold - Searchable &nbsp; * - Mandatory Fields &nbsp;&nbsp; <LegacyEm>TOTAL RECORDS</LegacyEm> {total}</Typography>
        <Button variant="outlined" disabled={!complete() || search.isPending} onClick={() => { setMessage(null); search.mutate() }}>Search</Button>
        <Button variant="contained" disabled={!lines || !complete() || save.isPending} onClick={() => { setMessage(null); setConfirm('save') }}>Save</Button>
        <Button color="error" variant="outlined" disabled={!exists || remove.isPending} onClick={() => setConfirm('delete')}>Delete</Button>
        <Button variant="outlined" onClick={clear}>Clear</Button>
      </Box>
      <ConfirmDialog open={confirm === 'save'} busy={save.isPending} title="Save benefits" message="Do you want to save this record?" onConfirm={() => save.mutate()} onCancel={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === 'delete'} busy={remove.isPending} title="Delete benefits" message={`Do you want to delete all benefits of plan ${k.plan} (${k.insured}) effective ${k.effectiveDate}? Other effective dates are not touched.`} onConfirm={() => remove.mutate()} onCancel={() => setConfirm(null)} />
    </Box>
  )
}
