import { Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { benefitApi } from '../../api/benefits'
import { DateField } from '../../components/DateField'
import { toDmy } from '../../lib/dates'

/** Legacy: Maintenance > Benefits > Benefits Listing: search the stored benefits by health, insured, plan, date, sub category, payor or group company. */
export function BenefitListingPage() {
  const options = useQuery({ queryKey: ['benefit-options-listing'], queryFn: benefitApi.options })
  const [f, setF] = useState({ health: '', insured: '', plan: '', effectiveDate: '', code: '', payor: '', group: '' })
  const search = useMutation({ mutationFn: () => benefitApi.listing(f) })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const rows = search.data ?? []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5 }}>
      <Typography variant="h5">Benefits Maintenance - Benefits Listing</Typography>
      {search.isError && <Alert severity="error">{(search.error as Error).message}</Alert>}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5, alignItems: 'start' }}>
        <TextField select size="small" label="Health Type" value={f.health} onChange={set('health')}><MenuItem value="">(any)</MenuItem>{(options.data?.healthPlans ?? []).map((h) => <MenuItem key={h.code} value={h.code}>{h.code} - {h.description}</MenuItem>)}</TextField>
        <TextField select size="small" label="Insured Type" value={f.insured} onChange={set('insured')}><MenuItem value="">(any)</MenuItem>{(options.data?.insured ?? []).map((i) => <MenuItem key={i.code} value={i.code}>{i.code} - {i.description}</MenuItem>)}</TextField>
        <TextField size="small" label="Plan Code" value={f.plan} onChange={set('plan')} slotProps={{ htmlInput: { maxLength: 10 } }} />
        <DateField label="Eff Date" value={f.effectiveDate} onChange={(iso) => setF((x) => ({ ...x, effectiveDate: iso }))} />
        <TextField size="small" label="Sub category code" value={f.code} onChange={set('code')} slotProps={{ htmlInput: { maxLength: 10 } }} />
        <TextField size="small" label="Payor" value={f.payor} onChange={set('payor')} slotProps={{ htmlInput: { maxLength: 4 } }} />
        <TextField size="small" label="Group company" value={f.group} onChange={set('group')} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" disabled={search.isPending} onClick={() => search.mutate()}>Search</Button>
          <Button variant="outlined" onClick={() => { setF({ health: '', insured: '', plan: '', effectiveDate: '', code: '', payor: '', group: '' }); search.reset() }}>Clear</Button>
        </Box>
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 120 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell>Sub Cat Code</TableCell><TableCell>Sub Cat</TableCell><TableCell>Health</TableCell><TableCell>Insured</TableCell><TableCell>Plan</TableCell><TableCell>Eff Date</TableCell><TableCell align="right">Days/Months</TableCell><TableCell align="right">RM (Days/Months)</TableCell><TableCell align="right">RM Per Disability</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => <TableRow key={`${r.code}-${r.insured}-${r.plan}-${r.effectiveDate}`} hover><TableCell>{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.health}</TableCell><TableCell>{r.insured}</TableCell><TableCell>{r.plan}</TableCell><TableCell>{toDmy(r.effectiveDate ?? '')}</TableCell><TableCell align="right">{r.days}</TableCell><TableCell align="right">{r.amount}</TableCell><TableCell align="right">{r.perDisability}</TableCell></TableRow>)}
            {search.isSuccess && rows.length === 0 && <TableRow><TableCell colSpan={9}>No records found.</TableCell></TableRow>}
            {!search.isSuccess && <TableRow><TableCell colSpan={9}>Enter criteria (or none for the first 2,000) and Search.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2"><strong style={{ color: '#c62828' }}>TOTAL RECORDS</strong> {rows.length}{rows.length === 2000 ? ' (first 2,000 shown; narrow the search)' : ''}</Typography>
    </Box>
  )
}
