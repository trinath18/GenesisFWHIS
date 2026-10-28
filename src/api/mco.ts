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
