import { describe, expect, it } from 'vitest'
import { claimabilityLabels, statusLabels, withLabel } from './labels'

describe('withLabel', () => {
  it('adds the legacy description to known codes', () => {
    expect(withLabel('O', statusLabels)).toBe('O - Open')
    expect(withLabel('SS', claimabilityLabels)).toBe('SS - Special Approval')
  })
  it('keeps unknown codes and handles empty values', () => {
    expect(withLabel('Z', statusLabels)).toBe('Z')
    expect(withLabel(null, statusLabels)).toBe('')
  })
})
