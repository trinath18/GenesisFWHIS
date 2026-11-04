import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { creditDebitNoteApi, noteLabel, type ClaimNote, type ClaimNoteListing } from '../../api/creditDebitNotes'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { formatDate, formatMoney } from '../../lib/format'

/**
 * Legacy: Worksheet > Generate Credit/Debit Note (frmGenerateCNNote). Find a claim; when it pays the member and has no note, Update generates a credit note
 * (member paid) or a debit note (member owes). "Claims without a note" lists the claims still waiting for one.
 */
export function CreditDebitNotePage() {
  const navigate = useNavigate()
  const [claimNo, setClaimNo] = useState('')
  const [version, setVersion] = useState('')
  const [claim, setClaim] = useState<ClaimNote | null>(null)
  const [missing, setMissing] = useState<ClaimNoteListing | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const fail = (e: unknown) => { setConfirm(false); setMessage({ severity: 'error', text: (e as Error).message }) }

  const find = useMutation({
    mutationFn: (key: { no: string; version: number }) => creditDebitNoteApi.find(key.no, key.version),
    onSuccess: (r) => { setClaim(r); setClaimNo(r.caseNumber); setVersion(String(r.version)) },
    onError: (e) => { setClaim(null); fail(e) },
  })
  const list = useMutation({ mutationFn: creditDebitNoteApi.missing, onSuccess: setMissing, onError: fail })
  const generate = useMutation({
    mutationFn: () => creditDebitNoteApi.generate(claim!.caseNumber, claim!.version),
    onSuccess: (r) => {
      setConfirm(false); setClaim(r); setMessage({ severity: 'success', text: `${noteLabel(r)} ${r.noteNo} generated for ${r.caseNumber}-${r.version}.` })
      setMissing((m) => (m ? { ...m, claims: m.claims.filter((c) => !(c.caseNumber === r.caseNumber && c.version === r.version)) } : m))
    }, onError: fail,
  })

  const search = () => {
    setMessage(null)
    if (!claimNo.trim()) return setMessage({ severity: 'error', text: 'Please enter claim number' })
    if (!version.trim() || Number.isNaN(Number(version))) return setMessage({ severity: 'error', text: 'Please enter version number' })
    find.mutate({ no: claimNo.trim(), version: Number(version) })
  }
  const amount = (label: string, value: number | undefined) => (
    <LegacyRow label={label} w={110}>
      <TextField size="small" sx={{ ...yellow, width: 140 }} value={value === undefined ? '' : formatMoney(value)} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} />
    </LegacyRow>
  )
  const table = { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
    '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& td.n': { textAlign: 'right' } } as const

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1, maxWidth: 900 }}>
      <LegacyTitle>Generate Credit/Debit Note</LegacyTitle>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>
        <LegacyRow label="Claim Number" w={110}>
          <TextField size="small" sx={{ ...box, width: 140 }} value={claimNo} onChange={(e) => setClaimNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search() }} />
          <Typography sx={{ fontSize: 13 }}>-</Typography>
          <TextField size="small" sx={{ ...box, width: 50 }} value={version} onChange={(e) => setVersion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search() }}
            slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-label': 'Version' } }} />
          <Button size="small" variant="contained" disabled={find.isPending} onClick={search}>Search</Button>
        </LegacyRow>
      </LegacyFrame>

      <LegacyFrame>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', columnGap: 2 }}>
          {amount('Actual Amt', claim?.actual)}
          {amount('Approved Amt', claim?.approved)}
          {amount('Payable to Hosp', claim?.payableToHospital)}
          {amount('Payable to MBM', claim?.payableToMember)}
        </Box>
      </LegacyFrame>

      <LegacyFrame>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <LegacyRow label={`${noteLabel(claim)} :`} w={110}>
            <TextField size="small" sx={{ ...yellow, width: 140 }} value={claim?.noteNo ?? ''} slotProps={{ input: { readOnly: true } }} />
            {claim?.noteDate && <Typography sx={{ fontSize: 13 }}>on {formatDate(claim.noteDate)}</Typography>}
          </LegacyRow>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" color="warning" disabled={!claim || !!claim.problem || generate.isPending} onClick={() => { setMessage(null); setConfirm(true) }}>Update</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
        {claim?.problem && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{claim.problem}</Typography>}
      </LegacyFrame>

      <LegacyFrame title="Claims without a note">
        <Box><Button size="small" variant="outlined" disabled={list.isPending} onClick={() => list.mutate()}>{missing ? 'Refresh' : 'List claims paying the member without a note'}</Button></Box>
        {missing && (
          <Paper variant="outlined" sx={{ maxHeight: '35vh', overflow: 'auto' }}>
            <Box component="table" sx={table}>
              <thead><tr><th>Claim No</th><th>Payable to MBM</th><th>Note</th><th>Approved</th></tr></thead>
              <tbody>
                {missing.claims.map((c) => (
                  <tr key={`${c.caseNumber}-${c.version}`} onClick={() => { setMessage(null); find.mutate({ no: c.caseNumber, version: c.version }) }} style={{ cursor: 'pointer' }}>
                    <td>{c.caseNumber}-{c.version}</td><td className="n">{formatMoney(c.payableToMember)}</td><td>{c.kind}</td><td className="n">{formatMoney(c.approved)}</td>
                  </tr>
                ))}
                {missing.claims.length === 0 && <tr><td colSpan={4}>Every claim paying the member has a note.</td></tr>}
              </tbody>
            </Box>
          </Paper>
        )}
        {missing && <Typography sx={{ fontSize: 13 }}>{missing.claims.length}{missing.truncated ? '+' : ''} claim(s). Click one to load it.</Typography>}
      </LegacyFrame>

      <ConfirmDialog open={confirm} busy={generate.isPending} title="Generate Credit/Debit Note"
        message={`Do you want to save the record? A ${claim?.kind === 'Debit' ? 'debit' : 'credit'} note for ${claim ? `${claim.caseNumber}-${claim.version}` : ''} (payable to member ${formatMoney(claim?.payableToMember)}).`}
        onConfirm={() => generate.mutate()} onCancel={() => setConfirm(false)} />
    </Box>
  )
}
