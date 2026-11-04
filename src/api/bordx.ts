import { api } from './client'

// Claim Bordx > Worksheet > Insert Worksheet (legacy FrmWksBordx): closed claims not yet on a bordereau are put on a new one.
export interface PendingBordxSearch {
  claimNo: string | null; version: number | null; admittedFrom: string | null; admittedTo: string | null; dischargedFrom: string | null; dischargedTo: string | null
  noAdmitDate: boolean; noDischargeDate: boolean
}
/** A claim waiting for a bordereau; `problem` says why it cannot be ticked (legacy tick checks). */
export interface PendingBordxClaim {
  caseNumber: string; version: number; payor: string | null; payTo: string | null; payableToHospital: number; totalApproved: number; bordxAmount: number
  admitted: string | null; discharged: string | null; patient: string | null; hospital: string | null; groupCompany: string | null; plan: string | null; icd: string | null
  btbg: string; claimability: string | null; claimDate: string | null; problem: string | null
}
export interface PendingBordxListing { claims: PendingBordxClaim[]; totalApproved: number; truncated: boolean }
export type BordxOption = 'Multiple' | 'Single'
export interface CreatedBordx { bordxNo: string; payor: string; status: string; claims: number; amount: number }
export interface CreatedBordxClaim { caseNumber: string; version: number; bordxNo: string; bordxDate: string; amount: number }
export interface CreateBordxResult { bordereaux: CreatedBordx[]; claims: CreatedBordxClaim[] }

// Claim Bordx > Worksheet > Remove Worksheet (legacy FrmBordxRevise): take claims off a bordereau that has not been sent.
export interface BordxReviseClaim {
  caseNumber: string; version: number; openDate: string | null; memberNumber: string | null; patient: string | null; admitted: string | null; discharged: string | null
  totalApproved: number; caseStatus: string | null; bordxAmount: number
}
export interface BordxRevise { bordxNo: string; bordxDate: string | null; printedDate: string | null; amount: number; noOfClaims: number; sent: boolean; claims: BordxReviseClaim[] }

const url = '/api/bordx/insert-worksheet'
export const insertWorksheetApi = {
  pending: (s: PendingBordxSearch) => api.post<PendingBordxListing>(`${url}/pending`, s),
  create: (option: BordxOption, claims: { caseNumber: string; version: number }[]) => api.post<CreateBordxResult>(url, { option, claims }),
}

const reviseUrl = '/api/bordx/remove-worksheet'
export const removeWorksheetApi = {
  get: (bordxNo: string) => api.get<BordxRevise>(`${reviseUrl}/${encodeURIComponent(bordxNo)}`),
  remove: (bordxNo: string, claims: { caseNumber: string; version: number }[]) => api.post<BordxRevise>(`${reviseUrl}/${encodeURIComponent(bordxNo)}/remove`, { claims }),
}

export const claimKey = (c: { caseNumber: string; version: number }) => `${c.caseNumber}-${c.version}`

/**
 * Why the ticked claims cannot go on one bordereau in Multiple mode (the number comes from the payor, the status from the pay-to), or null.
 * Single mode puts each claim on its own bordereau, so anything goes.
 */
export function mixProblem(option: BordxOption, claims: PendingBordxClaim[]): string | null {
  if (option === 'Single' || claims.length < 2) return null
  if (new Set(claims.map((c) => c.caseNumber.slice(0, 2).toUpperCase())).size > 1) return 'The ticked claims belong to different payors: put them on separate bordereaux.'
  if (new Set(claims.map((c) => (c.payTo === 'H' ? 'C' : 'R'))).size > 1) return 'The ticked claims mix hospital and member payments: put them on separate bordereaux.'
  return null
}
