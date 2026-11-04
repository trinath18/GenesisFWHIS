import { Alert, Box, Button, Checkbox, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { claimKey, removeWorksheetApi, type BordxRevise } from '../../api/bordx'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'
import { scanCode } from '../../lib/scanCodes'

const headers = ['Chk', 'Claim No', 'Claim Open Date', 'Member No', 'Patient', 'DOA', 'DOD', 'Approved Amt', 'Case Status', 'Bordx Amt']

/**
 * Legacy: Claim Bordx > Worksheet > Remove Worksheet (FrmBordxRevise, "Bordereaux Revise"). Enter a bordereau, tick the claims to take off it and click
 * Remove; the claims go back to Insert Worksheet. A bordereau already sent to the payor or MNRB cannot be changed.
 */
export function RemoveWorksheetPage() {
  const navigate = useNavigate()
  const [bordxNo, setBordxNo] = useState('')
  const [bordx, setBordx] = useState<BordxRevise | null>(null)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const fail = (e: unknown) => { setConfirm(false); setMessage({ severity: 'error', text: (e as Error).message }) }

  const load = useMutation({
    mutationFn: () => removeWorksheetApi.get(bordxNo.trim()),
    onSuccess: (r) => {
      setBordx(r); setTicked(new Set())
      setMessage(r.sent ? { severity: 'warning', text: 'This Bordx has been sent out.' } : r.claims.length === 0 ? { severity: 'warning', text: 'The bordereau has no claims.' } : null)
    },
    onError: (e) => { setBordx(null); fail(e) },
  })
  const remove = useMutation({
    mutationFn: () => removeWorksheetApi.remove(bordx!.bordxNo, bordx!.claims.filter((c) => ticked.has(claimKey(c))).map((c) => ({ caseNumber: c.caseNumber, version: c.version }))),
    onSuccess: (r) => { setConfirm(false); setMessage({ severity: 'success', text: `Record updated... ${ticked.size} claim(s) removed from ${r.bordxNo}.` }); setBordx(r); setTicked(new Set()) },
    onError: fail,
  })

  const go = () => {
    setMessage(null)
    if (!bordxNo.trim()) return setMessage({ severity: 'error', text: 'Please select a Bordx No ' })
    // Legacy: an "LO" barcode scanned into the bordereau box opens another screen (SearchForm).
    const scan = scanCode(bordxNo)
    if (scan) { setBordxNo(''); return 'route' in scan ? navigate(scan.route) : setMessage({ severity: 'error', text: scan.error }) }
    load.mutate()
  }
  const toggle = (key: string) => setTicked((t) => { const n = new Set(t); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const selected = bordx?.claims.filter((c) => ticked.has(claimKey(c))) ?? []
  const info = (label: string, value: string, w = 120) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Typography sx={{ fontSize: 13 }}>{label}</Typography>
      <TextField size="small" sx={{ ...yellow, width: w }} value={value} slotProps={{ input: { readOnly: true } }} /></Box>
  )
  const exportList = () => download(csvBlob(headers.slice(1), (bordx?.claims ?? []).map((c) => [claimKey(c), formatDate(c.openDate), c.memberNumber, c.patient, formatDate(c.admitted),
    formatDate(c.discharged), c.totalApproved.toFixed(2), c.caseStatus, c.bordxAmount.toFixed(2)])), `Bordx-${bordx?.bordxNo ?? ''}.csv`)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Bordereaux Revise</LegacyTitle>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <LegacyRow label="Bordx No" w={70}>
            <TextField size="small" sx={{ ...box, width: 140 }} value={bordxNo} onChange={(e) => setBordxNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go() }} />
            <Button size="small" variant="contained" disabled={load.isPending} onClick={go}>Go</Button>
          </LegacyRow>
          {info('Bordx Date', formatDate(bordx?.bordxDate), 110)}
          {info('Bordx Printed Date', formatDate(bordx?.printedDate), 110)}
        </Box>
      </LegacyFrame>

      <Paper variant="outlined" sx={{ maxHeight: '50vh', overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
          '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& td.n': { textAlign: 'right' } }}>
          <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {(bordx?.claims ?? []).map((c) => (
              <tr key={claimKey(c)}>
                <td><Checkbox size="small" sx={{ p: 0 }} checked={ticked.has(claimKey(c))} disabled={bordx!.sent} onChange={() => toggle(claimKey(c))} slotProps={{ input: { 'aria-label': `Tick ${claimKey(c)}` } }} /></td>
                <td>{claimKey(c)}</td><td>{formatDate(c.openDate)}</td><td>{c.memberNumber}</td><td>{c.patient}</td><td>{formatDate(c.admitted)}</td><td>{formatDate(c.discharged)}</td>
                <td className="n">{formatMoney(c.totalApproved)}</td><td>{c.caseStatus}</td><td className="n">{formatMoney(c.bordxAmount)}</td>
              </tr>
            ))}
            {!bordx && <tr><td colSpan={headers.length}>Enter a bordereau number and click Go.</td></tr>}
          </tbody>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {info('Items', bordx ? String(bordx.claims.length) : '')}
        {info('Approved Amount', bordx ? formatMoney(bordx.claims.reduce((a, c) => a + c.totalApproved, 0)) : '')}
        {info('Bordx Amount', bordx ? formatMoney(bordx.amount) : '')}
      </Box>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" color="warning" disabled={!bordx || bordx.sent || selected.length === 0 || remove.isPending} onClick={() => { setMessage(null); setConfirm(true) }}>Remove</Button>
          <Button size="small" variant="outlined" disabled={!bordx || bordx.claims.length === 0} onClick={exportList}>Print</Button>
          <Button size="small" variant="outlined" onClick={() => { setBordxNo(''); setBordx(null); setTicked(new Set()); setMessage(null) }}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>

      <ConfirmDialog open={confirm} busy={remove.isPending} title="Remove Worksheet"
        message={`You are going to remove ${selected.length} worksheet(s) (${formatMoney(selected.reduce((a, c) => a + c.bordxAmount, 0))}) from bordereaux ${bordx?.bordxNo ?? ''}. Are you sure?`}
        onConfirm={() => remove.mutate()} onCancel={() => setConfirm(false)} />
    </Box>
  )
}
