import { api } from './client'
import type { MemberBenefits, MemberHistory, NonDisclosureItem, PolicyTerm, PolicyWordingListing } from './membership'

export interface CaseOption { code: string; name: string }
export interface CaseRegistrationOptions { claimability: CaseOption[]; hospitals: CaseOption[]; payTypes: CaseOption[]; stayTypes: CaseOption[]; modalities: CaseOption[]; natures: CaseOption[]; specialApprovals: CaseOption[]; icd: CaseOption[]; repudiation: CaseOption[]; repudiationSelections: CaseOption[] }
export interface CasePatient { coverId: string; name: string; icBcPp: string | null; relation: string; birthDate: string | null }
export interface CaseMemberView {
  memberNumber: string; name: string; icBcPp: string | null; policyNo: string | null; health: string | null; insured: string | null; plan: string | null; payor: string | null; status: string | null; birthDate: string | null
  effectiveDate: string | null; expiryDate: string | null; availableLimit: number | null; topUp: boolean; terminated: boolean; planMessage: string | null; patients: CasePatient[]; blockedReason: string | null; warnings: string[]
}
export interface CaseProcedure { text: string | null; cptCode: string | null }
export interface CaseExtras { principalExclusion: string | null; coveredExclusions: { coverId: string; name: string | null; exclusion: string | null }[]; managementNote: string | null; surgicalSchedule: { payor: string; plan: string; mainCategory: string; subCategory: string; percent: string }[] }
export interface CaseLgResult { lgNumber: string; sequence: number; letter: string; balance: number; amount: number }
export interface CaseDiagnosis { code: string | null; text: string | null; date: string | null }
export interface CaseRegistrationRequest {
  memberNumber: string; patientId: string; claimability: string; hospitalCode: string; hospitalName: string | null; dateAdmitted: string | null; dateDischarge: string | null; pending: string | null; reserveAmount: number | null; lgAmount: number | null
  lgTime: string | null; payType: string; stayType: string | null; modality: string | null; nature: string | null; specialApproval: string | null; topUpLimit: string | null; query: string | null; linkCaseNo: string | null; referredBy: string | null
  admissionReason: string | null; docReceivedDate: string | null; policyYear: number | null; espRefNo: string | null; takeOverInd: string | null; takeOverAmount: number | null; takeOverPlan: string | null; intExtTakeOver: string | null
  patientAge: string | null; ageUnit: string | null; firstCall: string | null; firstTreated: string | null; payPending: string | null; followUp: string | null; conditionWillRecur: string | null; followUpRequired: string | null
  remarks: string[]; firstDiagnosis: CaseDiagnosis[]; finalDiagnosis: CaseDiagnosis[]; acknowledgeLongStay: boolean; acknowledgeRecentPolicy: boolean; acknowledgeOpenCase: boolean
  repudiationCodes: string[] | null; document: string | null; personnel: string | null; attention: string | null; underlying: boolean; underlyingDiagnosis: CaseDiagnosis[]; deductionAmount: number | null
  attendingDoctors: string[]; anaesthetists: string[]; procedures: CaseProcedure[]; nonSurgicalProcedures: CaseProcedure[]; investigations: { done: string | null; code: string | null }[]; medicalManagement: string[]; firstDocDate: string | null; subsequentDocDate: string | null
}

const base = '/api/case-registration'
export const caseRegistrationApi = {
  options: () => api.get<CaseRegistrationOptions>(`${base}/options`),
  hospitals: (search: string) => api.get<CaseOption[]>(`${base}/hospitals?search=${encodeURIComponent(search)}`),
  member: (memberNumber: string) => api.get<CaseMemberView>(`${base}/member?memberNumber=${encodeURIComponent(memberNumber)}`),
  register: (r: CaseRegistrationRequest) => api.post<{ caseNumber: string; memberNumber: string; patientId: string; message: string; letters: string[] }>(base, r),
  extras: (n: string) => api.get<CaseExtras>(`${base}/member/${encodeURIComponent(n)}/extras`),
  benefits: (n: string) => api.get<MemberBenefits>(`${base}/member/${encodeURIComponent(n)}/benefits`),
  history: (n: string) => api.get<MemberHistory>(`${base}/member/${encodeURIComponent(n)}/history`),
  nonDisclosure: (n: string) => api.get<NonDisclosureItem[]>(`${base}/member/${encodeURIComponent(n)}/non-disclosure`),
  policyTerms: (n: string) => api.get<PolicyTerm[]>(`${base}/member/${encodeURIComponent(n)}/policy-terms`),
  policyWording: (n: string) => api.get<PolicyWordingListing>(`${base}/member/${encodeURIComponent(n)}/policy-wording`),
  policyWordingFile: (n: string, file: string) => api.blob(`${base}/member/${encodeURIComponent(n)}/policy-wording/${encodeURIComponent(file)}`),
  issueLg: (caseNumber: string, r: { amount: number | null; time: string | null; remark: string | null }) => api.post<CaseLgResult>(`${base}/${encodeURIComponent(caseNumber)}/lg`, r),
  letter: (caseNumber: string, kind: string) => api.blob(`${base}/${encodeURIComponent(caseNumber)}/letters/${kind}`),
}



