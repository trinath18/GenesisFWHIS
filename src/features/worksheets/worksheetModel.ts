import type { WorksheetInvoiceRef, WorksheetLine, WorksheetPreview } from '../../api/worksheets'

/** Legacy view_bnf_cat_subcat: the benefit group shown in the merged first column of the worksheet grid. */
export function benefitGroup(code: string | null): string {
  if (!code) return ''
  if (code.startsWith('1')) return 'HOSPITAL BENEFITS'
  if (code.startsWith('2')) return 'Surgical Benefits'
  if (code.startsWith('3')) return 'Medical Benefits (Non-Surgical)'
  if (code.startsWith('4')) return 'Out-Patient Benefits'
  if (code === '501') return 'Organ Transplantation'
  if (code === '601') return 'Government'
  if (code === '701') return "CHILD'S GUARDIAN ALLOWANCE"
  if (code.startsWith('8')) return 'Others'
  if (code === '901') return 'Non-Sihat'
  return ''
}

/** Legacy grid money: "-" for zero, brackets for negatives. */
export const legacyMoney = (v: number | null | undefined) =>
  v == null || v === 0 ? '-' : v < 0 ? `(${(-v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Reads a legacy grid cell ("1,234.00", "(120.00)"); "-", blank and FULL are null. */
export function parseLegacyMoney(text: string | null | undefined): number | null {
  const t = text?.trim().replace(/,/g, '') ?? ''
  const neg = t.startsWith('(') && t.endsWith(')')
  const n = Number(neg ? t.slice(1, -1) : t)
  return t === '' || Number.isNaN(n) ? null : neg ? -n : n
}

export interface WorksheetTotals {
  totalActual: number | null; totalApproved: number | null; totalHospital: number | null; excess: number | null; limitExceeded: number | null
  finalApproved: number | null; payableToHospital: number | null; payableToMember: number | null
}

/** One worksheet version as the legacy form shows it: the calculated (or saved) grid, its totals and its invoices. */
export interface WorksheetModel {
  caseNumber: string; version: number; claimability: string | null; claimable: boolean; lines: WorksheetLine[]; daysAtLimit?: Record<number, string> | null
  totals: WorksheetTotals; annualBalance: number | null; invoices: WorksheetInvoiceRef[]
}

export function previewModel(p: WorksheetPreview): WorksheetModel {
  const c = p.calculation
  return {
    caseNumber: p.case.caseNumber, version: p.version, claimability: p.claimability, claimable: p.claimable, lines: c.lines, daysAtLimit: c.daysAtLimit,
    annualBalance: c.annualBalance, invoices: p.invoices,
    totals: {
      totalActual: c.totalActual, totalApproved: c.totalApproved, totalHospital: c.totalHospital, excess: c.excess, limitExceeded: c.limitExceeded ? c.totalApproved - c.finalApproved : 0,
      finalApproved: c.finalApproved, payableToHospital: c.payableToHospital, payableToMember: c.payableToMember,
    },
  }
}

