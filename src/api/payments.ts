import { api } from './client'

// Receipt > Payor (legacy FrmReceiptPayor): receipts a payor's cheque against the claims of its bordereaux.
export interface PayorReceiptSearch {
  payor: string | null; claimNoFrom: string | null; claimNoTo: string | null; claimId: string | null; status: string | null; receiptNoFrom: string | null; receiptNoTo: string | null
  receiptDateFrom: string | null; receiptDateTo: string | null; claimDateFrom: string | null; claimDateTo: string | null; bordxDateFrom: string | null; bordxDateTo: string | null
  bordxNoFrom: string | null; bordxNoTo: string | null
}

/** A claim and one of its receipts (none yet when receiptNo is null); received is this receipt's amount, totalReceived all its receipts'. */
export interface PayorReceiptLine {
  caseNumber: string; version: number; bordxNo: string | null; payor: string | null; claimId: string | null; amount: number; received: number; totalReceived: number; outstanding: number
  status: string | null; receiptNo: string | null; receiptDate: string | null; receiptAmount: number | null; accountMonth: number | null; accountYear: number | null; receiptRemark: string | null
  pvNo: string | null; pvDate: string | null; chequeNo: string | null; chequeNoMr: string | null; payChequeDate: string | null; bank: string | null; bankCharge: number | null
  contraCase: string | null; contraVersion: string | null; contraAmount: number | null; gainLoss: number | null; misc: number | null; discount: number | null; writeOff: number | null
  medixReceipt: number | null; caseRemark: string | null; claimDate: string | null; bordxDate: string | null; chequeSentDate: string | null; courierNo: string | null
}
export interface PayorReceiptListing { lines: PayorReceiptLine[]; truncated: boolean }
export interface PayorReceiptOptions { payors: { code: string; name: string }[]; banks: string[]; authorised: boolean }

export interface PayorReceiptHeader {
  receiptDate: string | null; amount: number | null; chequeNo: string | null; chequeNoMr: string | null; payChequeDate: string | null; pvDate: string | null; bank: string | null
  remark: string | null; accountMonth: number | null; accountYear: number | null
}
export interface PayorReceiptClaim {
  caseNumber: string; version: number; paying: number; bankCharge: number | null; contraCase: string | null; contraVersion: string | null; contraAmount: number | null
  gainLoss: number | null; misc: number | null; discount: number | null; writeOff: number | null; medixReceipt: number | null; caseRemark: string | null
}
export interface PayorReceiptResult { receiptNo: string; pvNo: string | null; lines: PayorReceiptLine[] }

/** A bordereau in Receipt > Payor (Manual)'s bordereau mode; status F when every claim is received, P when some are. */
export interface PayorReceiptBordx {
  bordxNo: string; payor: string | null; bordxDate: string | null; claims: number; amount: number; received: number; outstanding: number; status: string | null
  receiptNos: string | null; receiptDate: string | null; chequeNo: string | null; pvNo: string | null
}
export interface PayorReceiptBordxListing { bordereaux: PayorReceiptBordx[]; truncated: boolean }

const url = '/api/receipts/payor'
export const payorReceiptApi = {
  options: () => api.get<PayorReceiptOptions>(`${url}/options`),
  search: (s: PayorReceiptSearch) => api.post<PayorReceiptListing>(`${url}/search`, s),
  save: (header: PayorReceiptHeader, claims: PayorReceiptClaim[]) => api.post<PayorReceiptResult>(url, { header, claims }),
  update: (receiptNo: string, header: PayorReceiptHeader, claim: PayorReceiptClaim) => api.put<PayorReceiptResult>(`${url}/${encodeURIComponent(receiptNo)}`, { header, claim }),
  searchBordx: (s: PayorReceiptSearch) => api.post<PayorReceiptBordxListing>(`${url}/search-bordx`, s),
  /** Receipt > Payor (Manual): the typed receipt number on ticked claims or whole bordereaux. */
  saveManual: (receiptNo: string, pvNo: string | null, header: PayorReceiptHeader, claims: PayorReceiptClaim[] | null, bordereaux: string[] | null) =>
    api.post<PayorReceiptResult>(`${url}/manual`, { receiptNo, pvNo, header, claims, bordereaux }),
  /** Legacy Print PV: the payment voucher (PDF) the receipt paid the hospital with. */
  printVoucher: (pvNo: string) => api.blob(`${url}/voucher/${encodeURIComponent(pvNo)}/voucher.pdf`),
}

export const lineKey = (l: PayorReceiptLine) => `${l.caseNumber}-${l.version}-${l.receiptNo ?? ''}`

/** What a ticked claim pays by default (legacy lstWorksheet_ItemCheck): the whole amount again for a paid claim, else what is outstanding. */
export const defaultPaying = (l: PayorReceiptLine) => (l.status === 'F' ? l.amount : Math.max(l.outstanding, 0))

