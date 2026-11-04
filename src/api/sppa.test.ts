import { describe, expect, it } from 'vitest'
import { parseTotals } from './sppa'

describe('SPPA export', () => {
  it('reads the batch totals header', () => {
    expect(parseTotals('3,1120.00,4,2,4,2,1,1,1')).toEqual({ bills: 3, claimAmount: 1120, benefitLines: 4, paymentHeaders: 2, paymentDetails: 4, admissions: 2, notes: 1, paymentSlips: 1, requests: 1 })
    expect(parseTotals(null)).toBeNull()
    expect(parseTotals('1,2')).toBeNull()
  })
})
