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

const base = '/api/membership/adjustment'

export const adjustmentApi = {
  get: (memberNumber: string) => api.get<AdjustmentMember>(`${base}?memberNumber=${encodeURIComponent(memberNumber.trim())}`),
  amend: (a: PrincipalAmendment) => api.put<AmendmentResult>(`${base}/amendment`, a),
}
