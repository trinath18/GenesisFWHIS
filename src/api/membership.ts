import { api } from './client'

export interface MemberSearchResult {
  number: string
  coverId: string | null
  name: string
  icBcPp: string | null
  policyNo: string | null
  status: string | null
  payorEffDate: string | null
  payorExpDate: string | null
  groupCompany: string | null
  bordxDate: string | null
  valueDate: string | null
  regUser: string | null
}

export interface MemberSearchPage {
  items: MemberSearchResult[]
  truncated: boolean
}

export interface MemberRefund {
  premiumReduction: number | null
  mcoRefund: number | null
  providerRefund: number | null
  providerEffective: number | null
  mcoEffective: number | null
  premiumEffective: number | null
}

export interface MemberDetail {
  number: string
  name: string
  icBcPp: string | null
  policyNo: string | null
  status: string | null
  dataStatus: string | null
  expiredStatus: string | null
  insurerCode: string | null
  planCode: string | null
  healthCode: string | null
  payorCode: string | null
  memberType: string | null
  renewFlag: string | null
  takeover: string | null
  sex: string | null
  raceCode: string | null
  ageCode: string | null
  adultChild: string | null
  branchCode: string | null
  policyYear: string | null
  batchNo: string | null
  dateOfBirth: string | null
  valueDate: string | null
  bordxDate: string | null
  payorEffDate: string | null
  payorExpDate: string | null
  finalExpiryDate: string | null
  endorsementDate: string | null
  endorseType: string | null
  payorSubmissionDate: string | null
  availableLimit: number | null
  annualLimitApplies: boolean
  planSpecialNote: string | null
  planMajorMedical: boolean | null
  groupCompany: string | null
  address1: string | null
  address2: string | null
  address3: string | null
  address4: string | null
  city: string | null
  postCode: string | null
  state: string | null
  reinstated: boolean
  topUp: boolean
  refund: MemberRefund | null
  /** Prin Detail extras and the legacy "Others Details" window. */
  others: MemberOthers | null
}

export interface MemberOthers {
  salutation: string | null; nationality: string | null; maritalStatus: string | null; agentCode: string | null; employeeNo: string | null; guaranteedRenewal: string | null
  branch: string | null; topUpJoinDate: string | null; hospitalClinic: string | null; phoneHome: string | null; phoneMobile: string | null; phoneOffice: string | null
  email: string | null; sendingMode: string | null; cardDate: string | null; cancelDate: string | null; occupation: string | null; department: string | null
}

export interface MemberAmendment {
  id: number
  type: string | null
  amendDate: string | null
  effectiveDate: string | null
  bordxDate: string | null
  batchNo: number | null
}

export interface MemberCase {
  caseNumber: string
  memberNumber: string
  patientName: string | null
  relationship: string | null
  admitted: string | null
  discharged: string | null
  claimability: string | null
  diagnosis: string | null
  status: string | null
  hospital: string | null
  payorCode: string | null
}

export interface MemberAccountSummary {
  coverId: string | null
  totalApproved: number
  totalPayableToHospital: number
  totalPaidToHospital: number
  totalPayableToMember: number
  totalPaidByMember: number
  totalPaidToMember: number
  totalExcess: number
  totalReimburse: number
  memberPaidAmount: number
}

export interface MemberAccountHistoryItem {
  memberNumber: string
  payorEffDate: string | null
  admitted: string | null
  caseRegistered: string | null
  caseReference: string
  debitCreditRef: string | null
  debitCreditDate: string | null
  payableByMedix: number
  receiptNo: string | null
  receiptDate: string | null
  receiptAmount: number
}

export interface MemberNote {
  memberNumber: string
  text: string
}

export interface CoveredPerson {
  coverId: string
  name: string | null
  icBcPp: string | null
  dateOfBirth: string | null
  sex: string | null
  adultChild: string | null
  relationship: string | null
  status: string | null
  planCode: string | null
  memberType: string | null
  annualLimit: number | null
  availableLimit: number | null
  effectiveDate: string | null
  expiryDate: string | null
  cancelDate: string | null
  premium: number | null
  bordxDate: string | null
  batchNo: number | null
}

export interface BenefitItem {
  code: string
  description: string | null
  noOfDays: number
  claimableAmount: string | null
  rmPerDisability: string | null
}

export interface BenefitListing {
  planCode: string | null
  effectiveDate: string | null
  items: BenefitItem[]
}

export interface MemberBenefits {
  principal: BenefitListing
  supplementary: BenefitListing[]
}

