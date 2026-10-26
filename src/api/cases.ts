import { api } from './client'
import type { LifetimeLimitRow, NonDisclosureItem, PolicyTerm, PolicyWordingListing } from './membership'

export type CaseSearchBy = 'MemberNo' | 'PolicyNo' | 'Name' | 'Ic' | 'CaseNo' | 'EspRefNo' | 'ClaimId'

export interface CaseSearchResult {
  caseNumber: string
  memberNumber: string
  coverId: string | null
  policyNo: string | null
  memberName: string | null
  insurer: string | null
  planCode: string | null
  healthCode: string | null
  hospitalCode: string | null
  admitted: string | null
  discharged: string | null
  reserveAmount: number | null
  status: string | null
  payorCode: string | null
  claimId: string | null
  espRefNo: string | null
}

export interface CaseSearchPage {
  items: CaseSearchResult[]
  truncated: boolean
}

export interface CaseHeader {
  caseNumber: string
  memberNumber: string
  coverId: string | null
  patientName: string | null
  admitted: string | null
  discharged: string | null
  registered: string | null
  hospitalName: string | null
  status: string | null
  claimability: string | null
  pending: string | null
  stayType: string | null
  payType: string | null
  modality: string | null
  claimNature: string | null
  admissionReason: string | null
  referredBy: string | null
  lgAmount: number | null
  lgTime: string | null
  reserveAmount: number | null
  query: string | null
  linkCaseNumber: string | null
  topupLimit: string | null
  caseIndicator: string | null
  espRefNo: string | null
  claimId: string | null
  policyYear: number | null
  roomBoardDays: number | null
  takeOverAmount: number | null
  takeOverIndicator: string | null
  takeOverPlan: string | null
  internalExternalTakeOver: string | null
}

export interface CaseMember {
  policyNo: string | null
  name: string | null
  icBcPp: string | null
  dateOfBirth: string | null
  payorCode: string | null
  insurerCode: string | null
  planCode: string | null
  healthCode: string | null
  productName: string | null
  status: string | null
  expiredStatus: string | null
  availableLimit: number | null
  payorEffDate: string | null
  payorExpDate: string | null
  groupCompany: string | null
  memberType: string | null
  adultChild: string | null
  address: string | null
}

export interface CaseProcedure {
  procedure: string | null
  cptCode: string | null
  surgeonFees: number | null
  anaesthetistFees: number | null
  nonSurgicalFees: number | null
  nonSurgical: boolean
}

export interface CaseClinical {
  procedures: CaseProcedure[]
  investigationsDone: string[]
  medicalSurgicalManagement: string[]
  medicationOnDischarge: string[]
  investigationCodes: string[]
  conditionWillRecur: string | null
  followUpRequired: string | null
  followUp: string | null
  firstCall: string | null
  firstTreated: string | null
  reductionAmount: number | null
  payPending: string | null
  attendingDoctors: string[]
  anaesthetists: string[]
  firstDoctorDate: string | null
  subsequentDoctorDate: string | null
  patientAge: string | null
  patientAgeUnit: string | null
}

export interface CaseDiagnosis {
  icdCode: string | null
  description: string | null
  dateOfService: string | null
}

export interface CaseUnderlying {
  code: string | null
  reason: string | null
  dateOfService: string | null
}

export interface CaseComplaint {
  date: string | null
  issue: string | null
  complainant: string | null
  action: string | null
}

export interface CaseRemarks {
  management: string | null
  managementTwo: string | null
  page3: string | null
  page4: string | null
  page5: string | null
  internal: string | null
}

export interface CaseDetail {
  header: CaseHeader
  member: CaseMember
  clinical: CaseClinical
  firstDiagnoses: CaseDiagnosis[]
  finalDiagnoses: CaseDiagnosis[]
  underlying: CaseUnderlying[]
  complaint: CaseComplaint | null
  remarks: CaseRemarks
  hasScannedDocuments: boolean
}

export interface CaseGuarantees {
  letterOfGuarantees: { number: string | null; date: string | null; amount: number | null; issuedBy: string | null; remark: string | null }[]
  followUps: { number: string | null; amount: number | null; issuedBy: string | null; issuedDate: string | null; followUpDate: string | null }[]
}

export interface CaseWorksheet {
  version: number
  totalApproved: number | null
  totalActual: number | null
  pending: string | null
  payableToHospital: number | null
  payableToMember: number | null
  bordxRefNo: string | null
  claimCloseDate: string | null
  bordxDate: string | null
  bordxAmount: number | null
  payorApprovalStatus: string | null
  payorApprovalDate: string | null
  payorApprovalCode: string | null
  bordxReversal: string | null
  sentDate: string | null
  cartonNo: string | null
  debitCreditRef: string | null
  debitCreditDate: string | null
}

export interface CaseInvoice {
  invoiceNo: string | null
  invoiceDate: string | null
  payee: string | null
  payTo: string | null
  worksheetVersion: string | null
  amount: number | null
  bordxRefNo: string | null
  bordxDate: string | null
  pending: string | null
}

