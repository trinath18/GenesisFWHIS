import { useQuery } from '@tanstack/react-query'
import { registrationApi, type CodeOption } from '../api/registration'

/** Salutations of the principal member (Registration). */
export const PRINCIPAL_SALUTATIONS = ['MR', 'MRS', 'MS', 'MISS', 'DR', 'DATO', 'DATIN', 'TAN SRI', 'PUAN']
/** Salutations of the legacy adjustment form and of covered persons (frmNewMBMAdjustment, frmMemberRegistration). */
export const ADJUSTMENT_SALUTATIONS = ['MR', 'MS', 'MRS']
export const COVERED_SALUTATIONS = ['MR', 'MS', 'MDM', 'MRS']
export const MARITAL_STATUSES: [string, string][] = [['S', 'S - Single'], ['M', 'M - Married']]

/** City, state, race, nationality and relationship lists, loaded once and shared by every screen. */
export function useMemberLists() {
  return useQuery({ queryKey: ['member-lists'], queryFn: registrationApi.lists, staleTime: Infinity })
}

/** "C - Chinese" items of a code list. */
export const codeItems = (list: CodeOption[] | undefined): [string, string][] => (list ?? []).map((o) => [o.code, o.name ? `${o.code} - ${o.name}` : o.code])
/** Items whose code and caption are the same (salutations). */
export const plainItems = (list: string[]): [string, string][] => list.map((v) => [v, v])

