import { api } from './client'

// Case > Claims ASCII (To SPPA) / Claims ASCII Pymt (To SPPA) (legacy frmCLMASCIISPPA2012 / frmCLMASCIISPPAPymt): one batch of SPPA claim files as a zip.
export interface SppaRequest { from: string | null; to: string | null; byPaymentDate: boolean }
/** The AB totals: bills and their amount, benefit lines, then the line counts of PH, PD, AA, AN, PS and RD. */
export interface SppaTotals { bills: number; claimAmount: number; benefitLines: number; paymentHeaders: number; paymentDetails: number; admissions: number; notes: number; paymentSlips: number; requests: number }
export interface SppaResult { blob: Blob; fileName: string; batch: string; files: string[]; totals: SppaTotals | null }

/** Reads the X-Totals header ("bills,amount,benefit lines,PH,PD,AA,AN,PS,RD"). */
export function parseTotals(header: string | null): SppaTotals | null {
  const v = (header ?? '').split(',').map(Number)
  if (v.length !== 9 || v.some((n) => Number.isNaN(n))) return null
  const [bills, claimAmount, benefitLines, paymentHeaders, paymentDetails, admissions, notes, paymentSlips, requests] = v
  return { bills, claimAmount, benefitLines, paymentHeaders, paymentDetails, admissions, notes, paymentSlips, requests }
}

export const sppaApi = {
  generate: async (r: SppaRequest): Promise<SppaResult> => {
    const res = await api.postFile('/api/case-ascii/sppa', r)
    return { blob: res.blob, fileName: res.fileName, batch: res.headers.get('X-Batch') ?? '', files: (res.headers.get('X-Files') ?? '').split(',').filter(Boolean), totals: parseTotals(res.headers.get('X-Totals')) }
  },
}
