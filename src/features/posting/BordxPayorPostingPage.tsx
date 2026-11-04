import { Box } from '@mui/material'
import { postingApi, type BordxPayorPostingSearch } from '../../api/posting'
import { CodeChoice, DateRange, PostedFilters, PostingScreen, TextRange } from './PostingScreen'

const blank: BordxPayorPostingSearch = {
  payor: null, bordxNoFrom: null, bordxNoTo: null, bordxDateFrom: null, bordxDateTo: null,
  posted: false, postDateFrom: null, postDateTo: null, batchFrom: null, batchTo: null,
}

/**
 * Legacy: A/C Export > Bordx > Payor (frmPostingBordxInv2Pay, "Posting - Bordx Invoice to Payor"). Each bordereau of non-Sihat claims is a BI
 * journal with, for every claim, a debit of the payor's account code for the bordereau amount, a credit of 6000 + payor for it less the case
 * management fees and a credit of 1030 for the fees. The posted journal is exported as "<batch> BI-PAYOR <bordx date from>-<day of bordx date to>".
 */
export function BordxPayorPostingPage() {
  return (
    <PostingScreen<BordxPayorPostingSearch>
      title="Posting - Bordx Invoice to Payor" queryKey="posting-bordx-payor-options" api={postingApi.bordxPayor} blank={blank} listFileName="bordx-invoice-to-payor"
      debitLabel="DR Amt" postProblem={() => null}
      postedFileName={(batch, s) => `${batch} BI-PAYOR ${(s.bordxDateFrom ?? '').replaceAll('-', '')}-${(s.bordxDateTo ?? '').slice(8, 10)}`}
      filters={(s, set, o) => (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Box>
            <CodeChoice label="Payor" value={s.payor} items={o?.payors ?? []} onChange={(v) => set({ payor: v })} />
            <TextRange label="Bordx No. from" from={s.bordxNoFrom} to={s.bordxNoTo} max={20} onFrom={(v) => set({ bordxNoFrom: v })} onTo={(v) => set({ bordxNoTo: v })} />
            <DateRange label="Bordx Date from" from={s.bordxDateFrom} to={s.bordxDateTo} onFrom={(v) => set({ bordxDateFrom: v })} onTo={(v) => set({ bordxDateTo: v })} />
          </Box>
          <Box><PostedFilters s={s} set={set} /></Box>
        </Box>
      )} />
  )
}