export interface CasePayment {
  reference: string | null
  version: number | null
  date: string | null
  chequeNo: string | null
  chequeDate: string | null
  amount: number | null
  status: string | null
  remark: string | null
}

export interface CasePayments {
  toHospital: CasePayment[]
  toMember: CasePayment[]
  toMemberReissued: CasePayment[]
  receiptsFromMember: CasePayment[]
  receiptsFromPayor: CasePayment[]
  receiptsFromMnrb: CasePayment[]
}

export interface CaseAccountSummary {
  totalApproved: number
  totalReimburse: number
  totalExcess: number
  totalPayableToMember: number
  totalPayableToHospital: number
  totalPaidByMember: number
  finalApproved: number
  totalPaidToMember: number
  totalPaidToHospital: number
}

export interface CaseReminder {
  number: string | null
  version: string | null
  date: string | null
  rmf: string | null
  originalInvoice: string | null
  report: string | null
  proposalForm: string | null
  referralLetter: string | null
  subrogationForm: string | null
  receipt: string | null
  student: string | null
  police: string | null
  others1: string | null
  others2: string | null
  registeredBy: string | null
  registeredDate: string | null
}

export interface CaseRepudiation {
  reasons: { code: string | null; description: string | null; reason: string | null }[]
  issuedBy: string | null
  date: string | null
  document: string | null
  personnel: string | null
  attention: string | null
}

export interface CaseCarton {
  kind: string | null
  version: number | null
  cartonNo: string | null
  cartonStatus: string | null
  fileStatus: string | null
  requestedBy: string | null
  requestDate: string | null
  deliveryDate: string | null
  returnDate: string | null
  remarks: string | null
  updatedBy: string | null
  updatedDate: string | null
}

export interface CaseBenefits {
  planCode: string | null
  effectiveDate: string | null
  items: { code: string; description: string | null; noOfDays: number; claimableAmount: string | null; rmPerDisability: string | null }[]
}

export interface CaseExclusions {
  principal: string[]
  supplementary: string[]
}

export interface SurgicalScheduleItem {
  payorCode: string | null
  planCode: string | null
  mainCategory: string | null
  subCategory: string | null
  percentage: number | null
}

export interface CaseDocumentListing {
  area: string
  storeConfigured: boolean
  files: { name: string; size: number }[]
}

export type CaseDocumentArea = 'Scanned' | 'Internal' | 'Emails'

const base = (c: string) => `/api/cases/${encodeURIComponent(c)}`

export const casesApi = {
  search: (by: CaseSearchBy, q: string, plan?: string) =>
    api.get<CaseSearchPage>(`/api/cases?by=${by}&q=${encodeURIComponent(q.trim())}${plan ? `&plan=${encodeURIComponent(plan)}` : ''}`),
  get: (c: string) => api.get<CaseDetail>(base(c)),
  guarantees: (c: string) => api.get<CaseGuarantees>(`${base(c)}/guarantees`),
  worksheets: (c: string) => api.get<CaseWorksheet[]>(`${base(c)}/worksheets`),
  invoices: (c: string) => api.get<CaseInvoice[]>(`${base(c)}/invoices`),
  payments: (c: string) => api.get<CasePayments>(`${base(c)}/payments`),
  accountSummary: (c: string) => api.get<CaseAccountSummary | null>(`${base(c)}/account-summary`),
  reminders: (c: string) => api.get<CaseReminder[]>(`${base(c)}/reminders`),
  repudiation: (c: string) => api.get<CaseRepudiation | null>(`${base(c)}/repudiation`),
  cartons: (c: string) => api.get<CaseCarton[]>(`${base(c)}/cartons`),
  benefits: (c: string) => api.get<CaseBenefits | null>(`${base(c)}/benefits`),
  exclusions: (c: string) => api.get<CaseExclusions | null>(`${base(c)}/exclusions`),
  surgicalSchedule: (c: string) => api.get<SurgicalScheduleItem[]>(`${base(c)}/surgical-schedule`),
  nonDisclosure: (c: string) => api.get<NonDisclosureItem[]>(`${base(c)}/non-disclosure`),
  policyTerms: (c: string) => api.get<PolicyTerm[]>(`${base(c)}/policy-terms`),
  lifetimeLimit: (c: string) => api.get<LifetimeLimitRow[]>(`${base(c)}/lifetime-limit`),
  policyWording: (c: string) => api.get<PolicyWordingListing>(`${base(c)}/policy-wording`),
  policyWordingFile: (c: string, file: string) => api.blob(`${base(c)}/policy-wording/${encodeURIComponent(file)}`),
  documents: (c: string, area: CaseDocumentArea) => api.get<CaseDocumentListing>(`${base(c)}/documents/${area}`),
  documentFile: (c: string, area: CaseDocumentArea, file: string) => api.blob(`${base(c)}/documents/${area}/${encodeURIComponent(file)}`),
  print: (c: string, kind: 'enquiry.xlsx' | 'payments.xlsx' | 'notes.pdf' | 'notes.pdf?kind=internal') => api.blob(`${base(c)}/print/${kind}`),
}
