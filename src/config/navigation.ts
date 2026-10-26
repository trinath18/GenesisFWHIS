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
  { path: '/hospitals', label: 'Hospitals (report demo)', position: 3 },
]




