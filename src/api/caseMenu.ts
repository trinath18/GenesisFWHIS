import { api } from './client'
import type { CaseAdjustmentView, CaseOption } from './caseRegistration'

// Case > Lifetime Lmt Upgrade (frmMembershipLifetimeLmt)
export interface LifetimeMembership { memberNumber: string; coverId: string; name: string | null; icNo: string | null; policyNo: string | null; effectiveDate: string | null; expiryDate: string | null; status: string | null; dataStatus: string | null }
export interface LifetimeCase { memberNumber: string; caseNumber: string; coverId: string; patientName: string | null; admitted: string | null; discharged: string | null; claimability: string | null }
export interface LifetimeLimitView {
  memberNumber: string; coverId: string; topupNumber: string | null; memberships: LifetimeMembership[]; currentCases: LifetimeCase[]; earlierYearCases: LifetimeCase[]
  allocated: boolean; lifetimeLimit: number | null; hasClaimsHistory: boolean; qualified: boolean; status: string
}
const lt = '/api/lifetime-limit'
const ltQuery = (m: string, c: string) => `?memberNumber=${encodeURIComponent(m)}&coverId=${encodeURIComponent(c)}`
export const lifetimeLimitApi = {
  get: (m: string, c: string) => api.get<LifetimeLimitView>(`${lt}${ltQuery(m, c)}`),
  allocate: (m: string, c: string) => api.post<{ lifetimeLimit: number; message: string }>(`${lt}${ltQuery(m, c)}`, {}),
}

// Case > Case Audit Review (frmCaseAuditReview)
export interface CaseAuditRecord {
  status: string; discountType: string; invoiceNo: string | null; invoiceDate: string | null; invoiceAmount: number | null; letterSent: string | null; hospitalReply: string | null; visitDate: string | null; visitTime: string | null
  officer: string | null; visitRemarks: string | null; discountReceived: number | null; dateToClaims: string | null; openDate: string | null; answer: string | null; remarks: string | null; reviewAudit: string | null; updatedBy: string | null; updated: string | null
}
export interface CaseAuditPayment { pvNumber: string | null; pvDate: string | null; paidAmount: number | null }
export interface CaseAuditView { caseNumber: string; case: CaseAdjustmentView; audit: CaseAuditRecord | null; payments: CaseAuditPayment[] }
export type CaseAuditRequest = Omit<CaseAuditRecord, 'updatedBy' | 'updated'>
const ar = '/api/case-audit-review'
export const caseAuditReviewApi = {
  get: (c: string) => api.get<CaseAuditView>(`${ar}/${encodeURIComponent(c)}`),
  /** Next on an empty box gives the first case (legacy CmdNext). */
  next: (c: string, reviewedOnly = false) =>
    api.get<{ caseNumber: string }>(`${ar}/${c.trim() ? `${encodeURIComponent(c.trim())}/next` : 'first'}${reviewedOnly ? '?reviewedOnly=true' : ''}`),
  previous: (c: string) => api.get<{ caseNumber: string }>(`${ar}/${encodeURIComponent(c)}/previous`),
  save: (c: string, r: CaseAuditRequest) => api.put<{ updated: boolean }>(`${ar}/${encodeURIComponent(c)}`, r),
}

