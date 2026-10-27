import { describe, expect, it } from 'vitest'
import { containsRoute, visibleMenu, type MenuNode } from '../config/menu'
import { menuTree } from '../config/menuTree'

const tree: MenuNode[] = [
  { label: 'Membership', children: [
    { label: 'Enquiry', route: '/membership/enquiry', positions: 3 },
    { label: 'Registration', positions: [1], legacyForm: 'frmMemberEntry' },
    { label: 'Tracking', children: [{ label: 'A', route: '/t/a', positions: [6] }, { label: 'B', route: '/t/b', positions: [7] }] },
  ] },
  { label: 'Empty', children: [{ label: 'X', route: '/x', positions: [99] }] },
]
const has = (...p: number[]) => (n: number) => p.includes(n)

describe('legacy-style menu', () => {
  it('keeps groups and nested sub-menus in order and hides entries the user may not open', () => {
    const v = visibleMenu(tree, has(3, 6), false)
    expect(v.map((n) => n.label)).toEqual(['Membership'])
    expect(v[0].children?.map((c) => c.label)).toEqual(['Enquiry', 'Tracking'])
    expect(v[0].children?.[1].children?.map((c) => c.label)).toEqual(['A'])
  })

  it('hides groups that end up empty and accepts a single position as a plain number', () => {
    expect(visibleMenu(tree, has(), false)).toEqual([])
    expect(visibleMenu(tree, has(3), false)[0].children?.map((c) => c.label)).toEqual(['Enquiry'])
  })

  it('shows not-yet-migrated legacy entries only when asked to', () => {
    expect(visibleMenu(tree, has(1, 3), true)[0].children?.map((c) => c.label)).toEqual(['Enquiry', 'Registration'])
    expect(visibleMenu(tree, has(1, 3), false)[0].children?.map((c) => c.label)).toEqual(['Enquiry'])
  })

  it('finds the group that holds the current page', () => {
    const [group] = visibleMenu(tree, has(3, 6), false)
    expect(containsRoute(group, '/t/a')).toBe(true)
    expect(containsRoute(group, '/nope')).toBe(false)
  })

  it('the generated legacy tree has the old top-level groups and every migrated screen of the app routes somewhere', () => {
    expect((menuTree as MenuNode[]).map((n) => n.label)).toEqual(
      ['Membership', 'MCOFees', 'Case', 'Invoice', 'Worksheet', 'Claim', 'Claim Bordx', 'A/C Export', 'Statistic', 'Payment', 'Receipt', 'Posting', 'Maintenance'])
    const routes: string[] = []
    const walk = (n: MenuNode) => { if (n.route) routes.push(n.route); (Array.isArray(n.children) ? n.children : n.children ? [n.children] : []).forEach(walk) }
    ;(menuTree as MenuNode[]).forEach(walk)
    for (const r of ['/membership/adjustment', '/cases/inquiry', '/tracking/case-tracking', '/summary/claim-cost-actual', '/lookups/member-occupation', '/lookups/benefit-subcategory', '/maintenance/suspensions'])
      expect(routes).toContain(r)
    expect(new Set(routes).size).toBe(routes.length)
  })
})
