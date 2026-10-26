import { api } from './client'

export interface ValidDateRanges {
  effectiveStart: string | null; effectiveEnd: string | null
  expiryStart: string | null; expiryEnd: string | null
  birthStart: string | null; birthEnd: string | null
  updatedBy?: string | null; updatedOn?: string | null
}

export const validDatesApi = {
  get: () => api.get<ValidDateRanges | null>('/api/maintenance/valid-dates'),
  save: (r: ValidDateRanges) => api.put<ValidDateRanges>('/api/maintenance/valid-dates', r),
}
