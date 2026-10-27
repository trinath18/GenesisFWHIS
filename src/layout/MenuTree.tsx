import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { Box, Collapse, FormControlLabel, List, ListItemButton, ListItemText, Switch, Tooltip } from '@mui/material'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { containsRoute, visibleMenu, type MenuNode, type VisibleNode } from '../config/menu'
import { menuTree } from '../config/menuTree'

const storageKey = 'genesis.menu'

function load(): { open: Record<string, boolean>; showLegacy: boolean } {
  try { return { open: {}, showLegacy: false, ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') } } catch { return { open: {}, showLegacy: false } }
}

/** Sidebar menu with the same groups and sub-menus as the legacy application. Groups collapse; the group holding the current page opens itself. */
export function MenuTree({ can, tree = menuTree }: { can: (position: number) => boolean; tree?: MenuNode[] }) {
  const { pathname } = useLocation()
  const [state, setState] = useState(load)
  const save = (next: typeof state) => { setState(next); localStorage.setItem(storageKey, JSON.stringify(next)) }
  const nodes = visibleMenu(tree, can, state.showLegacy)

  const render = (node: VisibleNode, path: string, depth: number) => {
    const indent = 2 + depth * 2
    if (node.children) {
      const isOpen = state.open[path] ?? containsRoute(node, pathname)
      return (
        <Box key={path}>
          <ListItemButton onClick={() => save({ ...state, open: { ...state.open, [path]: !isOpen } })} sx={{ pl: indent, py: 0.25 }} aria-expanded={isOpen}>
            <ListItemText primary={node.label} slotProps={{ primary: { variant: depth === 0 ? 'subtitle2' : 'body2', sx: { fontWeight: depth === 0 ? 700 : 500 } } }} />
            {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </ListItemButton>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List disablePadding>{node.children.map((c, i) => render(c, `${path}/${c.label}#${i}`, depth + 1))}</List>
          </Collapse>
        </Box>
      )
    }
    if (node.route) {
      return (
        <ListItemButton key={path} component={NavLink} to={node.route} sx={{ pl: indent, py: 0.25 }}>
          <ListItemText primary={node.label} slotProps={{ primary: { variant: 'body2' } }} />
        </ListItemButton>
      )
    }
    return (
      <Tooltip key={path} title={`Not migrated yet (legacy screen ${node.legacyForm || 'n/a'})`} placement="right">
        <span>
          <ListItemButton disabled sx={{ pl: indent, py: 0.25 }}><ListItemText primary={node.label} slotProps={{ primary: { variant: 'body2' } }} /></ListItemButton>
        </span>
      </Tooltip>
    )
  }

  return (
    <>
      <List disablePadding>{nodes.map((n, i) => render(n, `${n.label}#${i}`, 0))}</List>
      <Box sx={{ px: 2, py: 1 }}>
        <FormControlLabel control={<Switch size="small" checked={state.showLegacy} onChange={(e) => save({ ...state, showLegacy: e.target.checked })} />}
          label="Show legacy items not yet migrated" slotProps={{ typography: { variant: 'caption' } }} />
      </Box>
    </>
  )
}
