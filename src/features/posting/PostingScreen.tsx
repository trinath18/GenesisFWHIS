import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { journalHeaders, journalRow, type PostingJournal, type PostingOptions, type PostingResult } from '../../api/posting'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DateField } from '../../components/DateField'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { csvBlob } from '../../lib/csv'
import { download } from '../../lib/download'
import { formatDate, formatMoney } from '../../lib/format'

/** The search fields every A/C Export form shares. */
export interface PostingSearchBase { posted: boolean; batchFrom: string | null; batchTo: string | null }

export interface PostingScreenProps<S extends PostingSearchBase> {
  title: string
  queryKey: string
  api: { options: () => Promise<PostingOptions>; search: (s: S) => Promise<PostingJournal>; post: (s: S, keys: string[], period: string) => Promise<PostingResult> }
  blank: S
  /** The form's own search fields. */
  filters: (s: S, set: (patch: Partial<S>) => void, options: PostingOptions | undefined) => ReactNode
  /** The legacy CmdPost checks of the search, before the confirmation. */
  postProblem: (s: S) => string | null
  /** The file the legacy form wrote the posted journal to (\\Svr-Sun2\Finance\Account Journal Import\HIS Not Posted\). */
  postedFileName: (batchNo: string, s: S) => string
  listFileName: string
  debitLabel?: string
}

/** A from / to pair of date boxes on one legacy row. */
export function DateRange({ label, from, to, onFrom, onTo, disabled }: { label: string; from: string | null; to: string | null; onFrom: (v: string | null) => void; onTo: (v: string | null) => void; disabled?: boolean }) {
  return (
    <LegacyRow label={label} w={140}>
      <DateField sx={{ ...box, width: 130 }} value={from ?? ''} disabled={disabled} onChange={(v) => onFrom(v || null)} />
      <Typography sx={{ fontSize: 13 }}>To</Typography>
      <DateField sx={{ ...box, width: 130 }} value={to ?? ''} disabled={disabled} onChange={(v) => onTo(v || null)} />
    </LegacyRow>
  )
}

/** A from / to pair of text boxes on one legacy row. */
export function TextRange({ label, from, to, onFrom, onTo, max, disabled }: { label: string; from: string | null; to: string | null; onFrom: (v: string | null) => void; onTo: (v: string | null) => void; max: number; disabled?: boolean }) {
  const t = (s: string) => (s.trim() === '' ? null : s.trim())
  return (
    <LegacyRow label={label} w={140}>
      <TextField size="small" sx={{ ...box, width: 130 }} value={from ?? ''} disabled={disabled} onChange={(e) => onFrom(t(e.target.value))} slotProps={{ htmlInput: { maxLength: max } }} />
      <Typography sx={{ fontSize: 13 }}>To</Typography>
      <TextField size="small" sx={{ ...box, width: 130 }} value={to ?? ''} disabled={disabled} onChange={(e) => onTo(t(e.target.value))} slotProps={{ htmlInput: { maxLength: max } }} />
    </LegacyRow>
  )
}

