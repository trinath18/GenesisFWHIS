import { Box } from '@mui/material'
import { postingApi, type PayorReceiptPostingSearch } from '../../api/posting'
import { CodeChoice, DateRange, PostedFilters, PostingScreen, TextRange } from './PostingScreen'

const blank: PayorReceiptPostingSearch = {
  payor: null, receiptDateFrom: null, receiptDateTo: null, receiptNoFrom: null, receiptNoTo: null,
  posted: false, postDateFrom: null, postDateTo: null, batchFrom: null, batchTo: null,
}

/**
 * Legacy: A/C Export > Receipt > Payor (frmPostingRecPayor, "Receipt Payor Export"). Each receipt from a payor is a CR journal pair (debit the bank
 * account of the receipt's prefix: RA 7400, RB 7410, RC 7420; credit the payor's account code). FWHS receipts start with RF, for which there is no
 * bank account yet. The posted journal is exported as "<batch> CR-Payor <receipt date from>-<day of receipt date to>".
 */
export function PayorReceiptPostingPage() {
  return (
    <PostingScreen<PayorReceiptPostingSearch>
      title="Receipt Payor Export" queryKey="posting-receipt-payor-options" api={postingApi.receiptPayor} blank={blank} listFileName="receipt-payor-export"
      debitLabel="DR Amt" postProblem={() => null}
      postedFileName={(batch, s) => `${batch} CR-Payor ${(s.receiptDateFrom ?? '').replaceAll('-', '')}-${(s.receiptDateTo ?? '').slice(8, 10)}`}
      filters={(s, set, o) => (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Box>
            <CodeChoice label="Payor" value={s.payor} items={o?.payors ?? []} onChange={(v) => set({ payor: v })} />
            <TextRange label="Receipt No. from" from={s.receiptNoFrom} to={s.receiptNoTo} max={20} onFrom={(v) => set({ receiptNoFrom: v })} onTo={(v) => set({ receiptNoTo: v })} />
            <DateRange label="Receipt Date from" from={s.receiptDateFrom} to={s.receiptDateTo} onFrom={(v) => set({ receiptDateFrom: v })} onTo={(v) => set({ receiptDateTo: v })} />
          </Box>
          <Box><PostedFilters s={s} set={set} /></Box>
        </Box>
      )} />
  )
}
