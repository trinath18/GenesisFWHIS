import { api } from './client'

export interface HospitalPanel { code: string; description: string | null; payor: string | null; healthType: string | null }
export interface PanelHospital { hospitalCode: string; name: string | null; telephone: string | null; fax: string | null; address1: string | null; address2: string | null; address3: string | null; town: string | null; state: string | null }
export interface AvailableHospital { hospitalCode: string; name: string | null; telephone: string | null; fax: string | null }
export interface PanelHospitalChange { add: string[]; remove: string[] }
export interface PanelHospitalChangeResult { added: number; refreshed: number; removed: number }

const base = '/api/maintenance/panel-hospitals'
const q = (panel: string) => `panel=${encodeURIComponent(panel)}`

export const panelHospitalsApi = {
  panels: () => api.get<HospitalPanel[]>(base),
  members: (panel: string) => api.get<PanelHospital[]>(`${base}/members?${q(panel)}`),
  available: (panel: string, search: string) => api.get<AvailableHospital[]>(`${base}/available?${q(panel)}&q=${encodeURIComponent(search)}`),
  apply: (panel: string, change: PanelHospitalChange) => api.put<PanelHospitalChangeResult>(`${base}?${q(panel)}`, change),
}
