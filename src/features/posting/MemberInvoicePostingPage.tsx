import { Box } from '@mui/material'
import { postingApi, type MemberInvoicePostingSearch } from '../../api/posting'
import { Choice, CodeChoice, DateRange, PostedFilters, PostingScreen, TextRange } from './PostingScreen'

const blank: MemberInvoicePostingSearch = {
  healthType: null, payor: null, claimNoFrom: null, claimNoTo: null, claimDateFrom: null, claimDateTo: null, bordxFrom: null, bordxTo: null,
  bordxed: true, posted: false, postDateFrom: null, postDateTo: null, batchFrom: null, batchTo: null, negative: false,
}

/**
 * Legacy: A/C Export > Invoice > Member (frmPostingInvoiceMBM, "Member Invoice Posting"). Each claim paying the member is a journal pair: Post Type
 * P - Positive is MJC (credit 8200 + payor, debit 6000 + payor), N - Negative is MJD with the sides swapped (6200 + payor when the bordereau was
 * reversed). "Claim Reg Date" is the claim's close date, as on the legacy form. The posted journal is exported as "<batch> MJC-Member <date to>".
 */
export function MemberInvoicePostingPage() {
  return (
    <PostingScreen<MemberInvoicePostingSearch>
      title="Member Invoice Posting" queryKey="posting-invoice-member-options" api={postingApi.invoiceMember} blank={blank} listFileName="member-invoice-posting" debitLabel="DR Amt"
      postProblem={(s) => (!s.claimDateTo ? 'Please Enter Invoice Date(To)' : !s.bordxed ? 'Please change Bordx Status' : null)}
      postedFileName={(batch, s) => `${batch} ${s.negative ? 'MJD' : 'MJC'}-Member ${(s.claimDateTo ?? '').replaceAll('-', '')}`}
      filters={(s, set, o) => (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Box>
            <CodeChoice label="Health Type" value={s.healthType} items={o?.healthTypes ?? []} onChange={(v) => set({ healthType: v })} />
            <CodeChoice label="Payor" value={s.payor} items={o?.payors ?? []} onChange={(v) => set({ payor: v })} />
            <DateRange label="Claim Reg Date from" from={s.claimDateFrom} to={s.claimDateTo} onFrom={(v) => set({ claimDateFrom: v })} onTo={(v) => set({ claimDateTo: v })} />
            <TextRange label="Claim No. from" from={s.claimNoFrom} to={s.claimNoTo} max={20} onFrom={(v) => set({ claimNoFrom: v })} onTo={(v) => set({ claimNoTo: v })} />
            <DateRange label="Bordx Date from" from={s.bordxFrom} to={s.bordxTo} onFrom={(v) => set({ bordxFrom: v })} onTo={(v) => set({ bordxTo: v })} />
          </Box>
          <Box>
            <Choice label="Post Type" value={s.negative ? 'N' : 'P'} items={[['P', 'P - Positive'], ['N', 'N - Negative']]} onChange={(v) => set({ negative: v === 'N' })} />
            <Choice label="Bordx Status" value={s.bordxed ? '1' : '0'} items={[['0', '0 - No'], ['1', '1 - Yes']]} onChange={(v) => set({ bordxed: v === '1' })} />
            <PostedFilters s={s} set={set} />
          </Box>
        </Box>
      )} />
  )
}
