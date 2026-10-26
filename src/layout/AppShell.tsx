import { AppBar, Box, Button, Drawer, List, ListItemButton, ListItemText, Toolbar, Typography } from '@mui/material'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { navigation } from '../config/navigation'

const drawerWidth = 220

export function AppShell() {
  const { user, logout, can } = useAuth()
  const items = navigation.filter((n) => can(n.position))

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
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
