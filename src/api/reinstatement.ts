import { api } from './client'

export interface ReinstatementCovered { coverId: string; name: string | null; adultChild: string | null; ageBand: string | null; sex: string | null }
export interface ReinstatementMember {
  memberNumber: string; name: string | null; policyNo: string | null; status: string | null; effectiveDate: string | null; expiryDate: string | null
  finalExpiryDate: string | null; lapsedDate: string | null; insurer: string | null; plan: string | null; health: string | null; payor: string | null
  coveredPersons: ReinstatementCovered[]; canReinstate: boolean; hasSupplementary: boolean
}
export interface ReinstatementRequest { memberNumber: string; endorsementBordxDate: string | null; reinstateDate: string | null; batchNo: number | null }
export interface ReinstatementQuote { member: ReinstatementMember; lines: { coverId: string; premium: number; mcoFee: number }[]; totalPremium: number; totalMcoFee: number }
export interface ReinstatementResult { linesWritten: number; totalPremium: number; totalMcoFee: number; crossReferenceUpdated: boolean }

const base = '/api/membership/reinstatement'

export const reinstatementApi = {
  get: (memberNumber: string) => api.get<ReinstatementMember>(`${base}?memberNumber=${encodeURIComponent(memberNumber.trim())}`),
  quote: (r: ReinstatementRequest) => api.post<ReinstatementQuote>(`${base}/quote`, r),
  reinstate: (r: ReinstatementRequest) => api.post<ReinstatementResult>(base, r),
}