/** A legacy "0 - No / 1 - Yes" (or other) drop-down on one row. */
export function Choice({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: [string, string][] }) {
  return (
    <LegacyRow label={label} w={140}>
      <TextField select size="small" sx={{ ...box, width: 290 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {items.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
      </TextField>
    </LegacyRow>
  )
}

/** A code drop-down with a blank "all" entry (health type, payor). */
export function CodeChoice({ label, value, onChange, items }: { label: string; value: string | null; onChange: (v: string | null) => void; items: { code: string; name: string }[] }) {
  return (
    <LegacyRow label={label} w={140}>
      <TextField select size="small" fullWidth sx={box} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <MenuItem value="">&nbsp;</MenuItem>
        {items.map((o) => <MenuItem key={o.code} value={o.code}>{o.code} - {o.name}</MenuItem>)}
      </TextField>
    </LegacyRow>
  )
}

/** The Post Status, Post Date and Post Batch No rows; the date and batch only apply to posted records, as on the legacy forms. */
export function PostedFilters<S extends PostingSearchBase & { postDateFrom: string | null; postDateTo: string | null }>({ s, set, labels }: {
  s: S; set: (patch: Partial<S>) => void; labels?: { status: string; date: string; batch: string }
}) {
  const l = labels ?? { status: 'Post Status', date: 'Post Date from', batch: 'Post Batch No. from' }
  return (
    <>
      <Choice label={l.status} value={s.posted ? '1' : '0'} items={[['0', '0 - No'], ['1', '1 - Yes']]}
        onChange={(v) => set((v === '1' ? { posted: true } : { posted: false, postDateFrom: null, postDateTo: null, batchFrom: null, batchTo: null }) as Partial<S>)} />
      <DateRange label={l.date} from={s.postDateFrom} to={s.postDateTo} disabled={!s.posted} onFrom={(v) => set({ postDateFrom: v } as Partial<S>)} onTo={(v) => set({ postDateTo: v } as Partial<S>)} />
      <TextRange label={l.batch} from={s.batchFrom} to={s.batchTo} max={5} disabled={!s.posted} onFrom={(v) => set({ batchFrom: v } as Partial<S>)} onTo={(v) => set({ batchTo: v } as Partial<S>)} />
    </>
  )
}

/**
 * The common body of the legacy A/C Export forms: search fields, the A/C Period / Batch No / Post Status / Record(s) / amounts frame, Check All, the
 * SUN journal grid and Back / SearchCR / SearchDN / Search / Post / Print to File / Clear / Exit. Each item (its debit and credit lines) is ticked and
 * posted as a whole; red items cannot be posted (the reason is the row's tooltip). Posting is only open after the TimeMain hours.
 */
export function PostingScreen<S extends PostingSearchBase>({ title, queryKey, api, blank, filters, postProblem, postedFileName, listFileName, debitLabel = 'DN Amt' }: PostingScreenProps<S>) {
  const navigate = useNavigate()
  const options = useQuery({ queryKey: [queryKey], queryFn: api.options })
  const [s, setS] = useState<S>(blank)
  const [searched, setSearched] = useState<S | null>(null)
  const [journal, setJournal] = useState<PostingJournal | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [side, setSide] = useState<'both' | 'D' | 'C'>('both')
  const [period, setPeriod] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null)
  const set = (patch: Partial<S>) => setS((x) => ({ ...x, ...patch }))
  const window = options.data?.window

  const exportJournal = (j: PostingJournal, name: string, ticked: Set<string>, only: 'both' | 'D' | 'C') => download(csvBlob(journalHeaders,
    j.items.flatMap((i) => i.lines.filter((l) => only === 'both' || l.debitCredit === only).map((l) => journalRow(i, l, ticked.has(i.key), formatDate)))), name)

  const search = useMutation({
    mutationFn: (q: S) => api.search(q),
    onSuccess: (j, q) => {
      setJournal(j); setSearched(q); setChecked(new Set()); setBatchNo(''); setSide('both')
      setMessage(j.items.length === 0 ? { severity: 'error', text: 'No record selected !' }
        : j.truncated ? { severity: 'warning', text: `Only the first ${j.items.length} records are listed; narrow the search to see the others.` } : null)
    },
    onError: (e) => { setJournal(null); setMessage({ severity: 'error', text: (e as Error).message }) },
  })
  const post = useMutation({
    mutationFn: () => api.post(searched!, [...checked], period),
    onSuccess: (r) => {
      const after = { ...searched!, posted: true, batchFrom: r.batchNo, batchTo: r.batchNo }
      setConfirming(false); setJournal(r.journal); setBatchNo(r.batchNo); setChecked(new Set()); setSearched(after); setS(after); setSide('both')
      setMessage({ severity: 'success', text: `Record(s) Posted Sucessfully... Batch ${r.batchNo}: ${r.items} record(s).` })
      exportJournal(r.journal, `${postedFileName(r.batchNo, searched!)}.csv`, new Set(), 'both')
    },
    onError: (e) => { setConfirming(false); setMessage({ severity: 'error', text: (e as Error).message }) },
  })

  const items = journal?.items ?? []
  const postable = items.filter((i) => !i.posted && !i.problem)
  const anyPosted = items.some((i) => i.posted)
  const problems = items.filter((i) => i.problem).length
  const busy = search.isPending || post.isPending
  const toggle = (key: string) => setChecked((c) => { const n = new Set(c); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const checkAll = () => setChecked((c) => (c.size === postable.length ? new Set() : new Set(postable.map((i) => i.key))))
  const clear = () => { setS(blank); setJournal(null); setSearched(null); setChecked(new Set()); setPeriod(''); setBatchNo(''); setMessage(null); setSide('both') }
  const tryPost = () => {
    const problem = checked.size === 0 ? 'Please select the record' : postProblem(searched!) ?? (!period ? 'Please Keyin for Accounting Period !' : null)
    if (problem) setMessage({ severity: 'error', text: problem })
    else setConfirming(true)
  }
  const info = (label: string, value: string, w = 110) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Typography sx={{ fontSize: 13 }}>{label}</Typography>
      <TextField size="small" sx={{ ...yellow, width: w }} value={value} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} />
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
      <LegacyTitle>{title}</LegacyTitle>
      {options.isError && <Alert severity="error">{(options.error as Error).message}</Alert>}
      {window && !window.open && <Alert severity="warning">{window.message} Search and Print to File still work; Post does not.</Alert>}
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <LegacyFrame>{filters(s, set, options.data)}</LegacyFrame>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ fontSize: 13 }}>A/C Period</Typography>
            <TextField select size="small" sx={{ ...box, width: 120 }} value={period} disabled={!journal || anyPosted} onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value="">&nbsp;</MenuItem>
              {(options.data?.accountPeriods ?? []).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          </Box>
          {info('Batch No', batchNo, 80)}
          {info('Post Status', journal ? (anyPosted ? 'Yes' : 'No') : '', 60)}
          {info('Record(s)', journal ? String(items.length) : '', 70)}
          {info(debitLabel, journal ? formatMoney(journal.debit) : '')}
          {info('CR Amt', journal ? formatMoney(journal.credit) : '')}
        </Box>
      </LegacyFrame>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControlLabel control={<Checkbox size="small" checked={postable.length > 0 && checked.size === postable.length} disabled={anyPosted || postable.length === 0} onChange={checkAll} />}
          label={<Typography sx={{ fontSize: 13 }}>Check All</Typography>} />
        {problems > 0 && <Typography sx={{ fontSize: 13, color: 'error.main' }}>{problems} record(s) cannot be posted (shown in red; point at one for the reason).</Typography>}
      </Box>

      <Paper variant="outlined" sx={{ maxHeight: '45vh', overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.2, whiteSpace: 'nowrap', textAlign: 'left' },
          '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0, zIndex: 1 }, '& td.n': { textAlign: 'right' } }}>
          <thead><tr>{journalHeaders.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {items.flatMap((i) => i.lines.filter((l) => side === 'both' || l.debitCredit === side).map((l, n) => (
              <Box component="tr" key={`${i.key}-${n}`} title={i.problem ?? i.references.join(', ')} sx={i.problem ? { color: 'error.main' } : undefined}>
                <td>
                  {(n === 0 || side !== 'both') && (
                    <Checkbox size="small" sx={{ p: 0 }} checked={i.posted || checked.has(i.key)} disabled={i.posted || !!i.problem || anyPosted} onChange={() => toggle(i.key)}
                      slotProps={{ input: { 'aria-label': `Post ${i.key}` } }} />
                  )}
                  {(i.posted || checked.has(i.key)) && <Typography component="span" sx={{ fontSize: 12, ml: 0.5 }}>Post</Typography>}
                </td>
                <td>{l.journalType}</td><td>{l.journalSource}</td><td>{l.database}</td><td>{l.transRef}</td><td>{l.accountPeriod}</td><td>{formatDate(l.transDate)}</td>
                <td>{l.description}</td><td>{l.accountCode}</td><td className="n">{formatMoney(l.amount)}</td><td>{l.debitCredit}</td><td>{l.hospital}</td><td>{l.groupCompany}</td>
                <td>{l.payor}</td><td>{l.caseNo}</td><td>{l.productCategory}</td><td>{l.bordxRef}</td><td>{l.batchNo}</td>
              </Box>
            )))}
            {!journal && <tr><td colSpan={journalHeaders.length}>Enter the search and click Search.</td></tr>}
          </tbody>
        </Box>
      </Paper>

      <LegacyFrame>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" disabled={!journal || side === 'both'} onClick={() => setSide('both')}>Back</Button>
          <Button size="small" variant="outlined" disabled={!journal} onClick={() => setSide('C')}>SearchCR</Button>
          <Button size="small" variant="outlined" disabled={!journal} onClick={() => setSide('D')}>SearchDN</Button>
          <Button size="small" variant="contained" disabled={busy} onClick={() => { setMessage(null); search.mutate(s) }}>Search</Button>
          <Button size="small" variant="contained" color="warning" disabled={busy || !journal || anyPosted || !window?.open} onClick={tryPost}>Post</Button>
          <Button size="small" variant="outlined" disabled={!journal || items.length === 0}
            onClick={() => exportJournal(journal!, `${listFileName}${batchNo ? '-' + batchNo : ''}.csv`, checked, side)}>Print to File</Button>
          <Button size="small" variant="outlined" disabled={busy} onClick={clear}>Clear</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/')}>Exit</Button>
        </Box>
      </LegacyFrame>

      <ConfirmDialog open={confirming} busy={post.isPending} title={title}
        message={`Do you want to Post record(s) ? ${checked.size} record(s) into ${period}.`} onConfirm={() => post.mutate()} onCancel={() => setConfirming(false)} />
    </Box>
  )
}
