import { api } from './client'
import type { TrackingSummary } from './tracking'

export interface LookupField {
  key: string; label: string; maxLength: number; required: boolean; isKey: boolean; kind: 'Text' | 'Money' | 'Choice' | 'Date' | 'Integer'
  choices: string[] | null; choiceLabels: string[] | null; multiline: boolean
  /** True when the drop-down is filled from a code table: load it with lookupApi.options. */
  hasOptions: boolean
  requiredWhen: { field: string; value: string } | null
}
export interface PlanBatchEntry { code: string; description: string }
export const PLAN_BATCH_MAX = 6
/** Health type whose plan codes the server generates (legacy GeneratePLNSeq). */
export const GENERATED_PLAN_HEALTH = 'N'
export interface LookupOption { value: string; label: string | null }
export interface LookupMeta { id: string; title: string; module: string; allowDelete: boolean; keyIsIdentity: boolean; generatedField?: string | null; fields: LookupField[] }
export interface LookupRow { key: string; values: Record<string, string | null> }

const rows = (id: string) => `/api/lookups/${id}/rows`

export const lookupApi = {
  list: () => api.get<TrackingSummary[]>('/api/lookups'),
  meta: (id: string) => api.get<LookupMeta>(`/api/lookups/${id}`),
  rows: (id: string, q: string) => api.get<LookupRow[]>(`${rows(id)}?q=${encodeURIComponent(q)}`),
  create: (id: string, values: Record<string, string>) => api.post<LookupRow>(rows(id), values),
  update: (id: string, key: string, values: Record<string, string>) => api.put<LookupRow>(`${rows(id)}?key=${encodeURIComponent(key)}`, values),
  /** Plan Code tab: save up to six plans sharing every field but code and description (codes are generated for health type N). */
  createPlans: (values: Record<string, string>, count: number, plans: PlanBatchEntry[]) => api.post<LookupRow[]>('/api/lookups/plan-code/batch', { values, count, plans }),
  options: (id: string, field: string) => api.get<LookupOption[]>(`/api/lookups/${id}/options/${encodeURIComponent(field)}`),
  remove: (id: string, key: string) => api.delete<{ deleted: string }>(`${rows(id)}?key=${encodeURIComponent(key)}`),
}


