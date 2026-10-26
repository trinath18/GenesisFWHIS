import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney } from './format'

describe('formatDate', () => {
  it('formats ISO dates as dd/mm/yyyy without timezone shifts', () => {
    expect(formatDate('2021-07-14T00:00:00')).toBe('14/07/2021')
    expect(formatDate('2020-12-31')).toBe('31/12/2020')
  })
  it('handles empty values', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })
})

describe('formatMoney', () => {
  it('uses thousands separators and two decimals', () => {
    expect(formatMoney(19620)).toBe('19,620.00')
    expect(formatMoney(0)).toBe('0.00')
    expect(formatMoney(null)).toBe('')
  })
})