/** The grid's status: "Full" when what is paid now and before covers the claim; without a payment, the claim's saved status. */
export function statusLabel(l: PayorReceiptLine, paying: number | null): string {
  if (paying !== null) return paying + l.totalReceived >= l.amount ? 'Full' : 'Partial'
  return l.status === 'P' ? 'Partial' : l.receiptNo ? 'Full' : ''
}

/** A claim's details with nothing entered besides the payment. */
export const blankClaim = (l: PayorReceiptLine, paying: number): PayorReceiptClaim => ({
  caseNumber: l.caseNumber, version: l.version, paying, bankCharge: null, contraCase: null, contraVersion: null, contraAmount: null, gainLoss: null, misc: null, discount: null,
  writeOff: null, medixReceipt: null, caseRemark: null,
})

/** A receipted line's details, for editing it. */
export const claimOf = (l: PayorReceiptLine): PayorReceiptClaim => ({
  caseNumber: l.caseNumber, version: l.version, paying: l.received, bankCharge: l.bankCharge, contraCase: l.contraCase, contraVersion: l.contraVersion, contraAmount: l.contraAmount,
  gainLoss: l.gainLoss, misc: l.misc, discount: l.discount, writeOff: l.writeOff, medixReceipt: l.medixReceipt, caseRemark: l.caseRemark,
})

// Payment > To Hospital (legacy FrmPaymentHospital): claims payable to hospitals and their payment vouchers (Payment2HOS); a voucher can be corrected.
export interface HospitalPaymentSearch {
  hospital: string | null; payor: string | null; healthType: string | null; worksheetStatus: string | null; status: string | null; claimNoFrom: string | null; claimNoTo: string | null
  pvNoFrom: string | null; pvNoTo: string | null; withoutPv: boolean; pvDateFrom: string | null; pvDateTo: string | null; sunNoFrom: string | null; sunNoTo: string | null
  sunDateFrom: string | null; sunDateTo: string | null; invoiceNoFrom: string | null; invoiceNoTo: string | null; invoiceDateFrom: string | null; invoiceDateTo: string | null
  claimDateFrom: string | null; claimDateTo: string | null; bordxDateFrom: string | null; bordxDateTo: string | null; mrnFrom: string | null; mrnTo: string | null
}

/** A claim payable to a hospital and one of its vouchers (none yet when pvNo is null); its invoices are listed together. */
export interface HospitalPaymentLine {
  caseNumber: string; version: number; status: string | null; hospital: string | null; invoiceNos: string | null; invoiceDate: string | null; payable: number; paid: number
  totalPaid: number; outstanding: number; payableToMember: number; bordxNo: string | null; memberNumber: string | null; memberName: string | null; admitted: string | null
  discharged: string | null; pvNo: string | null; pvDate: string | null; pvStatus: string | null; chequeNo: string | null; chequeDate: string | null; chequeAmount: number | null
  accountMonth: number | null; accountYear: number | null; remark: string | null; receiptNo: string | null; receiptAmount: number | null; bankCharge: number | null
  gainLoss: number | null; discount: number | null; misc: number | null; contraCase: string | null; contraVersion: string | null; contraAmount: number | null; caseRemark: string | null
  excess: number | null; medixPayment: number | null; approvalStatus: string | null; sunNo: string | null; sunDate: string | null; worksheetStatus: string | null; claimDate: string | null
  bordxDate: string | null; originalInvoiceStatus: string | null; originalInvoiceDate: string | null; payee: string | null; wording: string | null; hospitalPayee: string | null
  mrn: string | null; claimId: string | null; bank: string | null
}
export interface HospitalPaymentListing { lines: HospitalPaymentLine[]; truncated: boolean }
export interface HospitalPaymentOptions { healthTypes: { code: string; name: string }[]; payors: { code: string; name: string }[]; hospitals: { code: string; name: string }[] }
export interface HospitalPaymentHeader {
  pvDate: string | null; pvStatus: string | null; chequeNo: string | null; chequeDate: string | null; chequeAmount: number | null; payee: string | null; remark: string | null
  accountMonth: number | null; accountYear: number | null
}
export interface HospitalPaymentClaim {
  caseNumber: string; version: number; paid: number; bankCharge: number | null; gainLoss: number | null; discount: number | null; misc: number | null; excess: number | null
  medixPayment: number | null; contraCase: string | null; contraVersion: string | null; contraAmount: number | null; caseRemark: string | null
}
export interface HospitalPaymentResult { pvNo: string; lines: HospitalPaymentLine[] }

