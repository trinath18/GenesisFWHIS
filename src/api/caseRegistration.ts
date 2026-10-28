import { api } from './client'

export interface CaseOption { code: string; name: string }
export interface CaseRegistrationOptions { claimability: CaseOption[]; hospitals: CaseOption[]; payTypes: CaseOption[]; stayTypes: CaseOption[]; modalities: CaseOption[]; natures: CaseOption[]; specialApprovals: CaseOption[]; icd: CaseOption[] }
export interface CasePatient { coverId: string; name: string; icBcPp: string | null; relation: string; birthDate: string | null }
export interface CaseMemberView {
  memberNumber: string; name: string; icBcPp: string | null; policyNo: string | null; health: string | null; insured: string | null; plan: string | null; payor: string | null; status: string | null; birthDate: string | null
  effectiveDate: string | null; expiryDate: string | null; availableLimit: number | null; topUp: boolean; terminated: boolean; planMessage: string | null; patients: CasePatient[]; blockedReason: string | null; warnings: string[]
}
export interface CaseDiagnosis { code: string | null; text: string | null; date: string | null }
export interface CaseRegistrationRequest {
  memberNumber: string; patientId: string; claimability: string; hospitalCode: string; hospitalName: string | null; dateAdmitted: string | null; dateDischarge: string | null; pending: string | null; reserveAmount: number | null; lgAmount: number | null
  lgTime: string | null; payType: string; stayType: string | null; modality: string | null; nature: string | null; specialApproval: string | null; topUpLimit: string | null; query: string | null; linkCaseNo: string | null; referredBy: string | null
  admissionReason: string | null; docReceivedDate: string | null; policyYear: number | null; espRefNo: string | null; takeOverInd: string | null; takeOverAmount: number | null; takeOverPlan: string | null; intExtTakeOver: string | null
  patientAge: string | null; ageUnit: string | null; firstCall: string | null; firstTreated: string | null; payPending: string | null; followUp: string | null; conditionWillRecur: string | null; followUpRequired: string | null
  remarks: string[]; firstDiagnosis: CaseDiagnosis[]; finalDiagnosis: CaseDiagnosis[]; acknowledgeLongStay: boolean; acknowledgeRecentPolicy: boolean; acknowledgeOpenCase: boolean
}

const base = '/api/case-registration'
export const caseRegistrationApi = {
  options: () => api.get<CaseRegistrationOptions>(`${base}/options`),
  hospitals: (search: string) => api.get<CaseOption[]>(`${base}/hospitals?search=${encodeURIComponent(search)}`),
  member: (memberNumber: string) => api.get<CaseMemberView>(`${base}/member?memberNumber=${encodeURIComponent(memberNumber)}`),
  register: (r: CaseRegistrationRequest) => api.post<{ caseNumber: string; memberNumber: string; patientId: string; message: string }>(base, r),
}
