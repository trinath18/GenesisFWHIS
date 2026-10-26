import { api } from './client'

export interface McoPendingRow { memberNumber: string; bordxDate: string | null; newBordxDate: string | null; status: string | null }
export interface McoPendingPage { rows: McoPendingRow[]; truncated: boolean }
export interface McoPendingCriteria { memberFrom: string; memberTo: string; bordxFrom: string; bordxTo: string; status: string }

const base = '/api/membership/mco-pending'

export const mcoPendingApi = {
  search: (c: McoPendingCriteria) => {
    const p = new URLSearchParams()
    Object.entries(c).forEach(([k, v]) => v.trim() && p.set(k, v.trim()))
    return api.get<McoPendingPage>(`${base}?${p.toString()}`)
  },
  change: (status: string, members: string[]) => api.put<{ added: number; released: number; unchanged: number }>(base, { status, members }),
}