export interface MemberHistoryItem {
  memberNumber: string
  coverId: string | null
  topupInd: string | null
  topupNumber: string | null
  policyNo: string | null
  payorEffDate: string | null
  payorExpDate: string | null
  dataStatus: string | null
  status: string | null
  bordxDate: string | null
}

export interface MemberHistory {
  byIc: MemberHistoryItem[]
  byNameDob: MemberHistoryItem[]
  countsDiffer: boolean
}

export interface MemberCaseHistory {
  byIc: MemberCase[]
  byNameDob: MemberCase[]
  countsDiffer: boolean
}

export interface MemberFees {
  premium: number | null
  mcoFee: number | null
  accessFee: number | null
  basicPremium: number | null
  basicMco: number | null
  payorMco: number | null
  billedMco: number | null
}

export interface NonDisclosureItem {
  memberNumber: string
  caseNumber: string | null
  coverId: string | null
  admitted: string | null
  preIllnessDate: string | null
  preIllnessCategory: string | null
  preIllnessInformedBy: string | null
  underlyingIllnessDate: string | null
  underlyingIllnessCategory: string | null
  underlyingIllnessInformedBy: string | null
}

export interface PolicyTerm {
  name: string
  value: string | null
}

export interface LifetimeLimitRow {
  memberNumber: string
  coverId: string | null
  name: string | null
  availableLimit: number
  balance: number
  currentCases: number
  historyCases: number
  currentBordxAmount: number
  historyBordxAmount: number
}

export interface TakeoverClaim {
  effectiveDate: string | null
  expiryDate: string | null
  patientName: string | null
  patientIc: string | null
  admitted: string | null
  discharged: string | null
  hospital: string | null
  diagnosis: string | null
  doctors: string | null
  billAmount: number | null
  approvedAmount: number | null
  excessAmount: number | null
}

export interface PolicyWordingListing {
  folder: string | null
  storeConfigured: boolean
  files: { name: string; size: number }[]
}

const base = (n: string) => `/api/membership/members/${encodeURIComponent(n)}`

export const membershipApi = {
  search: (q: string) => api.get<MemberSearchPage>(`/api/membership/members?q=${encodeURIComponent(q.trim())}`),
  get: (n: string) => api.get<MemberDetail>(base(n)),
  /** Legacy Pre / Next: the neighbouring membership number. */
  next: (n: string) => api.get<{ number: string }>(`${base(n)}/next`),
  previous: (n: string) => api.get<{ number: string }>(`${base(n)}/previous`),
  amendments: (n: string) => api.get<MemberAmendment[]>(`${base(n)}/amendments`),
  cases: (n: string) => api.get<MemberCase[]>(`${base(n)}/cases`),
  caseHistory: (n: string) => api.get<MemberCaseHistory>(`${base(n)}/case-history`),
  coveredPersons: (n: string) => api.get<CoveredPerson[]>(`${base(n)}/covered-persons`),
  benefits: (n: string) => api.get<MemberBenefits>(`${base(n)}/benefits`),
  memberHistory: (n: string) => api.get<MemberHistory>(`${base(n)}/member-history`),
  fees: (n: string) => api.get<MemberFees>(`${base(n)}/fees`),
  nonDisclosure: (n: string) => api.get<NonDisclosureItem[]>(`${base(n)}/non-disclosure`),
  policyTerms: (n: string) => api.get<PolicyTerm[]>(`${base(n)}/policy-terms`),
  lifetimeLimit: (n: string) => api.get<LifetimeLimitRow[]>(`${base(n)}/lifetime-limit`),
  takeoverClaims: (n: string) => api.get<TakeoverClaim[]>(`${base(n)}/takeover-claims`),
  policyWording: (n: string) => api.get<PolicyWordingListing>(`${base(n)}/policy-wording`),
  policyWordingFile: (n: string, file: string) => api.blob(`${base(n)}/policy-wording/${encodeURIComponent(file)}`),
  print: (n: string, kind: 'enquiry.pdf' | 'exclusion-form.xlsx' | 'history.xlsx') => api.blob(`${base(n)}/print/${kind}`),
  accountSummary: (n: string) => api.get<MemberAccountSummary[]>(`${base(n)}/account-summary`),
  accountHistory: (n: string) => api.get<MemberAccountHistoryItem[]>(`${base(n)}/account-history`),
  exclusions: (n: string) => api.get<MemberNote[]>(`${base(n)}/exclusions`),
  remarks: (n: string) => api.get<MemberNote[]>(`${base(n)}/remarks`),
}

