import { api } from './client'
import type { CaseOption } from './caseRegistration'
import type { InvoiceCase, InvoiceEntry } from './invoices'

// Worksheet > Worksheet Enquiry (frmWorksheetEnq) and Worksheet Registration (frmNewWorksheet2010)
export interface WorksheetLine { row: number; benefitCode: string | null; label: string; limit: string | null; actual: string | null; approved: string | null; hospital: string | null; member: string | null }
export interface WorksheetInvoiceRef { index: number; invoiceNo: string; invoiceDate: string | null; payTo: string | null; amount: number; payAmount: number; inWorksheet: boolean }
export interface WorksheetVersion {
  version: number; status: string | null; worksheetStatus: string | null; worksheetStatusName: string | null; opened: string | null; closed: string | null; openedBy: string | null
  totalActual: number | null; totalApproved: number | null; payableToHospital: number | null; payableToMember: number | null; excess: number | null; balanceLimit: number | null; previousBalance: number | null
  stayType: string | null; cashType: string | null; bordxRefNo: string | null; debitCreditRefNo: string | null; debitCreditDate: string | null; payorApprovalStatus: string | null
  limitDays: Record<string, string | null>; lines: WorksheetLine[]; invoices: WorksheetInvoiceRef[]; finalApproved: number | null; limitExceeded: number | null
}
export interface WorksheetEnquiry { case: InvoiceCase; combinedRows: boolean; versions: WorksheetVersion[] }
export interface WorksheetDays { board: number; icu: number; cash: number; guardian: number; kidneyMonths: number }
export interface WorksheetCalculation {
  lines: WorksheetLine[]; daysAllowed: WorksheetDays; totalActual: number; totalApproved: number; finalApproved: number; limitExceeded: boolean
  totalHospital: number; payableToHospital: number; payableToMember: number; excess: number; annualBalance: number | null
  /** Legacy "Days/Mths@Limit(MAX)" column per grid row, e.g. "@160.00 (3/30)". */
  daysAtLimit: Record<number, string> | null
}
export interface WorksheetPreview {
  case: InvoiceCase; version: number; combinedRows: boolean; invoices: WorksheetInvoiceRef[]; claimability: string | null; claimable: boolean; sameLimit: boolean; calculation: WorksheetCalculation
}

export interface WorksheetSaveRequest {
  worksheetStatus: string; expectedFinalApproved: number | null; limitOverrides: Record<number, string>; remarks: string | null; debitCreditRemarks: string | null; note: string | null
  exGratia: boolean; payTo: string | null; bank: string | null; accountNo: string | null; address1: string | null; address2: string | null; address3: string | null
  postCode: string | null; city: string | null; state: string | null; paymentMode: string | null; attention: string | null
  gpName: string | null; lastDocDate: string | null
}
export interface WorksheetSaveResult {
  worksheetNumber: string; version: number; finalApproved: number; payableToHospital: number; payableToMember: number; excess: number; debitCreditNote: string | null; balanceAfter: number | null; invoices: number
  excessNumber: string | null
}
export const worksheetStatuses: [string, string][] = [
  ['AA', 'Accepted'], ['RR', 'Repudiated'], ['CC', 'Cancelled'], ['SA', 'Special Approval'], ['PP', 'Pay & Claim'], ['NN', 'Not Decided'], ['NA', 'Not Decided/Accepted'],
  ['NR', 'Not Decided/Repudiated'], ['PA', 'Pay&Claim/Accepted'], ['PR', 'Pay&Claim/Rejected'], ['AR', 'Accepted/Rejected'], ['RA', 'Rejected/Accepted'], ['BR', 'BTBG/Rejected'],
  ['XR', 'Recovery/Rejected'], ['AI', 'Accepted/Insurance'],
]

export interface WorksheetAdjustmentView {
  case: InvoiceCase; version: number; versions: number[]; canAmend: boolean; blockedReason: string | null; saved: WorksheetVersion; recalculated: WorksheetPreview; details: WorksheetSaveRequest
}

