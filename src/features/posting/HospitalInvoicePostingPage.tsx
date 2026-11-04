import { Autocomplete, Box, TextField } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { CaseOption } from '../../api/caseRegistration'
import { postingApi, type HospitalInvoicePostingSearch } from '../../api/posting'
import { LegacyRow } from '../../components/LegacyForm'
import { legacyBox as box } from '../../components/legacyStyles'
import { Choice, CodeChoice, DateRange, PostedFilters, PostingScreen, TextRange } from './PostingScreen'

const blank: HospitalInvoicePostingSearch = {
  healthType: null, payor: null, hospital: null, bordxFrom: null, bordxTo: null, invoiceDateFrom: null, invoiceDateTo: null, invoiceNoFrom: null, invoiceNoTo: null,
  bordxed: true, posted: false, postDateFrom: null, postDateTo: null, batchFrom: null, batchTo: null,
}

function HospitalPicker({ onChange }: { onChange: (code: string | null) => void }) {
  const [search, setSearch] = useState('')
  const [pick, setPick] = useState<CaseOption | null>(null)
  const hospitals = useQuery({ queryKey: ['posting-hospitals', search], queryFn: () => postingApi.invoiceHospital.hospitals(search), enabled: search.trim().length >= 2 })
  return (
    <Autocomplete size="small" fullWidth options={hospitals.data ?? (pick ? [pick] : [])} value={pick} filterOptions={(x) => x}
      getOptionLabel={(o) => `${o.code} - ${o.name}`} isOptionEqualToValue={(a, b) => a.code === b.code}
      onInputChange={(_, v, reason) => { if (reason === 'input') setSearch(v) }} onChange={(_, v) => { setPick(v); onChange(v?.code ?? null) }}
      noOptionsText={search.trim().length < 2 ? 'Type 2+ characters' : 'No hospitals'} renderInput={(p) => <TextField {...p} sx={box} placeholder="All hospitals" />} />
  )
}

/**
 * Legacy: A/C Export > Invoice > Hospital (frmPostingInvoiceHosp, "Hospital Invoice Posting"). Each claim paid to a hospital is a journal pair (RC:
 * debit 6000 + payor, credit the hospital's account code); a claim whose hospital has no account code cannot be posted. The posted journal is exported
 * as "<batch> RC-HospInv <invoice date to>".
 */
export function HospitalInvoicePostingPage() {
  return (
    <PostingScreen<HospitalInvoicePostingSearch>
      title="Hospital Invoice Posting" queryKey="posting-invoice-hospital-options" api={postingApi.invoiceHospital} blank={blank} listFileName="hospital-invoice-posting"
      postProblem={(s) => (!s.invoiceDateTo ? 'Please Enter Invoice Date(To)' : !s.bordxed ? 'Please Change Bordx Status' : null)}
      postedFileName={(batch, s) => `${batch} RC-HospInv ${(s.invoiceDateTo ?? '').replaceAll('-', '')}`}
      filters={(s, set, o) => (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Box>
            <CodeChoice label="Health Type" value={s.healthType} items={o?.healthTypes ?? []} onChange={(v) => set({ healthType: v })} />
            <CodeChoice label="Payor" value={s.payor} items={o?.payors ?? []} onChange={(v) => set({ payor: v })} />
            <LegacyRow label="Hospital" w={140}><HospitalPicker onChange={(v) => set({ hospital: v })} /></LegacyRow>
            <DateRange label="Bordx Date from" from={s.bordxFrom} to={s.bordxTo} onFrom={(v) => set({ bordxFrom: v })} onTo={(v) => set({ bordxTo: v })} />
            <DateRange label="Invoice Date from" from={s.invoiceDateFrom} to={s.invoiceDateTo} onFrom={(v) => set({ invoiceDateFrom: v })} onTo={(v) => set({ invoiceDateTo: v })} />
          </Box>
          <Box>
            <TextRange label="Invoice No. from" from={s.invoiceNoFrom} to={s.invoiceNoTo} max={40} onFrom={(v) => set({ invoiceNoFrom: v })} onTo={(v) => set({ invoiceNoTo: v })} />
            <Choice label="Bordx Status" value={s.bordxed ? '1' : '0'} items={[['0', '0 - No'], ['1', '1 - Yes']]} onChange={(v) => set({ bordxed: v === '1' })} />
            <PostedFilters s={s} set={set} />
          </Box>
        </Box>
      )} />
  )
}
