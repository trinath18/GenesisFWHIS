import { Alert, Box, Button, Divider, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bordxUploadApi, bordxKindOf, readBordxFile, type BordxKind, type BordxUploadFile, type BordxUploadPreview } from '../../api/bordxUpload'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { LegacyFrame, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'

const lbl = (text: string, w = 120) => <Typography sx={{ fontSize: 13, width: w, flexShrink: 0 }}>{text}</Typography>
const kindNames: Record<BordxKind, string> = { MP: 'Employer policies', MW: 'Foreign workers', NP: 'New policy fees', EP: 'Endorsement fees', EX: 'Cancellation fees', EW: 'Worker endorsements' }

/**
 * Legacy: Membership > Upload Bordx (FrmNewMBMEndt2012, "Upload MBM"). Master files (ETXXXMP, ETXXXMW) and MCO billing files (ETXXXNP, EP, EX, EW), each picked
 * with its ">" button; Verify lists the problems line by line and checks the files were not uploaded before; Upload writes them all in one go.
 */
export function BordxUploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<Partial<Record<BordxKind, BordxUploadFile>>>({})
  const [preview, setPreview] = useState<BordxUploadPreview | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null)
  const inputs = useRef<Partial<Record<BordxKind, HTMLInputElement | null>>>({})
  const chosen = Object.values(files) as BordxUploadFile[]

  const pick = async (kind: BordxKind, file: File | undefined) => {
    if (!file) return
    setMessage(null); setPreview(null)
    if (bordxKindOf(file.name) !== kind) { setMessage({ severity: 'error', text: `Wrong File Name-${file.name}` }); return }
    const read = await readBordxFile(file)
    setFiles((f) => ({ ...f, [kind]: read }))
  }
  const verify = useMutation({
    mutationFn: () => bordxUploadApi.preview(chosen),
    onSuccess: (p) => {
      setPreview(p)
      setMessage(p.canUpload ? { severity: 'success', text: 'Verified Sucessfully...' } : { severity: 'error', text: p.issues.find((i) => i.blocking)?.message ?? 'The files cannot be uploaded.' })
    },
    onError: (e) => { setPreview(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const upload = useMutation({
    mutationFn: () => bordxUploadApi.upload(chosen),
    onSuccess: (r) => {
      setConfirming(false); setPreview(null); setFiles({})
      setMessage({ severity: 'success', text: `Record Import Successfully... ${r.files.map((f) => `${f.fileName}: ${f.records} record(s)`).join(', ')}.${r.newMemberNumbers.length ? ` ${r.newMemberNumbers.length} new member(s).` : ''}` })
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const clear = () => { setFiles({}); setPreview(null); setMessage(null) }
  const printErrors = () => download(csvBlob(['Line', 'Policy No', 'Name', 'Message', 'File'],
    (preview?.issues ?? []).map((i) => [i.line || '', i.policyNo, i.name, i.message, i.fileName])), 'bordx-upload-errors.csv')

  const slot = (kind: BordxKind) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {lbl(`File - (ETXXX${kind})`)}
      <TextField size="small" sx={{ ...box, width: 260 }} value={files[kind]?.name ?? ''} slotProps={{ htmlInput: { readOnly: true, 'aria-label': `${kind} file` } }} />
      <Button size="small" variant="outlined" sx={{ minWidth: 32, px: 0.5 }} aria-label={`Choose ${kind} file`} onClick={() => inputs.current[kind]?.click()}>&gt;</Button>
      <input hidden type="file" accept=".txt,.dat,text/plain" ref={(el) => { inputs.current[kind] = el }} onChange={(e) => { void pick(kind, e.target.files?.[0]); e.target.value = '' }} />
    </Box>
  )
  const busy = verify.isPending || upload.isPending
  const records = preview?.files.reduce((s, f) => s + f.records, 0) ?? 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>Upload MBM</LegacyTitle>
      <Tabs value={0} sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: 13 } }}>
        <Tab label="Upload Bordx" />
        <Tab label="Generate ASCII File" disabled title="Not migrated yet" />
      </Tabs>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Master Files</Typography>
        <Box sx={{ display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>{slot('MP')}{slot('MW')}</Box>
        <Divider sx={{ my: 0.5 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>MCO Billing Files</Typography>
        <Box sx={{ display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>{slot('NP')}{slot('EP')}{slot('EX')}{slot('EW')}</Box>
      </LegacyFrame>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button size="small" variant="outlined" disabled={chosen.length === 0 || busy} onClick={() => { setMessage(null); verify.mutate() }}>Verify</Button>
          <Button size="small" variant="contained" disabled={!preview?.canUpload || busy} onClick={() => setConfirming(true)}>Upload</Button>
        </Box>
      </LegacyFrame>

      {preview && preview.files.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>{['File', 'Type', 'Records', 'Insert', 'Update', 'Skipped'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {preview.files.map((f) => (
                <TableRow key={f.kind}><TableCell>{f.fileName}</TableCell><TableCell>{f.kind} - {kindNames[f.kind]}</TableCell><TableCell>{f.records}</TableCell>
                  <TableCell>{f.inserts}</TableCell><TableCell>{f.updates}</TableCell><TableCell>{f.skipped}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ height: '32vh' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>{['Line', 'Policy No', 'Name', 'Message', 'File'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(preview?.issues ?? []).map((i, n) => (
              <TableRow key={n} hover sx={i.blocking ? { '& td': { color: 'error.main' } } : undefined}>
                <TableCell>{i.line || ''}</TableCell><TableCell>{i.policyNo}</TableCell><TableCell>{i.name}</TableCell><TableCell>{i.message}</TableCell><TableCell>{i.fileName}</TableCell>
              </TableRow>
            ))}
            {!preview && <TableRow><TableCell colSpan={5}>Choose the files with the &gt; buttons and click Verify.</TableCell></TableRow>}
            {preview && preview.issues.length === 0 && <TableRow><TableCell colSpan={5}>No errors.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <LegacyFrame title="Status">
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {lbl('Total Errors', 80)}<TextField size="small" sx={{ ...yellow, width: 80 }} value={preview?.totalErrors ?? 0} slotProps={{ htmlInput: { readOnly: true } }} />
          {lbl('Total Records', 90)}<TextField size="small" sx={{ ...yellow, width: 80 }} value={records} slotProps={{ htmlInput: { readOnly: true } }} />
          {lbl('Files', 40)}<TextField size="small" sx={{ ...yellow, width: 60 }} value={chosen.length} slotProps={{ htmlInput: { readOnly: true } }} />
        </Box>
      </LegacyFrame>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button size="small" variant="outlined" disabled={!preview || preview.issues.length === 0} onClick={printErrors}>Print Err List</Button>
          <Button size="small" variant="outlined" disabled={busy} onClick={clear}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>

      <ConfirmDialog open={confirming} busy={upload.isPending} title="Upload Bordx" message={`Do you want to upload this file? ${chosen.map((f) => f.name).join(', ')}`}
        onConfirm={() => upload.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
