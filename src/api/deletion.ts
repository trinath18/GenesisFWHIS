import { api } from './client'

export interface DeletionCriteria { health: string; payor: string; option: string; bordxFrom: string | null; bordxTo: string | null; batchNo: number | null; memberFrom: string | null; memberTo: string | null }
export interface DeletionCandidate { memberNumber: string; name: string | null; bordxDate: string | null; batchNo: number | null; memberType: string | null; insurer: string | null; coveredPersons: number; cases: number; billingRecords: number; blockedReason: string | null }
export interface DeletionPreview { candidates: DeletionCandidate[]; principals: number; coveredPersons: number; blocked: number }
export interface DeletionResult { membersDeleted: number; coveredPersonsDeleted: number; recordsArchived: number }
export interface HealthPlan { code: string; description: string | null }

const base = '/api/membership/deletion'

export const deletionApi = {
  healthPlans: () => api.get<HealthPlan[]>(`${base}/health-plans`),
  preview: (criteria: DeletionCriteria) => api.post<DeletionPreview>(`${base}/preview`, criteria),
  remove: (criteria: DeletionCriteria, expectedMembers: number) => api.post<DeletionResult>(base, { criteria, expectedMembers }),
}
