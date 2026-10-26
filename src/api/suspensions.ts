import { api } from './client'

export interface Payor { code: string; name: string | null }
export interface Suspension { kind: string; code: string; remarks: string | null; payorCode: string | null; payorName: string | null; updatedBy: string | null; updatedOn: string | null }
export interface SuspensionRequest { kind: string; code: string; remarks: string; payorCode: string }

const base = '/api/maintenance/suspensions'

export const suspensionApi = {
  payors: () => api.get<Payor[]>(`${base}/payors`),
  search: (kind: string, code: string, payor: string) =>
    api.get<Suspension[]>(`${base}?kind=${encodeURIComponent(kind)}&code=${encodeURIComponent(code)}&payor=${encodeURIComponent(payor)}`),
  create: (r: SuspensionRequest) => api.post<Suspension>(base, r),
  update: (r: SuspensionRequest) => api.put<Suspension>(base, r),
  remove: (kind: string, code: string) => api.delete<{ deleted: string }>(`${base}?kind=${encodeURIComponent(kind)}&code=${encodeURIComponent(code)}`),
}
