import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  if (user) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(userId, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper component="form" onSubmit={submit} sx={{ p: 4, width: 360, display: 'grid', gap: 2 }}>
        <Typography variant="h5">Genesis FIS</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} autoFocus required />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" variant="contained" disabled={busy}>Sign in</Button>
      </Paper>
    </Box>
  )
}