const hosUrl = '/api/payments/hospital'
/** Payment > Enquiry > Payment To Hospital (FrmEnquiryPaymentHospital, USRAccess 145): the same listing, read only. */
const hosEnquiryUrl = '/api/payments/hospital-enquiry'
export const hospitalPaymentApi = {
  options: (enquiry = false) => api.get<HospitalPaymentOptions>(`${enquiry ? hosEnquiryUrl : hosUrl}/options`),
  search: (s: HospitalPaymentSearch, enquiry = false) => api.post<HospitalPaymentListing>(`${enquiry ? hosEnquiryUrl : hosUrl}/search`, s),
  update: (pvNo: string, header: HospitalPaymentHeader, claim: HospitalPaymentClaim) => api.put<HospitalPaymentResult>(`${hosUrl}/${encodeURIComponent(pvNo)}`, { header, claim }),
  /** Legacy Print PV (the payment voucher), Print CV (the covering letter to the hospital) and Print Cheque (the cheque face), as PDF. */
  print: (pvNo: string, kind: 'voucher' | 'letter' | 'cheque') => api.blob(`${hosUrl}/${encodeURIComponent(pvNo)}/print/${kind}.pdf`),
  /** Legacy Print Cheque Range (frmPrintChequeRange): the voucher series, the unprinted cheques of a range, and printing them (marks them printed). */
  chequeAccounts: () => api.get<ChequeAccount[]>(`${hosUrl}/cheques/accounts`),
  chequeRange: (r: ChequeRangeRequest) => api.post<ChequeRangeListing>(`${hosUrl}/cheques/search`, r),
  printChequeRange: (r: ChequeRangeRequest) => api.postFile(`${hosUrl}/cheques/print`, r),
}

export interface ChequeRangeRequest { accountType: string; chequeNoFrom: string; chequeNoTo: string }
export interface ChequeData {
  chequeNo: string; chequeDate: string | null; amount: number; payee: string | null; wording1: string; wording2: string; accountType: string
  pvNo: string | null; bankAccount: string | null; printed: boolean
}
/** `expected` = the count the cheque numbers imply (null when they are not a numeric series); Print needs `problem` empty. */
export interface ChequeRangeListing { cheques: ChequeData[]; expected: number | null; problem: string | null }
export interface ChequeAccount { accountType: string; bankAccount: string | null; vouchers: number }

export const paymentKey = (l: HospitalPaymentLine) => `${l.caseNumber}-${l.version}-${l.pvNo ?? ''}`

/** The grid's status column (legacy: F Full, P Partial, blank when not paid). */
export const paymentStatusLabel = (status: string | null) => (status === 'F' ? 'Full' : status === 'P' ? 'Partial' : '')

/** The payee the voucher shows: the one saved on it, else the hospital's payee (legacy LvDisplayData). */
export const defaultPayee = (l: HospitalPaymentLine) => l.payee ?? l.hospitalPayee ?? ''

// Payment > Payment Tracking (legacy FrmPaymentTracking, report type Hospital): hospital payment vouchers listed or grouped.
export interface PaymentTrackingSearch {
  report: string; memberNo: string | null; memberName: string | null; healthType: string | null; payor: string | null; claimNoFrom: string | null; claimNoTo: string | null
  hospital: string | null; pvNoFrom: string | null; pvNoTo: string | null; pvDateFrom: string | null; pvDateTo: string | null; dnCnFrom: string | null; dnCnTo: string | null
  amountFrom: number | null; amountTo: number | null; bordxNoFrom: string | null; bordxNoTo: string | null; bordxDateFrom: string | null; bordxDateTo: string | null
  accountMonthFrom: number | null; accountMonthTo: number | null; accountYearFrom: number | null; accountYearTo: number | null; status: string | null
}
export interface PaymentTrackingLine {
  pvNo: string | null; pvDate: string | null; paid: number; memberNumber: string | null; memberName: string | null; bordxNo: string | null; bordxDate: string | null
  caseNumber: string; version: string; hospital: string | null; payor: string | null; healthType: string | null; dnCn: string | null; remark: string | null; status: string | null
  accountMonth: number | null; accountYear: number | null
}
export interface PaymentTrackingGroup { key: string | null; date: string | null; cases: number; paid: number }
export interface PaymentTrackingResult { report: string; lines: PaymentTrackingLine[]; groups: PaymentTrackingGroup[]; count: number; total: number; truncated: boolean }
export interface PaymentTrackingOptions { payors: { code: string; name: string }[]; hospitals: { code: string; name: string }[] }

/** The legacy "Report" choices: the first column of a grouped report, and whether it also groups by a date. */
export const trackingReports: { value: string; label: string; key: string; date: string | null }[] = [
  { value: 'general', label: 'General Listing', key: '', date: null },
  { value: 'bordx', label: 'By Bordx', key: 'Bordx No', date: 'Bordx Date' },
  { value: 'claim', label: 'By Claim', key: 'Claim No', date: null },
  { value: 'hospital', label: 'By Hospital', key: 'Hospital', date: 'PV Date' },
  { value: 'member', label: 'By Member', key: 'Member No', date: null },
  { value: 'payor', label: 'By Payor', key: 'Payor', date: 'PV Date' },
  { value: 'pv', label: 'By PV No', key: 'PV No', date: 'PV Date' },
  { value: 'hospital-summary', label: 'Summary By Hospital', key: 'Hospital', date: null },
]

const trackUrl = '/api/payments/tracking'
export const paymentTrackingApi = {
  options: () => api.get<PaymentTrackingOptions>(`${trackUrl}/options`),
  search: (s: PaymentTrackingSearch) => api.post<PaymentTrackingResult>(`${trackUrl}/search`, s),
}
