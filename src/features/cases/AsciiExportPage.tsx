import { Alert, Box, Button, FormControlLabel, MenuItem, Paper, Radio, RadioGroup, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { asciiApi, type AsciiResult } from '../../api/caseMenu'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { download } from '../../lib/download'

const empty = { payor: '', from: '', to: '', rejected: false, reprint: false, deleted: false, endorsement: '0' }

/**
 * Legacy: Case > Claim ASCII (frmNewClaimAscii) and Case > Case ASCII (frmCaseASCII). Generates the fixed-width interface file for a payor;
 * the file is downloaded and a copy is kept in the server export folder (the legacy "File on Server").
 */
export function AsciiExportPage({ kind }: { kind: 'claim' | 'case' }) {
  const payors = useQuery({ queryKey: ['ascii-payors'], queryFn: asciiApi.payors })
  const [f, setF] = useState(empty)
  const [confirming, setConfirming] = useState(false)
  const [last, setLast] = useState<AsciiResult | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const claim = kind === 'claim'
  const dateLabel = claim ? (f.rejected ? 'Case Reg. Date' : 'Bordx Date') : 'Case Reg Date'

  const generate = useMutation({
    mutationFn: () => claim
      ? asciiApi.claim({ payor: f.payor, from: f.from, to: f.to, rejected: f.rejected, reprint: f.reprint, deleted: f.deleted })
      : asciiApi.case({ payor: f.payor, from: f.from, to: f.to, reprint: f.reprint, endorsement: f.endorsement }),
    onSuccess: (r) => {
      setConfirming(false); setLast(r); download(r.blob, r.fileName)
      setMessage({ severity: 'success', text: `File generated successfully: ${r.records} record(s), batch ${r.batch}.${r.savedTo ? ` A copy was saved as ${r.savedTo}.` : ''}` })
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: (e as Error).message.startsWith('No record') ? 'warning' : 'error', text: (e as Error).message }) },
  })
  const check = () => {
    if (!f.payor) return 'Please Enter Payor Code'
    if (!f.from) return `Please Enter ${dateLabel} Fr `
    if (!f.to) return `Please Enter ${dateLabel} To `
    if (f.from > f.to) return 'The from date is after the to date.'
    return null
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, gap: 1.5, maxWidth: 760 }}>
      <Typography variant="h5">{claim ? 'Generate ASCII - Claim' : 'Generate Case ASCII'}</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {claim && (
          <RadioGroup row value={f.rejected ? 'R' : 'A'} onChange={(e) => setF((x) => ({ ...x, rejected: e.target.value === 'R' }))}>
            <FormControlLabel value="A" control={<Radio size="small" />} label="Accepted Cases" />
            <FormControlLabel value="R" control={<Radio size="small" />} label="Rejected Cases" />
          </RadioGroup>
        )}
        <TextField select size="small" label="Payor" value={f.payor} onChange={(e) => setF((x) => ({ ...x, payor: e.target.value }))} sx={{ width: 360 }}>
          {(payors.data ?? []).map((p) => <MenuItem key={p.code} value={p.code}>{p.code} - {p.name}</MenuItem>)}
        </TextField>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <DateField label={dateLabel} value={f.from} onChange={(iso) => setF((x) => ({ ...x, from: iso }))} sx={{ width: 170 }} />
          <DateField label="To" value={f.to} onChange={(iso) => setF((x) => ({ ...x, to: iso }))} sx={{ width: 170 }} />
        </Box>
        {!(claim && f.rejected) && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField select size="small" label="Export" value={f.reprint ? 'R' : 'N'} onChange={(e) => setF((x) => ({ ...x, reprint: e.target.value === 'R' }))} sx={{ width: 170 }}>
              <MenuItem value="N">N - New</MenuItem><MenuItem value="R">R - Reprint</MenuItem>
            </TextField>
            {claim
              ? <TextField select size="small" label="Bordx WS" value={f.deleted ? '1' : '0'} onChange={(e) => setF((x) => ({ ...x, deleted: e.target.value === '1' }))} sx={{ width: 230 }}>
                  <MenuItem value="0">0 - New & Amendment</MenuItem><MenuItem value="1">1 - Deleted</MenuItem>
                </TextField>
              : <TextField select size="small" label="Endt Status" value={f.endorsement} onChange={(e) => setF((x) => ({ ...x, endorsement: e.target.value }))} sx={{ width: 200 }}>
                  <MenuItem value="0">0 - New</MenuItem><MenuItem value="1">1 - Deleted</MenuItem><MenuItem value="2">2 - Amendment</MenuItem>
                </TextField>}
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" disabled={generate.isPending} onClick={() => { const p = check(); if (p) setMessage({ severity: 'error', text: p }); else { setMessage(null); setConfirming(true) } }}>OK</Button>
          <Button variant="outlined" onClick={() => { setF(empty); setLast(null); setMessage(null) }}>Clear</Button>
        </Box>
        {last && <Typography variant="body2">Export File Name: <strong>{last.fileName}</strong> · Total {claim ? 'records' : 'Cases'}: {last.records}</Typography>}
      </Paper>
      <Typography variant="body2" color="text.secondary">
        {claim
          ? 'New takes the claim versions not exported yet and marks them as exported; Reprint takes the ones already exported. The file has an F header and a T trailer, like the legacy file.'
          : 'Lists the cases registered in the date range for the payor.'} Each run takes the payor's next batch number for the day.
      </Typography>
      <ConfirmDialog open={confirming} busy={generate.isPending} title="Generate ASCII" message="Are you sure?" onConfirm={() => generate.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
