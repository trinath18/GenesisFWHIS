import { describe, expect, it } from 'vitest'
import { leafletBody, leafletQuery, type LeafletRow } from '../../api/leaflet'
import { BATCH, isMixed, RANGE, SINGLE, selectionFields } from './leaflet'

const row = (printed: boolean): LeafletRow => ({ payCode: 'XW', memberNumber: 'A', bordxDate: null, policyNo: null, hltCode: null, batchNo: null, name: null, printed })

describe('leaflet', () => {
  it('shows the boxes of the chosen criteria selection', () => {
    expect(selectionFields(SINGLE)).toEqual({ single: true, range: false, batch: false, bordxRange: false, payor: false })
    expect(selectionFields(RANGE).range).toBe(true)
    expect(selectionFields(BATCH)).toMatchObject({ batch: true, payor: true })
  })

  it('detects a mix of printed and unprinted rows', () => {
    expect(isMixed([row(true), row(false)])).toBe(true)
    expect(isMixed([row(false), row(false)])).toBe(false)
    expect(isMixed([])).toBe(false)
  })

  it('sends only non-blank criteria and a numeric batch', () => {
    expect(leafletQuery({ selection: SINGLE, memberNo: ' A*01 ', memberFrom: '' })).toBe('selection=Single+Member&memberNo=A*01')
    expect(leafletBody({ batchNo: '6', payor: ' ', bordxDate: '2006-04-19' })).toMatchObject({ batchNo: 6, payor: null, bordxDate: '2006-04-19', memberNo: null })
  })
})
