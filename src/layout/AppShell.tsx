import { AppBar, Box, Button, Drawer, List, ListItemButton, ListItemText, ListSubheader, Toolbar, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { lookupApi } from '../api/lookups'
import { summaryApi } from '../api/summary'
import { trackingApi } from '../api/tracking'
import { navigation } from '../config/navigation'

const drawerWidth = 260

export function AppShell() {
  const { user, logout, can } = useAuth()
  const items = navigation.filter((n) => can(n.position))
  const tracking = useQuery({ queryKey: ['tracking', 'menu', user?.userId], queryFn: trackingApi.list, enabled: !!user })
  const summaries = useQuery({ queryKey: ['summary', 'menu', user?.userId], queryFn: summaryApi.list, enabled: !!user })
  const lookups = useQuery({ queryKey: ['lookups', 'menu', user?.userId], queryFn: lookupApi.list, enabled: !!user })
  const entries = [
    ...(tracking.data ?? []).map((t) => ({ ...t, path: `/tracking/${t.id}` })),
    ...(lookups.data ?? []).map((t) => ({ ...t, path: `/lookups/${t.id}` })),
    ...(summaries.data ?? []).map((t) => ({ ...t, title: `${t.title}`, path: `/summary/${t.id}` })),
  ]
  const trackingByModule = [...entries.reduce((m, t) => m.set(t.module, [...(m.get(t.module) ?? []), t]), new Map<string, typeof entries>())]

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Genesis FIS</Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>{user?.name}</Typography>
          <Button color="inherit" onClick={logout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>
        <Toolbar />
        <List>
          <ListItemButton component={NavLink} to="/" end><ListItemText primary="Home" /></ListItemButton>
          {items.map((n) => (
            <ListItemButton key={n.path} component={NavLink} to={n.path}><ListItemText primary={n.label} /></ListItemButton>
          ))}
          {trackingByModule.map(([module, screens]) => (
            <Box key={module}>
              <ListSubheader disableSticky sx={{ lineHeight: '32px' }}>{module}</ListSubheader>
              {screens?.map((t) => (
                <ListItemButton key={t.id} component={NavLink} to={t.path} sx={{ py: 0.25 }}><ListItemText primary={t.title} slotProps={{ primary: { variant: 'body2' } }} /></ListItemButton>
              ))}
            </Box>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}





