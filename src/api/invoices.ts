import { api } from './client'
import type { CaseOption } from './caseRegistration'

// Invoice > Invoice Processing (frmInvoice)
export interface InvoiceField { key: string; table: string; column: string; label: string; group: string; kind: 'Amount' | 'Days' | 'Computed'; inTotal: boolean }
export interface InvoiceFlag { key: string; column: string; label: string }
export interface InvoiceOptions { stayTypes: CaseOption[]; receiptModes: CaseOption[]; genericHospitals: string[]; fields: InvoiceField[]; flags: InvoiceFlag[] }

export interface InvoiceRequest {
  invoiceNo: string; invoiceDate: string | null; payTo: 'H' | 'M'; stayType: string; hospital: string | null; hospitalName: string | null
  receiptMode: string | null; receiptDate: string | null; followUpDate: string | null; excess: number | null; initialAmount: number | null; uhcNo: string | null
  amounts: Record<string, number | null>; chargedToMember: string[]
  othersDescription: string | null; others2Description: string | null; othersNoCoPayDescription: string | null; notPayableRemark: string | null
}
export interface InvoiceEntry extends Omit<InvoiceRequest, 'amounts' | 'payTo' | 'stayType' | 'excess'> {
  index: number; payTo: string | null; stayType: string | null; payee: string | null; payeeName: string | null; amount: number; excess: number; payAmount: number
  version: number | null; inWorksheet: boolean; inBordx: boolean; enteredBy: string | null; enteredDate: string | null; amounts: Record<string, number>
}
export interface InvoiceCase {
  caseNumber: string; memberNumber: string | null; memberName: string | null; policyNo: string | null; patientId: string | null; planCode: string | null
  hospitalCode: string | null; hospitalName: string | null; admitted: string | null; discharged: string | null; stayType: string | null
}
export interface InvoiceScreen { case: InvoiceCase; nextVersion: number; remarks: string | null; invoices: InvoiceEntry[] }

const base = '/api/case-invoices'
const c = (no: string) => `${base}/${encodeURIComponent(no.trim())}`
export const invoiceApi = {
  options: () => api.get<InvoiceOptions>(`${base}/options`),
  hospitals: (search: string) => api.get<CaseOption[]>(`${base}/hospitals?search=${encodeURIComponent(search)}`),
  get: (no: string) => api.get<InvoiceScreen>(c(no)),
  create: (no: string, r: InvoiceRequest) => api.post<InvoiceEntry>(c(no), r),
  update: (no: string, index: number, r: InvoiceRequest) => api.put<InvoiceEntry>(`${c(no)}/${index}`, r),
  remove: (no: string, index: number) => api.delete<{ deleted: number }>(`${c(no)}/${index}`),
  saveRemarks: (no: string, remarks: string) => api.put<{ updated: boolean }>(`${c(no)}/remarks`, { remarks }),
}

/** The legacy form's LostFocus formulas (same as the server's CaseInvoiceCatalog.Compute); the server recomputes on save. */
export function computeInvoice(fields: InvoiceField[], entered: Record<string, number | null>): { amounts: Record<string, number>; total: number } {
  const v: Record<string, number> = {}
  for (const f of fields) v[f.key] = f.kind === 'Computed' ? 0 : entered[f.key] ?? 0
  v.roomAmount = v.boardDays * v.roomRate; v.roomTotal = v.roomAmount + v.roomTax
  v.icuAmount = v.icuDays * v.icuRate; v.icuTotal = v.icuAmount + v.icuTax
  v.preDiagnostic = v.preXray + v.preLab + v.preOthers
  v.surgical = v.surgeonFee + v.surgeonPhysician + v.surgeonPost + v.surgeonWard
  v.anaesthetist = v.anaesFee + v.anaesConsultation + v.anaesWard
  v.nsPreDiagnostic = v.nsPreXray + v.nsPreLab + v.nsPreOthers
  v.inHospitalPhysician = v.physicianFee + v.physicianWard + v.procedureFee
  v.guardianAmount = v.guardianDays * v.guardianRate; v.guardianTotal = v.guardianAmount + v.guardianTax
  v.tax = v.rbTaxOld + v.icuTaxOld + v.lodgerTaxOld
  v.cashAllowance = v.cashDays * v.cashRate
  for (const k of Object.keys(v)) v[k] = Math.round(v[k] * 100) / 100
  return { amounts: v, total: Math.round(fields.filter((f) => f.inTotal).reduce((s, f) => s + v[f.key], 0) * 100) / 100 }
}
