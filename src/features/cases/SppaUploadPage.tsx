import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSppaClaimsFile, readSppaFile, sppaUploadApi, type SppaUploadFile, type SppaUploadIssue, type SppaUploadRow } from '../../api/sppaUpload'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { LegacyFrame, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'

const lbl = (text: string, w = 80) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0 }}>{text}</Typography>

/**
 * Legacy: Case > Claims ASCII (From SPPA) (frmCLMASCIIUpload2012). Picks the SPPA claims file (TEFWMCH...), then Upload registers a case and worksheet for each
 * new admission and an invoice for each bill. The new screen first lists what every line will do (the legacy form showed nothing until it finished).
 */
export function SppaUploadPage() {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<SppaUploadFile | null>(null)
  const [rows, setRows] = useState<SppaUploadRow[]>([])
  const [issues, setIssues] = useState<SppaUploadIssue[]>([])
  const [canUpload, setCanUpload] = useState(false)
  const [done, setDone] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null)

  const verify = useMutation({
    mutationFn: (f: SppaUploadFile) => sppaUploadApi.preview(f),
    onSuccess: (p) => {
      setRows(p.rows); setIssues(p.issues); setCanUpload(p.canUpload)
      setMessage(p.issues.length ? { severity: 'error', text: `The file cannot be uploaded: ${p.issues.length} problem(s).` }
        : p.canUpload ? { severity: 'info', text: `${p.newCases} new case(s), ${p.invoices} invoice(s), ${p.skipped} line(s) skipped. Click Upload to register them.` }
        : { severity: 'error', text: 'No line of the file can be uploaded.' })
    },
    onError: (e) => { setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const upload = useMutation({
    mutationFn: () => sppaUploadApi.upload(file!),
    onSuccess: (r) => {
      setConfirming(false); setRows(r.rows); setCanUpload(false); setDone(true)
      setMessage({ severity: 'success', text: `Record Import Successfully... ${r.newCases} new case(s), ${r.invoices} invoice(s), ${r.skipped} line(s) skipped.` })
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })

  const clear = () => { setFile(null); setRows([]); setIssues([]); setCanUpload(false); setDone(false); setMessage(null) }
  const pick = async (f: File | undefined) => {
    if (!f) return
    clear()
    if (!isSppaClaimsFile(f.name)) { setMessage({ severity: 'error', text: `${f.name} is not an SPPA claims file (the name needs CH at positions 6-7).` }); return }
    const read = await readSppaFile(f)
    setFile(read)
    verify.mutate(read)
  }
  const exportRows = () => download(csvBlob(['Line', 'Action', 'Case No', 'Member No', 'Payor', 'FW ID', 'Name', 'ESP Ref', 'Admitted', 'Bill No', 'Amount', 'Message'],
    rows.map((r) => [r.line, r.action, r.caseNumber, r.memberNumber, r.payorCode, r.workerUniqueNo, r.name, r.espRefNo, formatDate(r.admitted), r.billNo, r.billedAmount, r.message])),
    `${file?.fileName ?? 'sppa'}-${done ? 'uploaded' : 'preview'}.csv`)
  const busy = verify.isPending || upload.isPending
  const count = (a: SppaUploadRow['action']) => rows.filter((r) => r.action === a).length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Claims ASCII (From SPPA)</LegacyTitle>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          {lbl('File Name')}
          <TextField size="small" sx={{ ...box, width: 280 }} value={file?.fileName ?? ''} slotProps={{ htmlInput: { readOnly: true, 'aria-label': 'Claims file' } }} />
          <Button size="small" variant="outlined" sx={{ minWidth: 32, px: 0.5 }} aria-label="Choose claims file" disabled={busy} onClick={() => input.current?.click()}>&gt;</Button>
          <input hidden type="file" accept=".txt,.dat,text/plain" ref={input} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" disabled={!canUpload || busy} onClick={() => setConfirming(true)}>Upload</Button>
        </Box>
      </LegacyFrame>

      {issues.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '24vh' }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow><TableCell>Line</TableCell><TableCell>Problem</TableCell></TableRow></TableHead>
            <TableBody>{issues.map((i, n) => <TableRow key={n} sx={{ '& td': { color: 'error.main' } }}><TableCell>{i.line || ''}</TableCell><TableCell>{i.message}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ height: '46vh' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>{['Line', 'Action', 'Case No', 'Member No', 'Name', 'ESP Ref', 'Admitted', 'Bill No', 'Amount', 'Note'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.line} hover sx={r.action === 'Skipped' ? { '& td': { color: 'text.secondary' } } : undefined}>
                <TableCell>{r.line}</TableCell><TableCell>{r.action}</TableCell><TableCell>{r.caseNumber}</TableCell><TableCell>{r.memberNumber}</TableCell>
                <TableCell>{r.name}</TableCell><TableCell>{r.espRefNo}</TableCell><TableCell>{formatDate(r.admitted)}</TableCell><TableCell>{r.billNo}</TableCell>
                <TableCell align="right">{formatMoney(r.billedAmount)}</TableCell><TableCell>{r.message}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={10}>{verify.isPending ? 'Reading the file...' : 'Choose the claims file with the > button.'}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <LegacyFrame title="Status">
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {lbl('New Cases', 70)}<TextField size="small" sx={{ ...yellow, width: 70 }} value={count('New case')} slotProps={{ htmlInput: { readOnly: true } }} />
          {lbl('Invoices', 60)}<TextField size="small" sx={{ ...yellow, width: 70 }} value={rows.length - count('Skipped')} slotProps={{ htmlInput: { readOnly: true } }} />
          {lbl('Skipped', 60)}<TextField size="small" sx={{ ...yellow, width: 70 }} value={count('Skipped')} slotProps={{ htmlInput: { readOnly: true } }} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" disabled={rows.length === 0} onClick={exportRows}>Export List</Button>
          <Button size="small" variant="outlined" disabled={busy} onClick={clear}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>

      <ConfirmDialog open={confirming} busy={upload.isPending} title="Claims ASCII (From SPPA)" message={`Do you want to upload this file? ${file?.fileName ?? ''}`}
        onConfirm={() => upload.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
