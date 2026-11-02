/**
 * Single source of truth for menu + routes. `position` is the legacy USRAccess flag position (1-based).
 * Add each migrated module here; the menu, routes and permission checks pick it up automatically.
 */
export interface NavItem {
  path: string
  label: string
  position: number
}

export const navigation: NavItem[] = [
  { path: '/membership/enquiry', label: 'Membership Enquiry', position: 3 },
  { path: '/cases/inquiry', label: 'Case Inquiry', position: 13 },
  { path: '/maintenance/panel-hospitals', label: 'Panel Hospital Maintenance', position: 1 },
  { path: '/maintenance/valid-dates', label: 'Member Date Ranges', position: 109 },
  { path: '/maintenance/suspensions', label: 'Suspension', position: 110 },
  { path: '/membership/card-sending', label: 'Card Sending Mode', position: 1 },
  { path: '/membership/mco-pending', label: 'MCO Pending', position: 3 },
  { path: '/membership/deletion', label: 'Membership Deletion', position: 5 },
  { path: '/membership/reinstatement', label: 'Member Reinstatement', position: 1 },
  { path: '/membership/adjustment', label: 'Membership Adjustment', position: 2 },
  { path: '/membership/registration', label: 'Membership Registration', position: 1 },
  { path: '/maintenance/benefit-entry', label: 'Benefit Entry', position: 88 },
  { path: '/maintenance/benefit-listing', label: 'Benefits Listing', position: 89 },
  { path: '/maintenance/icd-selection', label: 'ICD Selection', position: 90 },
  { path: '/mco/refund-listing', label: 'MCO Refund Listing', position: 21 },
  { path: '/mco/fwhs-invoice', label: 'MCO Inv/Listing', position: 20 },
  { path: '/mco/fwhs-invoice-gst', label: 'MCO Inv/Listing GST', position: 20 },
  { path: '/mco/fwhs-invoice-sst', label: 'MCO Inv/Listing SST', position: 20 },
  { path: '/mco/manual-invoice', label: 'Invoice Manual Upd', position: 148 },
  { path: '/mco/correction', label: 'MCO Correction', position: 20 },
  { path: '/mco/receipt', label: 'Receipt MCO/Others', position: 19 },
  { path: '/mco/receipt-manual', label: 'Receipt MCO/Others (Manual)', position: 19 },
  { path: '/mco/reinstatement', label: 'MCO Reinstatement', position: 1 },
  { path: '/mco/date-correction', label: 'Date Correction', position: 20 },
  { path: '/cases/registration', label: 'Case Registration', position: 11 },
  { path: '/cases/adjustment', label: 'Case Adjustment', position: 12 },
  { path: '/cases/transfer', label: 'Case Transfer', position: 11 },
  { path: '/cases/temp-transfer', label: 'Temp Case Transfer', position: 11 },
  { path: '/cases/payclaim', label: 'Case PayClaim', position: 11 },
  { path: '/cases/lifetime-limit', label: 'Lifetime Lmt Upgrade', position: 11 },
  { path: '/invoices/processing', label: 'Invoice Processing', position: 22 },
  { path: '/worksheets/registration', label: 'Worksheet Registration', position: 64 },
  { path: '/worksheets/enquiry', label: 'Worksheet Enquiry', position: 13 },
  { path: '/worksheets/adjustment', label: 'Worksheet Adjustment', position: 65 },
  { path: '/cases/audit-review', label: 'Case Audit Review', position: 16 },
  { path: '/cases/send-to-bordx', label: 'Send to Bordx Unit', position: 154 },
  { path: '/cases/non-disclosure', label: 'Non-Disclosure Info', position: 11 },
  { path: '/cases/claim-ascii', label: 'Claim ASCII', position: 18 },
  { path: '/cases/case-ascii', label: 'Case ASCII', position: 18 },
  { path: '/cases/send-to-claims-rep', label: 'Send to Claims (Rep)', position: 154 },
  { path: '/cases/cru-send-to-claims', label: 'CRU Send to Claims', position: 154 },
  { path: '/hospitals', label: 'Hospitals (report demo)', position: 3 },
]






















