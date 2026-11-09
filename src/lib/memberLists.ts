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


/** Malaysia's two-digit state codes, held by group company records (and so by worksheets copied from them); members' own records hold the name. */
const STATE_CODES: Record<string, string> = {
  '01': 'JOHOR', '02': 'KEDAH', '03': 'KELANTAN', '04': 'MELAKA', '05': 'NEGERI SEMBILAN', '06': 'PAHANG', '07': 'PENANG', '08': 'PERAK', '09': 'PERLIS',
  '10': 'SELANGOR', '11': 'TERENGGANU', '12': 'SABAH', '13': 'SARAWAK', '14': 'KUALA LUMPUR', '15': 'WILAYAH PERSEKUTUAN', '16': 'WILAYAH PERSEKUTUAN',
}
/** "10 - SELANGOR" for a two-digit state code; anything else as it is. */
export const stateCaption = (state: string) => (STATE_CODES[state.trim()] ? `${state.trim()} - ${STATE_CODES[state.trim()]}` : state)
