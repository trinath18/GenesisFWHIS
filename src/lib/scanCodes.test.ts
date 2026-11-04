import { describe, expect, it } from 'vitest'
import { menuTree } from '../config/menuTree'
import { scanCode, scanCodeRoutes } from './scanCodes'

type Node = { route?: string; children?: Node[] }
const routes = (nodes: readonly Node[]): string[] => nodes.flatMap((n) => [...(n.route ? [n.route] : []), ...routes(n.children ?? [])])

describe('scanCode', () => {
  it('leaves claim numbers alone and maps legacy LO codes to screens', () => {
    expect(scanCode('KU02047')).toBeNull()
    expect(scanCode(' lop001 ')).toEqual({ route: '/payments/hospital' })
    expect(scanCode('LOB009')).toHaveProperty('error')
    expect(scanCode('LOX999')).toEqual({ error: 'Unknown barcode LOX999.' })
  })

  it('only points at routes that are in the menu', () => {
    const menu = new Set(routes(menuTree as readonly Node[]))
    for (const route of Object.values(scanCodeRoutes)) if (route) expect(menu.has(route), route).toBe(true)
  })
})