const tabsFor = (base: string) => ({
  extras: (n: string) => api.get<CaseExtras>(`${base}/member/${encodeURIComponent(n)}/extras`),
  benefits: (n: string) => api.get<MemberBenefits>(`${base}/member/${encodeURIComponent(n)}/benefits`),
  history: (n: string) => api.get<MemberHistory>(`${base}/member/${encodeURIComponent(n)}/history`),
  nonDisclosure: (n: string) => api.get<NonDisclosureItem[]>(`${base}/member/${encodeURIComponent(n)}/non-disclosure`),
  policyTerms: (n: string) => api.get<PolicyTerm[]>(`${base}/member/${encodeURIComponent(n)}/policy-terms`),
  policyWording: (n: string) => api.get<PolicyWordingListing>(`${base}/member/${encodeURIComponent(n)}/policy-wording`),
  policyWordingFile: (n: string, file: string) => api.blob(`${base}/member/${encodeURIComponent(n)}/policy-wording/${encodeURIComponent(file)}`),
})
export const memberTabsApi = (area: 'registration' | 'adjustment') => tabsFor(area === 'registration' ? '/api/case-registration' : '/api/case-adjustment')

export interface CaseAdjustmentView { caseNumber: string; status: string; member: CaseMemberView | null; patientName: string; form: CaseRegistrationRequest; hospitalName: string | null; lastUpdatedBy: string | null; lastUpdated: string | null; registered: string | null; openedBy: string | null }
const adj = '/api/case-adjustment'
export const caseAdjustmentApi = {
  options: () => api.get<CaseRegistrationOptions>(`${adj}/options`),
  hospitals: (search: string) => api.get<CaseOption[]>(`${adj}/hospitals?search=${encodeURIComponent(search)}`),
  get: (c: string) => api.get<CaseAdjustmentView>(`${adj}/${encodeURIComponent(c)}`),
  next: (c: string) => api.get<{ caseNumber: string }>(`${adj}/${encodeURIComponent(c)}/next`),
  previous: (c: string) => api.get<{ caseNumber: string }>(`${adj}/${encodeURIComponent(c)}/previous`),
  update: (c: string, status: string, form: CaseRegistrationRequest) => api.put<{ updated: boolean }>(`${adj}/${encodeURIComponent(c)}`, { status, form }),
}

export interface CaseLgItem { lgNumber: string; lgNo: number; letter: string; date: string | null; amount: number | null; patientId: string; patientName: string | null; admitted: string | null; hospital: string | null; issuedBy: string | null; remark: string | null; userTime: string | null; systemTime: string | null }
export interface CaseWorksheetItem { version: number; totalApproved: number | null; totalActual: number | null; payableToHospital: number | null; payableToMember: number | null; bordxRefNo: string | null; bordxDate: string | null; bordxAmount: number | null; payorApprovalStatus: string | null; payorApprovalDate: string | null; payorApprovalCode: string | null; bordxReversalIndicator: string | null; cartonNo: string | null; sentDate: string | null; debitCreditRef: string | null; debitCreditDate: string | null; reversalBordxStatus: string | null }
export interface CaseSearchItem { caseNumber: string; memberNumber: string; policyNo: string | null; memberName: string | null; admitted: string | null; discharged: string | null; status: string | null; hospitalCode: string | null; reserveAmount: number | null }
export const caseAdjustmentTabsApi = {
  search: (by: string, q: string) => api.get<{ items: CaseSearchItem[]; truncated: boolean }>(`${adj}/search?by=${by}&q=${encodeURIComponent(q)}`),
  lgs: (c: string) => api.get<CaseLgItem[]>(`${adj}/${encodeURIComponent(c)}/lg`),
  issueLg: (c: string, r: { amount: number | null; time: string | null; remark: string | null }) => api.post<CaseLgResult>(`${adj}/${encodeURIComponent(c)}/lg`, r),
  lgRemark: (c: string, no: number, remark: string) => api.put<{ updated: boolean }>(`${adj}/${encodeURIComponent(c)}/lg/${no}/remark`, { remark }),
  lgLetter: (c: string, no: number) => api.blob(`${adj}/${encodeURIComponent(c)}/lg/${no}/letter`),
  worksheets: (c: string) => api.get<CaseWorksheetItem[]>(`${adj}/${encodeURIComponent(c)}/worksheets`),
  approve: (c: string, version: number, r: { approvalDate: string | null; approvalCode: string | null; reversalIndicator: string | null; reversalStatus: string | null }) => api.put<{ updated: boolean }>(`${adj}/${encodeURIComponent(c)}/worksheets/${version}/approval`, r),
}
