import Check from '@mui/icons-material/Check'
import DarkMode from '@mui/icons-material/DarkModeOutlined'
import LightMode from '@mui/icons-material/LightModeOutlined'
import Palette from '@mui/icons-material/PaletteOutlined'
import SettingsBrightness from '@mui/icons-material/SettingsBrightnessOutlined'
import { Box, Divider, IconButton, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Tooltip } from '@mui/material'
import { useState } from 'react'
import { useAppTheme, type ModePreference } from './AppThemeProvider'
import { colorThemes, type ColorThemeId } from './theme'

const modes: { id: ModePreference; label: string; icon: typeof LightMode }[] = [
  { id: 'light', label: 'Light', icon: LightMode },
  { id: 'dark', label: 'Dark', icon: DarkMode },
  { id: 'system', label: 'Same as system', icon: SettingsBrightness },
]

/** Top-bar controls: a quick light/dark toggle and a menu with the mode and colour theme. */
export function ThemeSwitcher() {
  const { mode, color, resolvedMode, setMode, setColor } = useAppTheme()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const dark = resolvedMode === 'dark'

  return (
    <>
      <Tooltip title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        <IconButton color="inherit" size="small" onClick={() => setMode(dark ? 'light' : 'dark')} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Theme">
        <IconButton color="inherit" size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="Theme" aria-haspopup="menu" sx={{ mr: 1 }}>
          <Palette fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ list: { dense: true, sx: { minWidth: 210 } } }}>
        <ListSubheader sx={{ lineHeight: '32px' }}>Appearance</ListSubheader>
        {modes.map(({ id, label, icon: Icon }) => (
          <MenuItem key={id} selected={mode === id} onClick={() => setMode(id)}>
            <ListItemIcon><Icon fontSize="small" /></ListItemIcon>
            <ListItemText>{label}</ListItemText>
            {mode === id && <Check fontSize="small" />}
          </MenuItem>
        ))}
        <Divider />
        <ListSubheader sx={{ lineHeight: '32px' }}>Colour theme</ListSubheader>
        {(Object.keys(colorThemes) as ColorThemeId[]).map((id) => (
          <MenuItem key={id} selected={color === id} onClick={() => setColor(id)}>
            <ListItemIcon>
              <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: colorThemes[id].primary, boxShadow: (t) => `0 0 0 2px ${t.palette.background.paper}, 0 0 0 3px ${colorThemes[id].primary}` }} />
            </ListItemIcon>
            <ListItemText>{colorThemes[id].label}</ListItemText>
            {color === id && <Check fontSize="small" />}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
