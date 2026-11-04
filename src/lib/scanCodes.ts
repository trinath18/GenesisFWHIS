/**
 * Legacy barcode "LO" codes (Medix.bas SearchForm). Scanning one of these into the claim / bordereau number box of Insert Worksheet or Remove Worksheet
 * opened another screen. Each code maps to the screen's new route (the route checks the user's permission as the menu does); null = that screen was
 * not migrated.
 */
export const scanCodeRoutes: Readonly<Record<string, string | null>> = {
  LOM001: '/membership/registration',
  LOM002: '/membership/adjustment',
  LOM003: '/membership/enquiry',
  LOM004: '/tracking/member-tracking',
  LOC001: '/cases/registration',
  LOC002: '/cases/adjustment',
  LOC003: '/cases/inquiry',
  LOC004: '/tracking/case-tracking',
  LOW001: '/worksheets/registration',
  LOW002: '/worksheets/adjustment',
  LOW003: '/tracking/worksheet-tracking',
  LOB001: '/bordx/insert-worksheet',
  LOB002: '/bordx/remove-worksheet',
  LOB003: '/tracking/print-bordx',
  LOB004: '/tracking/bordx-tracking',
  LOB005: '/summary/claim-summary',
  LOB006: '/summary/claim-cost-actual',
  LOB007: '/tracking/claim-report3-invoice',
  LOB008: '/tracking/claim-report4-worksheets',
  LOB009: null, // Print Bordx Excess
  LOP001: '/payments/hospital',
  LOP002: null, // Payment to Member (unused in FWHS)
  LOR001: null, // Receipt from Member (unused in FWHS)
  LOR002: '/receipts/payor',
  LOR003: null, // Receipt from MNRB (unused in FWHS)
  LOI001: '/invoices/processing',
  LOI002: '/tracking/invoice-tracking',
}

/**
 * What a typed or scanned value means: not a scan code (`null`, search as usual), a code that opens a screen (`route`), or an "LO" value that opens
 * nothing (`error`). Legacy tested the first two characters for "LO" and ignored codes it did not know.
 */
export function scanCode(value: string): { route: string } | { error: string } | null {
  const code = value.trim().toUpperCase()
  if (!code.startsWith('LO')) return null
  if (!(code in scanCodeRoutes)) return { error: `Unknown barcode ${code}.` }
  const route = scanCodeRoutes[code]
  return route ? { route } : { error: `Barcode ${code} opens a screen that is not in this application.` }
}
