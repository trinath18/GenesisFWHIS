import type { LeafletRow } from '../../api/leaflet'

export const SINGLE = 'Single Member', RANGE = 'Members No Range', BATCH = 'Bordereaux Batch', BORDX_RANGE = 'Bordereaux Range'

/** cboLLCriteriaSel_Click: which boxes each criteria selection shows, and whether the payor is enabled. */
export function selectionFields(selection: string) {
  return {
    single: selection === SINGLE,
    range: selection === RANGE,
    batch: selection === BATCH,
    bordxRange: selection === BORDX_RANGE,
    payor: selection === BATCH || selection === BORDX_RANGE,
  }
}

/** After a search the legacy form forces "Print All" (and shows "This range only allow to 'Print All'") when printed and unprinted rows are mixed. */
export const isMixed = (rows: LeafletRow[]) => rows.some((r) => r.printed) && rows.some((r) => !r.printed)
