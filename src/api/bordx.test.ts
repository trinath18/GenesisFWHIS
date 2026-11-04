import { describe, expect, it } from 'vitest'
import { mixProblem, type PendingBordxClaim } from './bordx'

const claim = (caseNumber: string, payTo: string | null) => ({ caseNumber, version: 1, payTo }) as PendingBordxClaim

describe('insert worksheet', () => {
  it('keeps one payor and one pay-to per bordereau in Multiple mode', () => {
    expect(mixProblem('Multiple', [claim('LP1', 'H'), claim('LP2', 'H')])).toBeNull()
    expect(mixProblem('Multiple', [claim('LP1', 'H'), claim('AX2', 'H')])).toContain('different payors')
    expect(mixProblem('Multiple', [claim('LP1', 'H'), claim('LP2', 'M')])).toContain('hospital and member')
    expect(mixProblem('Single', [claim('LP1', 'H'), claim('AX2', 'M')])).toBeNull()
  })
})
