import { api } from './client'
import type { CoveredPerson, MemberAmendment, MemberDetail, MemberFees, MemberHistory, MemberSearchPage } from './membership'

export interface AdjustmentMember {
  memberNumber: string; name: string | null; policyNo: string | null; icBcPp: string | null; dateOfBirth: string | null; sex: string | null
  address1: string | null; address2: string | null; address3: string | null; city: string | null; state: string | null; postCode: string | null
  race: string | null; nationality: string | null; salutation: string | null; email: string | null; telHome: string | null; telMobile: string | null; telOffice: string | null
  status: string | null; insurer: string | null; plan: string | null; payor: string | null; payorEffectiveDate: string | null; payorExpiryDate: string | null; batchNo: number | null
}
export type PrincipalAmendment = Omit<AdjustmentMember, 'status' | 'insurer' | 'plan' | 'payor' | 'payorEffectiveDate' | 'payorExpiryDate' | 'batchNo'> & {
  endorsementBordxDate: string | null; effectiveDate: string | null; batchNo: number | null
}
export interface AmendmentResult { member: AdjustmentMember; crossReferenceUpdated: boolean; renewalKeyUpdated: boolean }

export interface RefundAmounts { premiumEffective: number; premiumReduction: number; mcoEffective: number; mcoRefund: number }
export interface CancellationRequest { memberNumber: string; cancelDate: string | null; endorsementBordxDate: string | null; batchNo: number | null }
export interface CancellationQuote { memberNumber: string; name: string | null; status: string | null; effectiveDate: string; expiryDate: string; cancelDate: string; premium: number; mcoFee: number; refund: RefundAmounts; coveredPersons: number }
export interface CancellationResult { quote: CancellationQuote; crossReferenceUpdated: boolean }

export interface PlanChangeRequest { memberNumber: string; newPlan: string; effectiveDate: string | null; endorsementBordxDate: string | null; batchNo: number | null; updateMcoFee: boolean; updateAnnualLimit: boolean }
export interface PlanChangeQuote {
  memberNumber: string; name: string | null; status: string | null; oldPlan: string | null; newPlan: string; ageText: string; ageCode: string; adultChild: string
  basicPremium: number; premium: number; mcoFee: number; currentPremium: number; currentMcoFee: number; mcoFeeDiffers: boolean
  currentAnnualLimit: number | null; newAnnualLimit: number | null; annualLimitDiffers: boolean; payorEffectiveDate: string; payorExpiryDate: string; refund: RefundAmounts
}
export interface PlanChangeResult { quote: PlanChangeQuote; crossReferenceUpdated: boolean }

export interface StatusEndorsementRequest { memberNumber: string; type: string; effectiveDate: string | null; endorsementBordxDate: string | null; batchNo: number | null }
export interface StatusEndorsementResult { memberNumber: string; type: string; previousStatus: string; newStatus: string; coveredPersonsUpdated: number; crossReferenceUpdated: boolean }

export interface SupplementaryRequest {
  memberNumber: string; name: string; salutation: string | null; icBcPp: string; dateOfBirth: string | null; sex: string; relationship: string; allergies: string | null; exclusion: string | null
  supplementaryPlan: string | null; effectiveDate: string | null; endorsementBordxDate: string | null; batchNo: number | null; renewalDiscount: number | null; policyDiscount: number | null; guaranteeRenewal: string | null
}
export interface SupplementaryQuote {
  memberNumber: string; coverId: string; name: string; ageText: string; ageCode: string; adultChild: string; plan: string; effectiveDate: string; expiryDate: string
  annualLimit: number; basicPremium: number; premium: number; basicMco: number; mco: number; suppLimitStatus: string; suppMcoStatus: string; suppPremiumStatus: string; benefitLimits: { kidney: number; cancer: number; homeNursing: number; benefitStatus: string } | null; lifetimeLimit: { memberNumber: string; limit: number } | null
}

