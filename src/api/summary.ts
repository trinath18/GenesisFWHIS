import { api } from './client'
import type { TrackingFilterDef, TrackingFilters, TrackingResult, TrackingSummary } from './tracking'

export interface SummaryDefinition {
  id: string
  title: string
  module: string
  description: string | null
  requiresFilter: boolean
  maxDimensions: number
  filters: TrackingFilterDef[]
  dimensions: { key: string; header: string }[]
  measures: { key: string; header: string; type: string }[]
  defaultDimensions: string[]
  defaultMeasures: string[]
}

export interface SummaryOptions {
  dims: string[]
  measures: string[]
  top?: number
}

const query = (filters: TrackingFilters, o: SummaryOptions) => {
  const p = new URLSearchParams()
  p.set('dims', o.dims.join(','))
  p.set('measures', o.measures.join(','))
  if (o.top) p.set('top', String(o.top))
  Object.entries(filters).forEach(([k, v]) => v.trim() && p.set(`f.${k}`, v.trim()))
  return `?${p.toString()}`
}

export const summaryApi = {
  list: () => api.get<TrackingSummary[]>('/api/summary'),
  definition: (id: string) => api.get<SummaryDefinition>(`/api/summary/${id}`),
  run: (id: string, filters: TrackingFilters, o: SummaryOptions) => api.get<TrackingResult>(`/api/summary/${id}/run${query(filters, o)}`),
  export: (id: string, filters: TrackingFilters, o: SummaryOptions) => api.blob(`/api/summary/${id}/export.xlsx${query(filters, o)}`),
}
