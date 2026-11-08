import { describe, expect, it } from 'vitest'
import { isoDate, maskDmy, toDmy, toIso } from './dates'

describe('dd/mm/yyyy dates', () => {
  it('converts both ways and rejects impossible dates', () => {
    expect(toIso('31/12/2023')).toBe('2023-12-31')
    expect(toDmy('2023-02-01')).toBe('01/02/2023')
    expect(toIso('31/02/2023')).toBe('')
    expect(toIso('1/2/2023')).toBe('')
    expect(toIso('01/01/1800')).toBe('')
    expect(toDmy('')).toBe('')
  })
  it('reads dates with a time or already formatted, as the API can send them', () => {
    expect(toDmy('2016-06-13T00:00:00')).toBe('13/06/2016')
    expect(toDmy('2016-06-13T08:30:00.000Z')).toBe('13/06/2016')
    expect(toDmy('2016-06-13 00:00:00')).toBe('13/06/2016')
    expect(toDmy('13/06/2016')).toBe('13/06/2016')
    expect(isoDate('13/06/2016')).toBe('2016-06-13')
    expect(toDmy(null)).toBe('')
    expect(toDmy('not a date')).toBe('')
  })
  it('masks typed digits', () => {
    expect(maskDmy('0102')).toBe('01/02/')
    expect(maskDmy('01022023')).toBe('01/02/2023')
    expect(maskDmy('01/02/20x23')).toBe('01/02/2023')
    expect(maskDmy('')).toBe('')
  })
})