// The legacy form around the grid: drop-down lists, the "Invoices & Diagnosis" and "Reimbursement Not Cover" tabs.
export interface WorksheetOptions { statuses: CaseOption[]; banks: { name: string; accountDigits: number | null }[]; paymentModes: string[]; states: CaseOption[] }
export interface WorksheetCaseDetail {
  caseNumber: string; caseStatus: string | null; claimability: string | null; memberNumber: string | null; memberName: string | null; patientName: string | null; patientId: string | null
  memberType: string | null; policyNo: string | null; planCode: string | null; insurer: string | null; health: string | null; policyEffective: string | null; policyExpiry: string | null
  payor: string | null; groupCompany: string | null; hospital: string | null; admitted: string | null; discharged: string | null; caseRemark: string | null; disability: string | null
  icdCodes: string | null; address1: string | null; address2: string | null; address3: string | null; postCode: string | null; city: string | null; state: string | null
  diagnoses: { description: string | null; onset: string | null; icdCode: string | null }[]; invoices: InvoiceEntry[]; version: number
  notCovered: { key: string; label: string; amount: number }[]; lastDocDate: string | null
  /** What a saved version was saved with; null before it is saved. */
  saved: WorksheetSaveRequest | null
}

/** Documents of a saved version; each worksheet screen serves them under its own access ('worksheet' is the Excel export, the rest are PDF letters). */
export type WorksheetScreen = 'worksheet-enquiry' | 'worksheet-registration' | 'worksheet-adjustment'
export interface WorksheetDocuments { available: string[]; debitCreditNote: string | null; excessNumber: string | null; noteAmount: number }
export const worksheetDocumentNames: Record<string, string> = {
  'credit-note': 'Credit Note', 'debit-note': 'Debit Note', 'excess-letter': 'Excess Letter', 'cheque-letter': 'Cheque Letter', worksheet: 'Export',
}

const c = (no: string) => encodeURIComponent(no.trim())
export const worksheetApi = {
  enquiry: (no: string) => api.get<WorksheetEnquiry>(`/api/worksheet-enquiry/${c(no)}`),
  preview: (no: string) => api.get<WorksheetPreview>(`/api/worksheet-registration/${c(no)}/preview`),
  save: (no: string, r: WorksheetSaveRequest) => api.post<WorksheetSaveResult>(`/api/worksheet-registration/${c(no)}`, r),
  adjustment: (no: string, version?: number) => api.get<WorksheetAdjustmentView>(`/api/worksheet-adjustment/${c(no)}${version ? `?version=${version}` : ''}`),
  adjustmentCalculate: (no: string, version: number, limitOverrides: Record<number, string>) =>
    api.post<WorksheetAdjustmentView>(`/api/worksheet-adjustment/${c(no)}/${version}/calculate`, { limitOverrides }),
  amend: (no: string, version: number, r: WorksheetSaveRequest) => api.put<WorksheetSaveResult>(`/api/worksheet-adjustment/${c(no)}/${version}`, r),
  calculate: (no: string, limitOverrides: Record<number, string>) => api.post<WorksheetPreview>(`/api/worksheet-registration/${c(no)}/calculate`, { limitOverrides }),
  options: (screen: WorksheetScreen) => api.get<WorksheetOptions>(`/api/${screen}/options`),
  details: (screen: WorksheetScreen, no: string, version: number) => api.get<WorksheetCaseDetail>(`/api/${screen}/${c(no)}/${version}/details`),
  documents: (screen: WorksheetScreen, no: string, version: number) => api.get<WorksheetDocuments>(`/api/${screen}/${c(no)}/${version}/documents`),
  document: (screen: WorksheetScreen, no: string, version: number, kind: string) => api.blob(`/api/${screen}/${c(no)}/${version}/documents/${encodeURIComponent(kind)}`),
}
