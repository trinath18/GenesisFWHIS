import { describe, expect, it } from 'vitest'
import { byModule, grantedSet, toAccess } from './users'

describe('user permission', () => {
  it('reads and writes the access string one flag per position', () => {
    expect([...grantedSet('0101')]).toEqual([2, 4])
    expect(toAccess(new Set([1, 3]), 5)).toBe('10100')
  })
  it('groups the check boxes by module', () => {
    const g = byModule([{ position: 3, caption: 'c', module: 'B', usedBy: '' }, { position: 1, caption: 'a', module: 'A', usedBy: '' }, { position: 2, caption: 'b', module: 'B', usedBy: '' }])
    expect(g.map(([m, ps]) => [m, ps.map((p) => p.position)])).toEqual([['A', [1]], ['B', [2, 3]]])
  })
})