// Case > Send to Bordx Unit (FrmCSSendtoClaim)
export interface BordxSearchRequest {
  caseNoFrom: string | null; caseNoTo: string | null; exactCase: boolean; bordxFrom: string | null; bordxTo: string | null; versionFrom: number | null; versionTo: number | null; caseStatus: string | null; claimability: string | null
  department: string | null; passedBy: string | null; regFrom: string | null; regTo: string | null; admFrom: string | null; admTo: string | null; disFrom: string | null; disTo: string | null; dpoFrom: string | null; dpoTo: string | null
  bordxDateFrom: string | null; bordxDateTo: string | null; noAdmissionDate: boolean; noRegDate: boolean; noDischargeDate: boolean; noDpo: boolean; payor: string | null; stayType: string | null; cashType: string | null
}
export interface BordxRow {
  passed: boolean; caseNumber: string; version: number; memberNumber: string; patientName: string | null; registered: string | null; admitted: string | null; discharged: string | null; dpo: string | null; days: number | null
  batch: string | null; passedBy: string | null; openedBy: string | null; hospital: string | null; claimStatus: string | null; bordxRefNo: string | null; bordxDate: string | null; bordxAmount: number | null; stayType: string | null; cashType: string | null
}
const bx = '/api/case-send-to-bordx'
export const sendToBordxApi = {
  options: () => api.get<{ payors: CaseOption[]; passedBy: string[] }>(`${bx}/options`),
  search: (r: BordxSearchRequest) => api.post<{ rows: BordxRow[]; truncated: boolean }>(`${bx}/search`, r),
  pass: (items: { caseNumber: string; version: number }[]) => api.post<{ batch: string; count: number; message: string }>(`${bx}/pass`, { items }),
  amend: (c: string, version: number, dpo: string | null) => api.put<{ updated: boolean }>(`${bx}/${encodeURIComponent(c)}/${version}`, { dpo }),
}

/** Legacy combo lists shared by the send-to screens. */
export const caseStatusOptions = [{ code: '0', name: 'Open' }, { code: '1', name: 'Delete' }, { code: '2', name: 'Open & Close' }]
export const deptStageOptions = [{ code: '0', name: 'Admission' }, { code: '1', name: 'Claim' }, { code: '2', name: 'Both' }]
export const worksheetClaimabilityOptions = [
  ['1A', 'All Accepted'], ['1R', 'All Repudiated'], ['AA', 'Accepted'], ['RR', 'Repudiated'], ['CC', 'Cancelled'], ['SA', 'Special Approval'], ['PP', 'Pay & Claim'], ['NN', 'Not Decided'],
  ['NA', 'Not Decided/Accepted'], ['NR', 'Not Decided/Repudiated'], ['PA', 'Pay&Claim/Accepted'], ['PR', 'Pay&Claim/Rejected'], ['AR', 'Accepted/Rejected'], ['RA', 'Rejected/Accepted'], ['BR', 'BTBG/Rejected'], ['AI', 'Accepted/Insurance'],
].map(([code, name]) => ({ code, name }))
export const stayTypeOptions = [{ code: '0', name: 'IN-PATIENT' }, { code: '1', name: 'OUT-PATIENT' }, { code: '2', name: 'Follow-Up' }, { code: '3', name: 'Pre-hosp.' }, { code: '4', name: 'IP + OP' }, { code: '5', name: 'Fol. Up + Pre-Hosp' }]
export const cashTypeOptions = [{ code: 'C', name: 'CASHLESS' }, { code: 'R', name: 'REIMBURSEMENT' }]

// Case > Non-Disclousre Info (frmRECNonDisclosure)
export interface NonDisclosurePerson {
  memberNumber: string; coverId: string; name: string | null; policyNo: string | null; effectiveDate: string | null; expiryDate: string | null
  preExistingDate: string | null; preExistingCategory: string | null; preExistingInformedBy: string | null; underlyingDate: string | null; underlyingCategory: string | null; underlyingInformedBy: string | null
  hasDetailRecord: boolean
}
export interface NonDisclosureView { memberNumber: string; name: string | null; persons: NonDisclosurePerson[] }
export interface NonDisclosureRequest { preExistingDate: string | null; preExistingCategory: string | null; preExistingInformedBy: string | null; underlyingDate: string | null; underlyingCategory: string | null; underlyingInformedBy: string | null }
export interface MemberSearchItem { number: string; coverId: string | null; name: string; icBcPp: string | null; policyNo: string | null; status: string | null; payorEffDate: string | null; payorExpDate: string | null }
const nd = '/api/case-non-disclosure'
export const nonDisclosureApi = {
  get: (m: string) => api.get<NonDisclosureView>(`${nd}/${encodeURIComponent(m)}`),
  /** Next on an empty box gives the first member (legacy CmdNext). */
  next: (m: string) => api.get<{ memberNumber: string }>(m.trim() ? `${nd}/${encodeURIComponent(m.trim())}/next` : `${nd}/first`),
  previous: (m: string) => api.get<{ memberNumber: string }>(`${nd}/${encodeURIComponent(m)}/previous`),
  search: (q: string) => api.get<{ items: MemberSearchItem[]; truncated: boolean }>(`${nd}/search?q=${encodeURIComponent(q.trim())}`),
  save: (m: string, cover: string, r: NonDisclosureRequest) => api.put<{ message: string }>(`${nd}/${encodeURIComponent(m)}/${encodeURIComponent(cover)}`, r),
}
export const preExistingCategories = [{ code: '0', name: 'Illness' }, { code: '1', name: 'Injury' }, { code: '2', name: 'Hospitalisation' }]
export const underlyingCategories = [{ code: '0', name: 'Diabetes' }, { code: '1', name: 'Hypertension' }]

