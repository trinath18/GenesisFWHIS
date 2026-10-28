import { api } from './client'

export interface McoPayor { code: string; name: string | null; cancelledOnly: boolean }
export interface McoRefundRow {
  memberNumber: string; coverId: string; policyNo: string | null; name: string | null; icBcPp: string | null; status: string | null; bordxDate: string | null; payorEffective: string | null; payorExpiry: string | null
  daysInsured: number | null; endorsementEffective: string | null; endorsementBordx: string | null; daysUtilised: number | null; monthsUtilised: number | null; mcoFee: number | null; mcoUtilised: number | null
  mcoRefund: number | null; totalCases: number; creditNote: string | null; creditNoteDate: string | null; invoiceNo: string | null; invoiceDate: string | null
}
export interface McoRefundListing { rows: McoRefundRow[]; totalRefund: number; truncated: boolean; cancelledOnly: boolean }

const base = '/api/mco/refund-listing'

export const mcoApi = {
  payors: () => api.get<McoPayor[]>(`${base}/payors`),
  refundListing: (q: { payor: string; dateBy: string; from: string; to: string; printStatus: string }) =>
    api.get<McoRefundListing>(`${base}?${new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString()}`),
  refundSupplementary: (memberNumber: string) => api.get<McoRefundRow[]>(`${base}/supplementary?memberNumber=${encodeURIComponent(memberNumber)}`),
}

export interface FwhsInvoiceRow { kind: string; policyNo: string | null; date: string | null; batchNo: string | null; workers: number; fee: number; tax: number; total: number; invoiceNo: string | null; invoiceDate: string | null; invoiceBy: string | null }
export interface FwhsInvoiceListing { payorName: string; billingMode: string; medixTax: boolean; rows: FwhsInvoiceRow[]; totalWorkers: number; totalFee: number; totalTax: number; total: number; truncated: boolean }
export interface FwhsInvoiceQuery { payor: string; mode: 'new' | 'reprint'; from: string; to: string; invoiceNo: string; tax: string }

export const fwhsInvoiceApi = {
  list: (q: FwhsInvoiceQuery) => api.get<FwhsInvoiceListing>(`/api/mco/fwhs-invoice?${new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString()}`),
  invoice: (q: FwhsInvoiceQuery) => api.post<{ invoiceNo: string; rowsInvoiced: number; listing: FwhsInvoiceListing }>('/api/mco/fwhs-invoice', { payor: q.payor, mode: 'new', from: q.from || null, to: q.to || null, invoiceNo: null, tax: q.tax }),
}

export interface McoManualFilter { payor: string; memberFrom: string | null; memberTo: string | null; bordxFrom: string | null; bordxTo: string | null; batchFrom: number | null; batchTo: number | null }
export interface McoManualRow { memberNumber: string; coverId: string; bordxDate: string | null; batchNo: number | null; mco: number }
export interface McoManualListing { rows: McoManualRow[]; totalMco: number; hasZeroMco: boolean; truncated: boolean }

export const mcoManualApi = {
  search: (f: McoManualFilter) => api.post<McoManualListing>('/api/mco/manual-invoice/search', f),
  update: (filter: McoManualFilter, invoiceNo: string, invoiceDate: string) => api.post<{ updated: number; invoiceNo: string }>('/api/mco/manual-invoice/update', { filter, invoiceNo, invoiceDate }),
}

export interface McoCorrectionRow { memberNumber: string; coverId: string; name: string | null; bordxDate: string | null; batchNo: number | null; invoiceNo: string | null; invoiceDate: string | null; mco: number | null; payorEffective: string | null; payorExpiry: string | null }
export interface McoCorrectionListing { rows: McoCorrectionRow[]; truncated: boolean }

export const mcoCorrectionApi = {
  search: (f: McoManualFilter) => api.post<McoCorrectionListing>('/api/mco/correction/search', f),
  update: (items: { memberNumber: string; coverId: string }[], fee: number) => api.post<{ updated: number; fee: number }>('/api/mco/correction/update', { items, fee }),
}

