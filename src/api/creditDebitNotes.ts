import { api } from './client'

// Worksheet > Generate Credit/Debit Note (legacy frmGenerateCNNote): a credit note for a claim paying the member, a debit note for one recovering from the member.
export interface ClaimNote {
  caseNumber: string; version: number; actual: number; approved: number; payableToHospital: number; payableToMember: number; noteNo: string | null; noteDate: string | null
  problem: string | null; kind: 'Credit' | 'Debit' | null
}
export interface ClaimNoteListing { claims: ClaimNote[]; truncated: boolean }

const url = '/api/worksheets/credit-debit-note'
export const creditDebitNoteApi = {
  find: (caseNumber: string, version: number) => api.get<ClaimNote>(`${url}/${encodeURIComponent(caseNumber)}/${version}`),
  missing: () => api.get<ClaimNoteListing>(`${url}/missing`),
  generate: (caseNumber: string, version: number) => api.post<ClaimNote>(`${url}/${encodeURIComponent(caseNumber)}/${version}`, null),
}

/** The legacy label of the note box: "Debit Note" for a D... note or a claim recovering from the member, else "Credit Note". */
export const noteLabel = (n: Pick<ClaimNote, 'kind'> | null) => (n?.kind === 'Debit' ? 'Debit Note' : 'Credit Note')
