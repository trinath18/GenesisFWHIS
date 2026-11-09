import { describe, expect, it } from 'vitest'
import { codeItems, stateCaption } from './memberLists'

describe('member lists', () => {
  it('captions a two-digit state code with its name and leaves names alone', () => {
    expect(stateCaption('11')).toBe('11 - TERENGGANU')
    expect(stateCaption('SELANGOR')).toBe('SELANGOR')
  })
  it('shows codes with their names', () => {
    expect(codeItems([{ code: 'C', name: 'Chinese' }, { code: 'X', name: null }])).toEqual([['C', 'C - Chinese'], ['X', 'X']])
  })
})
