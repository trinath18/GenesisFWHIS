import { api } from './client'
import type { InvoiceCase } from './invoices'

// Worksheet > Worksheet Enquiry (frmWorksheetEnq) and Worksheet Registration (frmNewWorksheet2010)
export interface WorksheetLine { row: number; benefitCode: string | null; label: string; limit: string | null; actual: string | null; approved: string | null; hospital: string | null; member: string | null }
export interface WorksheetInvoiceRef { index: number; invoiceNo: string; invoiceDate: string | null; payTo: string | null; amount: number; payAmount: number; inWorksheet: boolean }
export interface WorksheetVersion {
  version: number; status: string | null; worksheetStatus: string | null; worksheetStatusName: string | null; opened: string | null; closed: string | null; openedBy: string | null
  totalActual: number | null; totalApproved: number | null; payableToHospital: number | null; payableToMember: number | null; excess: number | null; balanceLimit: number | null; previousBalance: number | null
  stayType: string | null; cashType: string | null; bordxRefNo: string | null; debitCreditRefNo: string | null; debitCreditDate: string | null; payorApprovalStatus: string | null
  limitDays: Record<string, string | null>; lines: WorksheetLine[]; invoices: WorksheetInvoiceRef[]
}
export interface WorksheetEnquiry { case: InvoiceCase; combinedRows: boolean; versions: WorksheetVersion[] }
export interface WorksheetDays { board: number; icu: number; cash: number; guardian: number; kidneyMonths: number }
export interface WorksheetCalculation {
  lines: WorksheetLine[]; daysAllowed: WorksheetDays; totalActual: number; totalApproved: number; finalApproved: number; limitExceeded: boolean
  totalHospital: number; payableToHospital: number; payableToMember: number; excess: number; annualBalance: number | null
}
export interface WorksheetPreview {
  case: InvoiceCase; version: number; combinedRows: boolean; invoices: WorksheetInvoiceRef[]; claimability: string | null; claimable: boolean; sameLimit: boolean; calculation: WorksheetCalculation
}

export interface WorksheetSaveRequest {
  worksheetStatus: string; expectedFinalApproved: number | null; limitOverrides: Record<number, string>; remarks: string | null; debitCreditRemarks: string | null; note: string | null
  exGratia: boolean; payTo: string | null; bank: string | null; accountNo: string | null; address1: string | null; address2: string | null; address3: string | null
  postCode: string | null; city: string | null; state: string | null; paymentMode: string | null; attention: string | null
}
export interface WorksheetSaveResult {
  worksheetNumber: string; version: number; finalApproved: number; payableToHospital: number; payableToMember: number; excess: number; debitCreditNote: string | null; balanceAfter: number | null; invoices: number
}
export const worksheetStatuses: [string, string][] = [
  ['AA', 'Accepted'], ['RR', 'Repudiated'], ['CC', 'Cancelled'], ['SA', 'Special Approval'], ['PP', 'Pay & Claim'], ['NN', 'Not Decided'], ['NA', 'Not Decided/Accepted'],
  ['NR', 'Not Decided/Repudiated'], ['PA', 'Pay&Claim/Accepted'], ['PR', 'Pay&Claim/Rejected'], ['AR', 'Accepted/Rejected'], ['RA', 'Rejected/Accepted'], ['BR', 'BTBG/Rejected'],
  ['XR', 'Recovery/Rejected'], ['AI', 'Accepted/Insurance'],
]

export interface WorksheetAdjustmentView {
  case: InvoiceCase; version: number; versions: number[]; canAmend: boolean; blockedReason: string | null; saved: WorksheetVersion; recalculated: WorksheetPreview; details: WorksheetSaveRequest
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
}
