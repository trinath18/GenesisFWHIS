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

const base = (n: string) => `/api/membership/members/${encodeURIComponent(n)}`

export const membershipApi = {
  search: (q: string) => api.get<MemberSearchPage>(`/api/membership/members?q=${encodeURIComponent(q.trim())}`),
  get: (n: string) => api.get<MemberDetail>(base(n)),
  amendments: (n: string) => api.get<MemberAmendment[]>(`${base(n)}/amendments`),
  cases: (n: string) => api.get<MemberCase[]>(`${base(n)}/cases`),
  caseHistory: (n: string) => api.get<MemberCase[]>(`${base(n)}/case-history`),
  accountSummary: (n: string) => api.get<MemberAccountSummary[]>(`${base(n)}/account-summary`),
  accountHistory: (n: string) => api.get<MemberAccountHistoryItem[]>(`${base(n)}/account-history`),
  exclusions: (n: string) => api.get<MemberNote[]>(`${base(n)}/exclusions`),
  remarks: (n: string) => api.get<MemberNote[]>(`${base(n)}/remarks`),
}
