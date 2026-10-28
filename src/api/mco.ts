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
