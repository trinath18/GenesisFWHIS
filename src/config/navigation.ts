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
  { path: '/hospitals', label: 'Hospitals (report demo)', position: 3 },
]
















