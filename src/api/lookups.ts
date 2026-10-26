import { api } from './client'
import type { TrackingSummary } from './tracking'

export interface LookupField { key: string; label: string; maxLength: number; required: boolean; isKey: boolean }
export interface LookupMeta { id: string; title: string; module: string; allowDelete: boolean; fields: LookupField[] }
export interface LookupRow { key: string; values: Record<string, string | null> }

const rows = (id: string) => `/api/lookups/${id}/rows`

export const lookupApi = {
  list: () => api.get<TrackingSummary[]>('/api/lookups'),
  meta: (id: string) => api.get<LookupMeta>(`/api/lookups/${id}`),
  rows: (id: string, q: string) => api.get<LookupRow[]>(`${rows(id)}?q=${encodeURIComponent(q)}`),
  create: (id: string, values: Record<string, string>) => api.post<LookupRow>(rows(id), values),
  update: (id: string, key: string, values: Record<string, string>) => api.put<LookupRow>(`${rows(id)}?key=${encodeURIComponent(key)}`, values),
  remove: (id: string, key: string) => api.delete<{ deleted: string }>(`${rows(id)}?key=${encodeURIComponent(key)}`),
}