export interface McoReceiptInvoice { number: string; date: string | null; total: number; payor: string; kind: 'Invoice' | 'CreditNote'; receiptLines: number; received: number; receiptNo: string | null }
export interface McoReceiptRow { kind: 'M' | 'O'; index: number; receiptNo: string; receiptDate: string | null; amount: number | null; type: string; invoiceNo: string | null; invoiceDate: string | null; allocated: number | null; chequeNo: string | null; chequeDate: string | null; accountCode: string | null; remarks: string | null; updatedBy: string | null }
export interface McoReceiptRequest { type: string; receiptNo: string | null; receiptDate: string | null; amount: number | null; chequeNo: string | null; chequeDate: string | null; remarks: string | null; accountCode: string | null; invoices: string[] | null }

const rb = '/api/mco/receipts'
export const mcoReceiptApi = {
  payors: () => api.get<McoPayor[]>(`${rb}/payors`),
  invoices: (q: Record<string, string>) => api.get<{ rows: McoReceiptInvoice[]; truncated: boolean }>(`${rb}/invoices?${new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString()}`),
  list: (q: Record<string, string>) => api.get<{ rows: McoReceiptRow[]; totalAmount: number; truncated: boolean }>(`${rb}?${new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString()}`),
  create: (r: McoReceiptRequest, manual: boolean) => api.post<{ receiptNo: string; lines: number; allocated: number; difference: number }>(manual ? `${rb}/manual` : rb, r),
  update: (kind: string, index: number, u: { receiptDate: string | null; amount: number | null; chequeNo: string | null; chequeDate: string | null; remarks: string | null; allocated: number | null }) => api.put<{ updated: boolean }>(`${rb}/${kind}/${index}`, u),
  remove: (kind: string, index: number) => api.delete<{ deleted: boolean }>(`${rb}/${kind}/${index}`),
}

export interface McoReinstatementRow { memberNumber: string; coverId: string; name: string | null; relation: string; bordxDate: string | null; batch: string | null; policyNo: string | null; payorEffective: string | null; payorExpiry: string | null; type: string | null; lapsedDate: string | null; reinstateDate: string | null; invoiceNo: string | null; invoiceDate: string | null; invoiceBy: string | null; mcoFee: number | null }
export interface McoReinstatementListing { rows: McoReinstatementRow[]; totalPrincipal: number; totalSupplementary: number; totalFee: number; invoiced: boolean; truncated: boolean }
export interface McoReinstatementQuery { mode: 'batch' | 'invoice'; payor: string; bordxDate: string; batchNo: string; invoiceNo: string }

export const mcoReinstatementApi = {
  payors: () => api.get<McoPayor[]>('/api/mco/reinstatement/payors'),
  list: (q: McoReinstatementQuery) => api.get<McoReinstatementListing>(`/api/mco/reinstatement?${new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString()}`),
  invoice: (q: McoReinstatementQuery) => api.post<{ invoiceNo: string; rowsInvoiced: number; listing: McoReinstatementListing }>('/api/mco/reinstatement/invoice', { mode: 'batch', payor: q.payor, bordxDate: q.bordxDate || null, batchNo: q.batchNo ? Number(q.batchNo) : null, invoiceNo: null }),
}

export interface McoDateFilter extends McoManualFilter { invoiceFrom: string | null; invoiceTo: string | null }
export const mcoDateCorrectionApi = {
  search: (f: McoDateFilter) => api.post<McoCorrectionListing>('/api/mco/date-correction/search', f),
  update: (items: { memberNumber: string; coverId: string }[], invoiceDate: string, batchNo: number | null) => api.post<{ updated: number; invoiceDate: string; batchNo: number | null }>('/api/mco/date-correction/update', { items, invoiceDate, batchNo }),
}
