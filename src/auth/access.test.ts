import { describe, expect, it } from 'vitest'
import { isAllowed } from './access'

describe('isAllowed', () => {
  it('reads one-based flags', () => {
    expect(isAllowed('101', 1)).toBe(true)
    expect(isAllowed('101', 2)).toBe(false)
    expect(isAllowed('101', 3)).toBe(true)
  })
  it('rejects out-of-range positions and missing access', () => {
    expect(isAllowed('101', 0)).toBe(false)
    expect(isAllowed('101', 4)).toBe(false)
    expect(isAllowed(undefined, 1)).toBe(false)
  })
})
