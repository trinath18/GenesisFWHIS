import { api } from './client'

export interface Hospital {
  code: string
  name: string
  town: string | null
  state: string | null
  telephone: string | null
  email: string | null
  status: string | null
}

const query = (search: string) => (search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '')

export const hospitalsApi = {
  list: (search: string) => api.get<Hospital[]>(`/api/reports/hospitals${query(search)}`),
  pdf: (search: string) => api.blob(`/api/reports/hospitals.pdf${query(search)}`),
  xlsx: (search: string) => api.blob(`/api/reports/hospitals.xlsx${query(search)}`),
}