export interface SupplementaryCancelRequest { memberNumber: string; coverId: string; effectiveDate: string | null; endorsementBordxDate: string | null; batchNo: number | null }
export interface SupplementaryCancelQuote {
  memberNumber: string; coverId: string; name: string | null; status: string | null; effectiveDate: string; expiryDate: string; cancelDate: string; premium: number; mcoFee: number
  suppMcoStatus: string; refundWritten: boolean; refund: RefundAmounts
}

export interface SupplementaryDeleteRequest { memberNumber: string; coverId: string; effectiveDate: string | null; endorsementBordxDate: string | null; batchNo: number | null }
export interface SupplementaryDeleteQuote {
  memberNumber: string; coverId: string; name: string | null; status: string | null; cases: number; refundRows: number; lifetimeRows: number; clinicRows: number; benefitLimitRows: number; blockedReason: string | null
}

const base = '/api/membership/adjustment'

export const adjustmentApi = {
  get: (memberNumber: string) => api.get<AdjustmentMember>(`${base}?memberNumber=${encodeURIComponent(memberNumber.trim())}`),
  quoteCancellation: (r: CancellationRequest) => api.post<CancellationQuote>(`${base}/cancellation/quote`, r),
  cancel: (r: CancellationRequest) => api.post<CancellationResult>(`${base}/cancellation`, r),
  quotePlanChange: (r: PlanChangeRequest) => api.post<PlanChangeQuote>(`${base}/plan-change/quote`, r),
  changePlan: (r: PlanChangeRequest) => api.post<PlanChangeResult>(`${base}/plan-change`, r),
  statusEndorsement: (r: StatusEndorsementRequest) => api.post<StatusEndorsementResult>(`${base}/status-endorsement`, r),
  quoteSupplementary: (r: SupplementaryRequest) => api.post<SupplementaryQuote>(`${base}/supplementary/quote`, r),
  addSupplementary: (r: SupplementaryRequest) => api.post<{ quote: SupplementaryQuote }>(`${base}/supplementary`, r),
  quoteSupplementaryCancel: (r: SupplementaryCancelRequest) => api.post<SupplementaryCancelQuote>(`${base}/supplementary/cancel/quote`, r),
  cancelSupplementary: (r: SupplementaryCancelRequest) => api.post<{ quote: SupplementaryCancelQuote }>(`${base}/supplementary/cancel`, r),
  quoteSupplementaryDelete: (r: SupplementaryDeleteRequest) => api.post<SupplementaryDeleteQuote>(`${base}/supplementary/delete/quote`, r),
  deleteSupplementary: (r: SupplementaryDeleteRequest) => api.post<{ quote: SupplementaryDeleteQuote; rowsDeleted: number }>(`${base}/supplementary/delete`, r),
  search: (q: string) => api.get<MemberSearchPage>(`${base}/search?q=${encodeURIComponent(q.trim())}`),
  overview: (n: string) => api.get<{ detail: MemberDetail; managementNote: string | null }>(`${base}/overview?memberNumber=${encodeURIComponent(n)}`),
  neighbour: (n: string, direction: 'next' | 'previous') => api.get<{ memberNumber: string }>(`${base}/neighbour?memberNumber=${encodeURIComponent(n)}&direction=${direction}`),
  amendments: (n: string) => api.get<MemberAmendment[]>(`${base}/amendments?memberNumber=${encodeURIComponent(n)}`),
  coveredPersons: (n: string) => api.get<CoveredPerson[]>(`${base}/covered-persons?memberNumber=${encodeURIComponent(n)}`),
  memberHistory: (n: string) => api.get<MemberHistory>(`${base}/member-history?memberNumber=${encodeURIComponent(n)}`),
  fees: (n: string) => api.get<MemberFees>(`${base}/fees?memberNumber=${encodeURIComponent(n)}`),
  saveMgmtNote: (memberNumber: string, note: string) => api.put<{ saved: boolean }>(`${base}/mgmt-note`, { memberNumber, note }),
  amend: (a: PrincipalAmendment) => api.put<AmendmentResult>(`${base}/amendment`, a),
}









