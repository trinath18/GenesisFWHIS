import { api } from './client'
import type { CaseOption } from './caseRegistration'

// A/C Export (legacy frmPosting* forms): SUN journal lines, posted in batches into SUNPosting.
export interface PostingOption { code: string; name: string }
export interface PostingWindow { open: boolean; start: string | null; end: string | null; specialAccess: boolean; message: string | null }
export interface PostingOptions { healthTypes: PostingOption[]; payors: PostingOption[]; accountPeriods: string[]; window: PostingWindow }

export interface JournalLine {
  journalType: string; journalSource: string; database: string; transRef: string; accountPeriod: string | null; transDate: string | null; description: string
  accountCode: string; amount: number; debitCredit: 'D' | 'C'; hospital: string | null; groupCompany: string | null; payor: string | null; caseNo: string | null
  productCategory: string | null; bordxRef: string | null; batchNo: string | null
}
/** An item posted as a whole (its debit and credit lines); `problem` says why it cannot be posted. */
export interface PostingItem { key: string; posted: boolean; lines: JournalLine[]; references: string[]; problem: string | null }
export interface PostingJournal { items: PostingItem[]; debit: number; credit: number; truncated: boolean }
export interface PostingResult { batchNo: string; items: number; records: number; journal: PostingJournal }

export interface HospitalInvoicePostingSearch {
  healthType: string | null; payor: string | null; hospital: string | null; bordxFrom: string | null; bordxTo: string | null
  invoiceDateFrom: string | null; invoiceDateTo: string | null; invoiceNoFrom: string | null; invoiceNoTo: string | null
  bordxed: boolean; posted: boolean; postDateFrom: string | null; postDateTo: string | null; batchFrom: string | null; batchTo: string | null
}

/** The search of A/C Export > Invoice > Member; the claim date is the claim's close date, negative is Post Type N. */
export interface MemberInvoicePostingSearch {
  healthType: string | null; payor: string | null; claimNoFrom: string | null; claimNoTo: string | null; claimDateFrom: string | null; claimDateTo: string | null
  bordxFrom: string | null; bordxTo: string | null; bordxed: boolean; posted: boolean; postDateFrom: string | null; postDateTo: string | null
  batchFrom: string | null; batchTo: string | null; negative: boolean
}

/** The search of A/C Export > Payment > Hospital: payment vouchers (PV) to hospitals. */
export interface HospitalPaymentPostingSearch {
  healthType: string | null; payor: string | null; voucherDateFrom: string | null; voucherDateTo: string | null; voucherNoFrom: string | null; voucherNoTo: string | null
  posted: boolean; postDateFrom: string | null; postDateTo: string | null; batchFrom: string | null; batchTo: string | null
}

/** The search of A/C Export > Receipt > Payor: receipts from payors. */
export interface PayorReceiptPostingSearch {
  payor: string | null; receiptDateFrom: string | null; receiptDateTo: string | null; receiptNoFrom: string | null; receiptNoTo: string | null
  posted: boolean; postDateFrom: string | null; postDateTo: string | null; batchFrom: string | null; batchTo: string | null
}

/** The search of A/C Export > Bordx > Payor: bordereaux of non-Sihat claims. */
export interface BordxPayorPostingSearch {
  payor: string | null; bordxNoFrom: string | null; bordxNoTo: string | null; bordxDateFrom: string | null; bordxDateTo: string | null
  posted: boolean; postDateFrom: string | null; postDateTo: string | null; batchFrom: string | null; batchTo: string | null
}

const hosp = '/api/posting/invoice-hospital'
const mbm = '/api/posting/invoice-member'
const payHosp = '/api/posting/payment-hospital'
const recPay = '/api/posting/receipt-payor'
const bordxPay = '/api/posting/bordx-payor'
export const postingApi = {
  invoiceHospital: {
    options: () => api.get<PostingOptions>(`${hosp}/options`),
    hospitals: (search: string) => api.get<CaseOption[]>(`${hosp}/hospitals?search=${encodeURIComponent(search)}`),
    search: (s: HospitalInvoicePostingSearch) => api.post<PostingJournal>(`${hosp}/search`, s),
    post: (search: HospitalInvoicePostingSearch, keys: string[], accountPeriod: string) => api.post<PostingResult>(`${hosp}/post`, { search, keys, accountPeriod }),
  },
  invoiceMember: {
    options: () => api.get<PostingOptions>(`${mbm}/options`),
    search: (s: MemberInvoicePostingSearch) => api.post<PostingJournal>(`${mbm}/search`, s),
    post: (search: MemberInvoicePostingSearch, keys: string[], accountPeriod: string) => api.post<PostingResult>(`${mbm}/post`, { search, keys, accountPeriod }),
  },
  paymentHospital: {
    options: () => api.get<PostingOptions>(`${payHosp}/options`),
    search: (s: HospitalPaymentPostingSearch) => api.post<PostingJournal>(`${payHosp}/search`, s),
    post: (search: HospitalPaymentPostingSearch, keys: string[], accountPeriod: string) => api.post<PostingResult>(`${payHosp}/post`, { search, keys, accountPeriod }),
  },
  receiptPayor: {
    options: () => api.get<PostingOptions>(`${recPay}/options`),
    search: (s: PayorReceiptPostingSearch) => api.post<PostingJournal>(`${recPay}/search`, s),
    post: (search: PayorReceiptPostingSearch, keys: string[], accountPeriod: string) => api.post<PostingResult>(`${recPay}/post`, { search, keys, accountPeriod }),
  },
  bordxPayor: {
    options: () => api.get<PostingOptions>(`${bordxPay}/options`),
    search: (s: BordxPayorPostingSearch) => api.post<PostingJournal>(`${bordxPay}/search`, s),
    post: (search: BordxPayorPostingSearch, keys: string[], accountPeriod: string) => api.post<PostingResult>(`${bordxPay}/post`, { search, keys, accountPeriod }),
  },
}

/** The legacy grid's columns, which are also the columns of the exported journal file. */
export const journalHeaders = ['Chk', 'J/T', 'J/S', 'DB', 'Trans.Ref.', 'AccPeriod', 'Trans.Date', 'Description', 'AccCode', 'Amt', 'D/C', 'Hospital', 'Grp Company', 'Payor', 'Case No', 'Product Cat.', 'Bordx Ref', 'BatchNo']

export function journalRow(item: PostingItem, l: JournalLine, checked: boolean, date: (iso: string | null) => string): (string | number | null)[] {
  return [checked || item.posted ? 'Post' : '', l.journalType, l.journalSource, l.database, l.transRef, l.accountPeriod, date(l.transDate), l.description, l.accountCode,
    l.amount.toFixed(2), l.debitCredit, l.hospital, l.groupCompany, l.payor, l.caseNo, l.productCategory, l.bordxRef, l.batchNo]
}
