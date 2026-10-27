import { api } from './client'

export interface BenefitOption { code: string; description: string | null }
export interface BenefitPlanOption { code: string; health: string | null; payor: string | null }
export interface BenefitOptions { healthPlans: BenefitOption[]; insured: BenefitOption[]; plans: BenefitPlanOption[] }
export interface BenefitLine { code: string; name: string | null; days: number | null; amount: string | null; perDisability: string | null }
export interface BenefitEntry { health: string; insured: string; plan: string; effectiveDate: string; exists: boolean; lines: BenefitLine[] }
export interface BenefitSaveRequest { health: string; insured: string; plan: string; effectiveDate: string; lines: { code: string; days: number | null; amount: string | null; perDisability: string | null }[] }
export interface BenefitListingRow { code: string; name: string | null; health: string; insured: string; plan: string; effectiveDate: string | null; days: number | null; amount: string | null; perDisability: string | null }

const base = '/api/maintenance/benefits'
const key = (k: { health: string; insured: string; plan: string; effectiveDate: string }) => `health=${encodeURIComponent(k.health)}&insured=${encodeURIComponent(k.insured)}&plan=${encodeURIComponent(k.plan)}&effectiveDate=${k.effectiveDate}`

export const benefitApi = {
  options: () => api.get<BenefitOptions>(`${base}/options`),
  entry: (k: { health: string; insured: string; plan: string; effectiveDate: string }) => api.get<BenefitEntry>(`${base}/entry?${key(k)}`),
  add: (r: BenefitSaveRequest) => api.post<BenefitEntry>(`${base}/entry`, r),
  update: (r: BenefitSaveRequest) => api.put<BenefitEntry>(`${base}/entry`, r),
  remove: (k: { health: string; insured: string; plan: string; effectiveDate: string }) => api.delete<{ deleted: number }>(`${base}/entry?${key(k)}`),
  listing: (q: Record<string, string>) => api.get<BenefitListingRow[]>(`${base}/listing?${new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString()}`),
}