// Case > Claim ASCII (frmNewClaimAscii) and Case > Case ASCII (frmCaseASCII)
export interface ClaimAsciiRequest { payor: string; from: string; to: string; rejected: boolean; reprint: boolean; deleted: boolean }
export interface CaseAsciiRequest { payor: string; from: string; to: string; reprint: boolean; endorsement: string }
export interface AsciiResult { blob: Blob; fileName: string; records: number; batch: string; savedTo: string | null }
const ascii = '/api/case-ascii'
const asFile = async (path: string, body: unknown): Promise<AsciiResult> => {
  const r = await api.postFile(path, body)
  return { blob: r.blob, fileName: r.fileName, records: Number(r.headers.get('X-Records') ?? 0), batch: r.headers.get('X-Batch') ?? '', savedTo: r.headers.get('X-Saved-To') }
}
export const asciiApi = {
  payors: () => api.get<CaseOption[]>(`${ascii}/payors`),
  claim: (r: ClaimAsciiRequest) => asFile(`${ascii}/claim`, r),
  case: (r: CaseAsciiRequest) => asFile(`${ascii}/case`, r),
}

// Case > Send to Claims (Rep) (FrmCSRepSendtoClaim) and Case > CRU Send to Claims (FrmCRUPassOut)
export interface SendToClaimsSearch {
  caseNoFrom: string | null; caseNoTo: string | null; exactCase: boolean; caseStatus: string | null; claimability: string | null; department: string | null; passedBy: string | null; versionFrom: number | null; versionTo: number | null
  regFrom: string | null; regTo: string | null; admFrom: string | null; admTo: string | null; disFrom: string | null; disTo: string | null; dpoFrom: string | null; dpoTo: string | null
  noRegDate: boolean; noAdmissionDate: boolean; noDischargeDate: boolean; noDpo: boolean
}
export interface SendToClaimsRow {
  passed: boolean; caseNumber: string; version: number | null; memberNumber: string | null; patientName: string | null; registered: string | null; admitted: string | null; discharged: string | null; dpo: string | null; days: number | null
  batch: string | null; passedBy: string | null; openedBy: string | null; hospital: string | null; stayType: string | null; cashType: string | null; amount: number | null; claimability: string | null; deptStage: string | null; cannotPass: string | null
}
export type SendToClaimsKind = 'rep' | 'cru'
export const sendToClaimsApi = (kind: SendToClaimsKind) => {
  const base = kind === 'rep' ? '/api/case-send-to-claims-rep' : '/api/case-cru-send-to-claims'
  return {
    passedBy: () => api.get<string[]>(`${base}/passed-by`),
    search: (r: SendToClaimsSearch) => api.post<{ rows: SendToClaimsRow[]; truncated: boolean }>(`${base}/search`, r),
    passRep: (caseNumbers: string[]) => api.post<{ count: number; batch: string | null; message: string }>(`${base}/pass`, { caseNumbers }),
    passCru: (items: { caseNumber: string; version: number }[], passOutDate: string) => api.post<{ count: number; batch: string | null; message: string }>(`${base}/pass`, { items, passOutDate }),
  }
}
export const caseClaimabilityOptions = [{ code: 'A', name: 'Accepted' }, { code: 'R', name: 'Rejected' }]
export const cruDeptOptions = [{ code: '0', name: 'CRU' }, { code: '1', name: 'Claim' }, { code: '2', name: 'Both' }]
