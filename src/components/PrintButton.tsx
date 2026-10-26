import { Button } from '@mui/material'

export function PrintButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return <Button size="small" variant="outlined" onClick={onClick} disabled={disabled}>{label}</Button>
}
