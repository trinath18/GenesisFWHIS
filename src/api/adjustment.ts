import { api } from './client'

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
  supplementaryPlan: string | null; effectiveDate: string | null; endorsementBordxDate: string | null; batchNo: number | null; renewalDiscount: number | null; policyDiscount: number | null
}
export interface SupplementaryQuote {
  memberNumber: string; coverId: string; name: string; ageText: string; ageCode: string; adultChild: string; plan: string; effectiveDate: string; expiryDate: string
  annualLimit: number; basicPremium: number; premium: number; basicMco: number; mco: number; suppLimitStatus: string; suppMcoStatus: string; suppPremiumStatus: string
}

export interface SupplementaryCancelRequest { memberNumber: string; coverId: string; effectiveDate: string | null; endorsementBordxDate: string | null; batchNo: number | null }
export interface SupplementaryCancelQuote {
  memberNumber: string; coverId: string; name: string | null; status: string | null; effectiveDate: string; expiryDate: string; cancelDate: string; premium: number; mcoFee: number
  suppMcoStatus: string; refundWritten: boolean; refund: RefundAmounts
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
  amend: (a: PrincipalAmendment) => api.put<AmendmentResult>(`${base}/amendment`, a),
}





