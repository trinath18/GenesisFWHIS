import { Box } from '@mui/material'
import { postingApi, type HospitalPaymentPostingSearch } from '../../api/posting'
import { CodeChoice, DateRange, PostedFilters, PostingScreen, TextRange } from './PostingScreen'

const blank: HospitalPaymentPostingSearch = {
  healthType: null, payor: null, voucherDateFrom: null, voucherDateTo: null, voucherNoFrom: null, voucherNoTo: null,
  posted: false, postDateFrom: null, postDateTo: null, batchFrom: null, batchTo: null,
}

/**
 * Legacy: A/C Export > Payment > Hospital (frmPostingPay2Hosp, "Payment To Hospital Posting"). Each payment voucher to a hospital is a CP journal pair
 * (credit the bank account of the voucher's prefix: CA 7400, CB 7410, CC 7420; debit the hospital's account code). FWHS vouchers start with CF, for
 * which there is no bank account yet. "Exp Status" / "Exp Date" are the legacy names of the post status and post date. The posted journal is exported
 * as "<batch> CP-Hospital <PV date from>-<day of PV date to>".
 */
export function HospitalPaymentPostingPage() {
  return (
    <PostingScreen<HospitalPaymentPostingSearch>
      title="Payment To Hospital Posting" queryKey="posting-payment-hospital-options" api={postingApi.paymentHospital} blank={blank} listFileName="payment-to-hospital-posting"
      debitLabel="DR Amt" postProblem={() => null}
      postedFileName={(batch, s) => `${batch} CP-Hospital ${(s.voucherDateFrom ?? '').replaceAll('-', '')}-${(s.voucherDateTo ?? '').slice(8, 10)}`}
      filters={(s, set, o) => (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Box>
            <CodeChoice label="Health Type" value={s.healthType} items={o?.healthTypes ?? []} onChange={(v) => set({ healthType: v })} />
            <CodeChoice label="Payor" value={s.payor} items={o?.payors ?? []} onChange={(v) => set({ payor: v })} />
            <DateRange label="PV Date from" from={s.voucherDateFrom} to={s.voucherDateTo} onFrom={(v) => set({ voucherDateFrom: v })} onTo={(v) => set({ voucherDateTo: v })} />
            <TextRange label="PV No. from" from={s.voucherNoFrom} to={s.voucherNoTo} max={15} onFrom={(v) => set({ voucherNoFrom: v })} onTo={(v) => set({ voucherNoTo: v })} />
          </Box>
          <Box><PostedFilters s={s} set={set} labels={{ status: 'Exp Status', date: 'Exp Date from', batch: 'Batch No. from' }} /></Box>
        </Box>
      )} />
  )
}
