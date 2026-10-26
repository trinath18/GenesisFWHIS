import { api } from './client'

export interface CardSendingCriteria {
  payor: string; memberFrom: string; memberTo: string; bordxFrom: string; bordxTo: string
  batchFrom: string; batchTo: string; sentFrom: string; sentTo: string; mode: string
}
export interface CardSendingRow { memberNumber: string; coverId: string; name: string | null; bordxDate: string | null; batchNo: number | null; sendingMode: string | null; cardDate: string | null }
export interface CardSendingPage { rows: CardSendingRow[]; principals: number; supplementary: number; truncated: boolean }
export interface CardSendingTarget { memberNumber: string; coverId: string }

const base = '/api/membership/card-sending'

export const cardSendingApi = {
  modes: () => api.get<string[]>(`${base}/modes`),
  search: (c: CardSendingCriteria) => {
    const p = new URLSearchParams()
    Object.entries(c).forEach(([k, v]) => v.trim() && p.set(k, v.trim()))
    return api.get<CardSendingPage>(`${base}?${p.toString()}`)
  },
  update: (mode: string, date: string, members: CardSendingTarget[]) => api.put<{ updated: number }>(base, { mode, date, members }),
}
