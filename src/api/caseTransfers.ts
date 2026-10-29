import { api } from './client'

export interface CaseTransferParty { memberNumber: string; coverId: string; policyNo: string | null; status: string | null; icNo: string | null; name: string | null; effectiveDate: string | null; expiryDate: string | null }
export interface CaseTransferResult { caseNumber: string; newCaseNumber: string; message: string; temporaryMemberRemoved: boolean }
export interface CasePayClaimRecord { date: string | null; lab: boolean; confInfo: boolean; infoInv: boolean; covgSub: boolean; nonPan: boolean; nonCash: boolean; othersChecked: boolean; others: string | null; registeredBy: string | null; registered: string | null; updatedBy: string | null; updated: string | null }
export interface CasePayClaimView { caseNumber: string; memberNumber: string; principalName: string; policyNo: string | null; patientName: string; admitted: string | null; discharged: string | null; record: CasePayClaimRecord | null }
export interface CasePayClaimRequest { date: string | null; lab: boolean; confInfo: boolean; infoInv: boolean; covgSub: boolean; nonPan: boolean; nonCash: boolean; othersChecked: boolean; others: string | null }

export const caseTransferApi = (temporary: boolean) => {
  const base = temporary ? '/api/case-temp-transfer' : '/api/case-transfer'
  return {
    current: (c: string) => api.get<CaseTransferParty>(`${base}/case/${encodeURIComponent(c)}`),
    party: (m: string, cover: string) => api.get<CaseTransferParty>(`${base}/member?memberNumber=${encodeURIComponent(m)}&coverId=${encodeURIComponent(cover)}`),
    transfer: (c: string, memberNumber: string, coverId: string) => api.post<CaseTransferResult>(`${base}/${encodeURIComponent(c)}`, { memberNumber, coverId }),
  }
}

const pc = '/api/case-payclaim'
export const casePayClaimApi = {
  get: (c: string) => api.get<CasePayClaimView>(`${pc}/${encodeURIComponent(c)}`),
  save: (c: string, r: CasePayClaimRequest) => api.put<{ updated: boolean }>(`${pc}/${encodeURIComponent(c)}`, r),
  letter: (c: string) => api.blob(`${pc}/${encodeURIComponent(c)}/letter`),
}
