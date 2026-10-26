import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'

/** Standard "are you sure" step for every write screen (the legacy forms asked "Do you want to update the record?"). */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Yes', busy, onConfirm, onCancel }: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><DialogContentText>{message}</DialogContentText></DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button onClick={onConfirm} disabled={busy} variant="contained" autoFocus>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}
