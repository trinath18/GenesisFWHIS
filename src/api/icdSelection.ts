import { api } from './client'

export interface IcdCodeRow { code: string; description: string | null }
export interface IcdSelectionView { available: IcdCodeRow[]; applied: IcdCodeRow[]; availableTotal: number; appliedTotal: number }

const base = '/api/maintenance/icd-selection'

export const icdSelectionApi = {
  list: (search: string) => api.get<IcdSelectionView>(`${base}?search=${encodeURIComponent(search.trim())}`),
  select: (codes: string[]) => api.post<{ changed: number }>(`${base}/select`, { codes }),
  unselect: (codes: string[]) => api.post<{ changed: number }>(`${base}/unselect`, { codes }),
}
