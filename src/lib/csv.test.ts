import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('writes a BOM, CRLF lines and empty cells for null', () => {
    expect(toCsv(['A', 'B'], [['x', null], [1, 2.5]])).toBe('﻿A,B\r\nx,\r\n1,2.5\r\n')
  })
  it('quotes commas, quotes and new lines', () => {
    expect(toCsv(['A'], [['a,b'], ['say "hi"'], ['l1\nl2']])).toBe('﻿A\r\n"a,b"\r\n"say ""hi"""\r\n"l1\nl2"\r\n')
  })
  it('keeps formula-like text from running in Excel but leaves negative numbers alone', () => {
    expect(toCsv(['A'], [['=SUM(A1)'], ['-12.5'], ['@x']])).toBe("﻿A\r\n'=SUM(A1)\r\n-12.5\r\n'@x\r\n")
  })
})
