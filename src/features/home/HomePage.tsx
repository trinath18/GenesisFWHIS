import { Typography } from '@mui/material'
import { useAuth } from '../../auth/AuthContext'

export function HomePage() {
  const { user } = useAuth()
  return (
    <>
      <Typography variant="h5" gutterBottom>Welcome, {user?.name}</Typography>
      <Typography color="text.secondary">Group: {user?.group || '-'}. Choose a module from the menu.</Typography>
    </>
  )
}

export function ForbiddenPage() {
  return <Typography color="error">You do not have access to this screen.</Typography>
}
