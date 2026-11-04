import { api } from './client'

export interface TrackingSummary {
  id: string
  title: string
  module: string
  screenPosition: number
  description: string | null
}

export interface TrackingFilterDef {
  key: string
  label: string
  kind: 'Exact' | 'Integer' | 'Prefix' | 'Contains' | 'DateRange' | 'TextRange' | 'NumberRange' | 'Choice'
  choices: { value: string; label: string }[] | null
}

export interface TrackingColumnDef {
  key: string
  header: string
  type: 'text' | 'date' | 'money' | 'number'
}

export interface TrackingDefinition {
  id: string
  title: string
  module: string
  description: string | null
  maxRows: number
  requiresFilter: boolean
  /** Printouts beside the listing (e.g. Print Label), made from the same filters. */
  prints?: { key: string; label: string }[]
  filters: TrackingFilterDef[]
  columns: TrackingColumnDef[]
}

export interface TrackingResult {
  columns: { key: string; header: string; type: string }[]
  rows: (string | number | null)[][]
  truncated: boolean
}

export type TrackingFilters = Record<string, string>

const query = (filters: TrackingFilters) => {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => v.trim() && p.set(`f.${k}`, v.trim()))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const trackingApi = {
  list: () => api.get<TrackingSummary[]>('/api/tracking'),
  definition: (id: string) => api.get<TrackingDefinition>(`/api/tracking/${id}`),
  search: (id: string, filters: TrackingFilters) => api.get<TrackingResult>(`/api/tracking/${id}/search${query(filters)}`),
  export: (id: string, filters: TrackingFilters) => api.blob(`/api/tracking/${id}/export.xlsx${query(filters)}`),
  print: (id: string, key: string, filters: TrackingFilters) => api.blob(`/api/tracking/${id}/print/${encodeURIComponent(key)}.pdf${query(filters)}`),
}

