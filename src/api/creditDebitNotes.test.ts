import { describe, expect, it } from 'vitest'
import { noteLabel } from './creditDebitNotes'

describe('credit/debit note', () => {
  it('labels the note box as the legacy form', () => {
    expect([noteLabel({ kind: 'Debit' }), noteLabel({ kind: 'Credit' }), noteLabel({ kind: null }), noteLabel(null)]).toEqual(['Debit Note', 'Credit Note', 'Credit Note', 'Credit Note'])
  })
})
