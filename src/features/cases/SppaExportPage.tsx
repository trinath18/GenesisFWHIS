import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { sppaApi, type SppaResult } from '../../api/sppa'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { download } from '../../lib/download'
import { formatMoney } from '../../lib/format'

/**
 * Legacy: Case > Claims ASCII (To SPPA) (frmCLMASCIISPPA2012) and, with `byPaymentDate`, Claims ASCII Pymt (To SPPA) (frmCLMASCIISPPAPymt). Generates one
 * batch of the pipe-delimited SPPA claim files (AH, AD, AA, AN, RD, PH, PD, PS, AB) for a date range and downloads them as a zip; the legacy form wrote them
 * to C:\SPPAClaimASCII on the user's PC. Claim files are chosen by bordereau date (or voucher date for the payment version), payment files by voucher date.
 */
export function SppaExportPage({ byPaymentDate = false }: { byPaymentDate?: boolean }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [last, setLast] = useState<SppaResult | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const dateLabel = byPaymentDate ? 'PV Date' : 'Bordx Date'

  const generate = useMutation({
    mutationFn: () => sppaApi.generate({ from: from || null, to: to || null, byPaymentDate }),
    onSuccess: (r) => {
      setConfirming(false); setLast(r); download(r.blob, r.fileName)
      setMessage({ severity: 'success', text: `File Generated Successfully... batch ${r.batch}, ${r.files.length} file(s).` })
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const tryGenerate = () => {
    setMessage(null)
    if (!from) return setMessage({ severity: 'error', text: `Please Enter ${dateLabel} Fr ` })
    if (!to) return setMessage({ severity: 'error', text: `Please Enter ${dateLabel} To ` })
    if (to < from) return setMessage({ severity: 'error', text: 'The end date is before the start date.' })
    setConfirming(true)
  }
  const t = last?.totals

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 760 }}>
      <Typography variant="h5">{byPaymentDate ? 'Claims ASCII Payment (To SPPA)' : 'Claims ASCII (To SPPA)'}</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <DateField label={`${dateLabel} from`} required value={from} onChange={setFrom} />
        <DateField label="to" required value={to} onChange={setTo} />
        <Button variant="contained" disabled={generate.isPending} onClick={tryGenerate}>Generate</Button>
      </Paper>
      <Typography variant="body2" color="text.secondary">
        {byPaymentDate
          ? 'Every file is selected by payment voucher date.'
          : 'Claim files (AH, AD, AA, AN, RD) are selected by bordereau date, payment files (PH, PD, PS) by payment voucher date.'}
        {' '}Each run takes the next claim export batch number and downloads the batch as a zip.
      </Typography>
      {last && (
        <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 0.5 }}>
          <Typography sx={{ fontWeight: 600 }}>Batch {last.batch}</Typography>
          {t && <Typography variant="body2">
            Bills {t.bills} ({formatMoney(t.claimAmount)}), benefit lines {t.benefitLines}, payment headers {t.paymentHeaders}, payment details {t.paymentDetails},
            admissions {t.admissions}, notes {t.notes}, payment slips {t.paymentSlips}, requests {t.requests}
          </Typography>}
          <Typography variant="body2" color="text.secondary">{last.files.join(', ')}</Typography>
          <Box><Button size="small" onClick={() => download(last.blob, last.fileName)}>Download again</Button></Box>
        </Paper>
      )}
      <ConfirmDialog open={confirming} busy={generate.isPending} title="Claims ASCII (To SPPA)" message={`Are you sure? ${dateLabel} ${from.split('-').reverse().join('/')} to ${to.split('-').reverse().join('/')}.`}
        onConfirm={() => generate.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
