import { describe, expect, it } from 'vitest'
import { bordxKindOf } from './bordxUpload'

describe('bordxKindOf', () => {
  it('reads the kind from positions 6-7 of the file name', () => {
    expect(bordxKindOf('ETFWMMP002812.TXT')).toBe('MP')
    expect(bordxKindOf('etfwmew002812.txt')).toBe('EW')
    expect(bordxKindOf('ETFWMXX002812.TXT')).toBeNull()
    expect(bordxKindOf('MP.TXT')).toBeNull()
  })
})
