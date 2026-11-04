import { api } from './client'

// Maintenance > Security > User Permission (legacy frmUserPermissionMaintenance): users and their access string (one '0'/'1' per legacy screen position).
export interface UserSummary { code: string; name: string; lgCode: string | null; group: string | null; serviceProvider: string | null; status: string | null; authorised: string | null }
export interface UserDetail {
  code: string; name: string; lgCode: string | null; dateCreated: string | null; status: string | null; authorised: string | null; group: string | null; serviceProvider: string | null
  access: string; mustChangePassword: boolean
}
export interface UserSaveRequest {
  code: string; name: string | null; lgCode: string | null; password: string | null; group: string | null; serviceProvider: string | null; status: string | null; authorised: string | null
  access: string | null
}
export interface AccessPosition { position: number; caption: string; module: string; usedBy: string }
export interface UserMaintenanceOptions { groups: { code: string; name: string }[]; serviceProviders: { code: string; name: string }[]; positions: AccessPosition[] }

const url = '/api/maintenance/users'
export const userApi = {
  options: () => api.get<UserMaintenanceOptions>(`${url}/options`),
  list: (search: string) => api.get<UserSummary[]>(`${url}?search=${encodeURIComponent(search)}`),
  get: (code: string) => api.get<UserDetail>(`${url}/${encodeURIComponent(code)}`),
  create: (r: UserSaveRequest) => api.post<UserDetail>(url, r),
  update: (r: UserSaveRequest) => api.put<UserDetail>(`${url}/${encodeURIComponent(r.code)}`, r),
  remove: (code: string) => api.delete<{ deleted: string }>(`${url}/${encodeURIComponent(code)}`),
}

/** The positions granted in an access string ('1' at position-1). */
export const grantedSet = (access: string) => new Set([...access].flatMap((c, i) => (c === '1' ? [i + 1] : [])))

/** The access string for the check boxes: one flag per position up to `count` (the server keeps any flags beyond them). */
export const toAccess = (granted: Set<number>, count: number) => Array.from({ length: count }, (_, i) => (granted.has(i + 1) ? '1' : '0')).join('')

/** The positions grouped by module, in position order within each module and modules in order of their first position. */
export function byModule(positions: AccessPosition[]): [string, AccessPosition[]][] {
  const groups = new Map<string, AccessPosition[]>()
  for (const p of [...positions].sort((a, b) => a.position - b.position)) groups.set(p.module, [...(groups.get(p.module) ?? []), p])
  return [...groups.entries()]
}
