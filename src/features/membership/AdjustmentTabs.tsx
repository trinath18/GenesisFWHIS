import { Alert, Box, Button, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { adjustmentApi } from '../../api/adjustment'
import type { CoveredPerson, MemberAmendment, MemberHistoryItem } from '../../api/membership'
import { Field, FieldGrid, QueryTable, RowsTable, type Column } from '../../components/DataTables'
import { formatDate, formatMoney } from '../../lib/format'

const amendmentColumns: Column<MemberAmendment>[] = [
  { header: 'Bordx date', cell: (r) => formatDate(r.bordxDate) }, { header: 'Batch no', cell: (r) => r.batchNo }, { header: 'Amend date', cell: (r) => formatDate(r.amendDate) },
  { header: 'Type', cell: (r) => r.type }, { header: 'Effective date', cell: (r) => formatDate(r.effectiveDate) },
]

/** Legacy tab "Adjustment History" (lstAdjustmentHis, table MBMAmendHistory). */
export function AdjustmentHistoryTab({ number }: { number: string }) {
  return <QueryTable query={useQuery({ queryKey: ['adj-amendments', number], queryFn: () => adjustmentApi.amendments(number) })} columns={amendmentColumns} empty="No adjustments recorded." />
}

const coveredColumns: Column<CoveredPerson>[] = [
  { header: 'Cover', cell: (r) => r.coverId }, { header: 'Name', cell: (r) => r.name }, { header: 'IC', cell: (r) => r.icBcPp }, { header: 'Birth date', cell: (r) => formatDate(r.dateOfBirth) },
  { header: 'Sex', cell: (r) => r.sex }, { header: 'A/C', cell: (r) => r.adultChild }, { header: 'Rel', cell: (r) => r.relationship }, { header: 'Status', cell: (r) => r.status }, { header: 'Plan', cell: (r) => r.planCode },
  { header: 'Effective', cell: (r) => formatDate(r.effectiveDate) }, { header: 'Expiry', cell: (r) => formatDate(r.expiryDate) }, { header: 'Cancel date', cell: (r) => formatDate(r.cancelDate) },
  { header: 'Annual limit', cell: (r) => formatMoney(r.annualLimit), align: 'right' }, { header: 'Premium', cell: (r) => formatMoney(r.premium), align: 'right' },
]

/** The covered persons list of the legacy Supplementary tab (lstCovAdd). */
export function CoveredPersonsList({ number }: { number: string }) {
  return <QueryTable query={useQuery({ queryKey: ['adj-covered', number], queryFn: () => adjustmentApi.coveredPersons(number) })} columns={coveredColumns} empty="No supplementary persons." />
}

/** Legacy tab "Fees" (lstFeesView): the principal's fees. */
export function FeesTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['adj-fees', number], queryFn: () => adjustmentApi.fees(number) })
  const f = q.data
  return f ? (
    <FieldGrid>
      <Field label="Basic premium" value={formatMoney(f.basicPremium)} /><Field label="Premium" value={formatMoney(f.premium)} /><Field label="Basic MCO fee" value={formatMoney(f.basicMco)} />
      <Field label="MCO fee" value={formatMoney(f.mcoFee)} /><Field label="Access fee" value={formatMoney(f.accessFee)} /><Field label="Payor MCO" value={formatMoney(f.payorMco)} /><Field label="Billed MCO" value={formatMoney(f.billedMco)} />
    </FieldGrid>
  ) : <Typography color="text.secondary">{q.isLoading ? 'Loading...' : 'No fees recorded.'}</Typography>
}

const historyColumns: Column<MemberHistoryItem>[] = [
  { header: 'Member no', cell: (r) => r.memberNumber }, { header: 'Top-up', cell: (r) => r.topupInd }, { header: 'Top-up no', cell: (r) => r.topupNumber }, { header: 'Policy no', cell: (r) => r.policyNo },
  { header: 'Payor effective', cell: (r) => formatDate(r.payorEffDate) }, { header: 'Payor expiry', cell: (r) => formatDate(r.payorExpDate) }, { header: 'Data status', cell: (r) => r.dataStatus },
  { header: 'Status', cell: (r) => r.status }, { header: 'Bordx date', cell: (r) => formatDate(r.bordxDate) },
]

/** Legacy tab "MBM History" (SearchMBMHistory06): the same person's other renewal years, found by IC (or name and birth date for short ICs). */
export function MemberHistoryTab({ number }: { number: string }) {
  const q = useQuery({ queryKey: ['adj-history', number], queryFn: () => adjustmentApi.memberHistory(number) })
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography variant="subtitle2">By IC / BC / passport</Typography>
      <RowsTable rows={q.data?.byIc ?? []} columns={historyColumns} empty={q.isLoading ? 'Loading...' : 'No other records.'} />
      <Typography variant="subtitle2">By name and birth date</Typography>
      <RowsTable rows={q.data?.byNameDob ?? []} columns={historyColumns} empty={q.isLoading ? 'Loading...' : 'No other records.'} />
    </Box>
  )
}

/** Legacy tab "Mgmt Note" (txtMgmtNotes, MBMTwo.MBMMmgtNotes). */
export function MgmtNoteTab({ number, initial }: { number: string; initial: string | null }) {
  const [text, setText] = useState(initial ?? '')
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: () => adjustmentApi.saveMgmtNote(number, text),
    onSuccess: () => { setMessage({ severity: 'success', text: 'Management note saved.' }); void qc.invalidateQueries({ queryKey: ['adj-overview', number] }) },
    onError: (e) => setMessage({ severity: 'error', text: (e as Error).message }),
  })
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <TextField multiline minRows={8} label="Management note" value={text} onChange={(e) => setText(e.target.value)} slotProps={{ htmlInput: { maxLength: 8000 } }} />
      <Box><Button variant="contained" disabled={save.isPending} onClick={() => save.mutate()}>Save note</Button></Box>
    </Box>
  )
}
