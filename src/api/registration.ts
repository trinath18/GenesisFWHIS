import { api } from './client'
import type { HealthPlan } from './deletion'

export interface RegistrationPayor { code: string; name: string | null; health: string | null }
export interface RegistrationOptions { healthPlans: HealthPlan[]; payors: RegistrationPayor[] }
export interface RegistrationRequest {
  healthCode: string; payorCode: string; bordxDate: string | null; batchNo: number | null; renewal: string; previousMemberNo: string | null; previousPolicyNo: string | null; takeover: string
  name: string; salutation: string | null; icBcPp: string; dateOfBirth: string | null; sex: string; race: string | null; nationality: string | null
  address1: string; address2: string | null; address3: string | null; city: string | null; state: string; postCode: string; email: string | null; telHome: string | null; telMobile: string | null; telOffice: string | null
  insurer: string; plan: string; policyNo: string; payorEffectiveDate: string | null; payorExpiryDate: string | null
  groupCompany: string | null; employeeNo: string | null; agentCode: string | null; department: string | null; branch: string | null; installmentMode: string | null
  occupation: string | null; workNature: string | null; maritalStatus: string | null; allergies: string | null; exclusion: string | null; remarks: string | null; supplementary: RegistrationSupplementary[]
}
export interface RegistrationSupplementary {
  name: string; salutation: string | null; icBcPp: string; dateOfBirth: string | null; sex: string; relationship: string; allergies: string | null; exclusion: string | null
  supplementaryPlan: string | null; effectiveDate: string | null; expiryDate: string | null; renewalDiscount: number | null; policyDiscount: number | null
}
export interface RegistrationSupplementaryQuote {
  coverId: string; name: string; ageText: string; ageCode: string; adultChild: string; plan: string; effectiveDate: string; expiryDate: string
  annualLimit: number; basicPremium: number; premium: number; basicMco: number; mco: number
}
export interface RegistrationQuote {
  ageText: string; ageCode: string; adultChild: string; basicPremium: number; premium: number; basicMco: number; mcoFee: number; annualLimit: number; memberType: string
  duplicateMemberNo: string | null; payorEffectiveDate: string; payorExpiryDate: string; supplementary: RegistrationSupplementaryQuote[] | null
}
export interface RegistrationResult { memberNumber: string; quote: RegistrationQuote; crossReferenceSaved: boolean }

const base = '/api/membership/registration'

export const registrationApi = {
  options: () => api.get<RegistrationOptions>(`${base}/options`),
  lastBatch: (payor: string, bordxDate: string) => api.get<{ lastBatch: number }>(`${base}/last-batch?payor=${encodeURIComponent(payor)}&bordxDate=${bordxDate}`),
  quote: (r: RegistrationRequest) => api.post<RegistrationQuote>(`${base}/quote`, r),
  register: (r: RegistrationRequest) => api.post<RegistrationResult>(base, r),
}

