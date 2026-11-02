import { api } from './client'

export interface LeafletCriteria {
  selection: string; memberNo: string; memberFrom: string; memberTo: string; bordxDate: string; batchNo: string
  payor: string; bordxFrom: string; bordxTo: string; sequence: string
}
export interface LeafletRow { payCode: string; memberNumber: string; bordxDate: string | null; policyNo: string | null; hltCode: string | null; batchNo: number | null; name: string | null; printed: boolean }
export interface LeafletPage { rows: LeafletRow[]; truncated: boolean; printingTracked: boolean }
export interface LeafletOptions {
  selections: string[]; sequences: string[]; printOptions: string[]; exportOptions: string[]; versions: string[]
  payors: { code: string; name: string | null }[]
}

const base = '/api/membership/leaflet'

/** Query string of the non-blank criteria. */
export function leafletQuery(c: Partial<LeafletCriteria>) {
  const p = new URLSearchParams()
  Object.entries(c).forEach(([k, v]) => v?.trim() && p.set(k, v.trim()))
  return p.toString()
}

/** The request body: blank fields become null and the batch number a number. */
export function leafletBody(c: Partial<LeafletCriteria>) {
  const v = (s?: string) => (s?.trim() ? s.trim() : null)
  return {
    selection: v(c.selection), memberNo: v(c.memberNo), memberFrom: v(c.memberFrom), memberTo: v(c.memberTo), bordxDate: v(c.bordxDate),
    batchNo: v(c.batchNo) === null ? null : Number(c.batchNo), payor: v(c.payor), bordxFrom: v(c.bordxFrom), bordxTo: v(c.bordxTo), sequence: v(c.sequence),
  }
}

export const leafletApi = {
  options: () => api.get<LeafletOptions>(`${base}/options`),
  search: (c: LeafletCriteria) => api.get<LeafletPage>(`${base}?${leafletQuery(c)}`),
  searchCards: (c: Partial<LeafletCriteria>) => api.get<LeafletPage>(`${base}/cards?${leafletQuery({ ...c, selection: '' })}`),
  print: (c: LeafletCriteria, option: string, version: string) => api.postFile(`${base}/print`, { criteria: leafletBody(c), option, version }),
  exportCards: (c: Partial<LeafletCriteria>, option: string, version: string, preview: boolean) =>
    api.postFile(`${base}/cards/export`, { criteria: leafletBody({ ...c, selection: '' }), option, version, preview }),
}
