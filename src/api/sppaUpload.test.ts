import { describe, expect, it } from 'vitest'
import { isSppaClaimsFile, readSppaFile } from './sppaUpload'

describe('SPPA claims upload', () => {
  it('needs CH at positions 6-7 of the file name', () => {
    expect(isSppaClaimsFile('TEFWMCH002345.TXT')).toBe(true)
    expect(isSppaClaimsFile('tefwmch1.txt')).toBe(true)
    expect(isSppaClaimsFile('ETFWMMW002812.TXT')).toBe(false)
    expect(isSppaClaimsFile('CH.TXT')).toBe(false)
  })

  it('reads the file as Windows-1252 text', async () => {
    const file = new File([new Uint8Array([0x41, 0x7c, 0xe9])], 'TEFWMCH1.TXT')
    expect(await readSppaFile(file)).toEqual({ fileName: 'TEFWMCH1.TXT', content: 'A|é' })
  })
})
