import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { invoiceApi, procedureTotals, type InvoiceCaseProcedures, type MmaCode, type MmaRate } from '../../api/invoices'
import { LegacyFrame, LegacyRow, LegacyTitle } from '../../components/LegacyForm'
import { legacyBox as box, legacyYellow as yellow } from '../../components/legacyStyles'
import { formatMoney } from '../../lib/format'

type Line = { text: string; code: string; fee: string; anaes: string }
type Draft = { doctors: string[]; anaes: string[]; med: string[]; inv: { done: string; code: string }[]; surgical: Line[]; nonSurgical: Line[] }

const pad = <T,>(xs: T[] | null | undefined, n: number, none: T) => Array.from({ length: n }, (_, i) => xs?.[i] ?? none)
const str = (v: number | null | undefined) => (v == null ? '' : String(v))
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))
const text = (s: string) => (s.trim() === '' ? null : s.trim())

function toDraft(p: InvoiceCaseProcedures): Draft {
  const line = (x: InvoiceCaseProcedures['surgical'][number] | undefined): Line => ({ text: x?.text ?? '', code: x?.code ?? '', fee: str(x?.actualFee), anaes: str(x?.actualAnaesFee) })
  return {
    doctors: pad(p.attendingDoctors, 5, null).map((x) => x ?? ''), anaes: pad(p.anaesthetists, 3, null).map((x) => x ?? ''), med: pad(p.medicalManagement, 3, null).map((x) => x ?? ''),
    inv: pad(p.investigations, 3, { done: null, code: null }).map((x) => ({ done: x.done ?? '', code: x.code ?? '' })),
    surgical: Array.from({ length: 6 }, (_, i) => line(p.surgical[i])), nonSurgical: Array.from({ length: 6 }, (_, i) => line(p.nonSurgical[i])),
  }
}

function fromDraft(d: Draft): InvoiceCaseProcedures {
  return {
    attendingDoctors: d.doctors.map(text), anaesthetists: d.anaes.map(text), medicalManagement: d.med.map(text),
    investigations: d.inv.map((x) => ({ done: text(x.done), code: text(x.code) })),
    surgical: d.surgical.map((x) => ({ text: text(x.text), code: text(x.code), actualFee: num(x.fee), actualAnaesFee: num(x.anaes) })),
    nonSurgical: d.nonSurgical.map((x) => ({ text: text(x.text), code: text(x.code), actualFee: num(x.fee) })),
  }
}

const noRate = (code: string): MmaRate => ({ code, narrative: null, scheduleDescription: null, bodyPartMma: null, pageMma: null, bodyPart13th: null, page13th: null,
  surgeon: 0, anaesthetist: 0, surgeon13thMin: 0, surgeon13th: 0, anaesthetist13th: 0 })

interface Props {
  /** S: Surgical Procedures Entry (the ">" by the surgical fee); N: Non-Surgical Procedures Entry (the ">" by the procedure fee). */
  kind: 'S' | 'N'
  caseNumber: string
  value: InvoiceCaseProcedures
  rates: Record<string, MmaRate>
  /** Only while an invoice is being added or changed, as on the legacy form. */
  editable: boolean
  onSave: (value: InvoiceCaseProcedures, rates: Record<string, MmaRate>) => void
  onClose: () => void
}

/**
 * Legacy frmMMAEntry ("Procedures/OPCS"). The case's attending doctors, anaesthetists, medical management and investigations, then six surgical or
 * non-surgical procedures with their OPCS code, the actual fees and the MMA and 13th schedule rates of the code (an actual fee above the 13th schedule
 * maximum shows in red). Save puts the actual fee totals in the invoice; the procedures themselves are saved with the invoice.
 */
export function ProcedureEntryDialog({ kind, caseNumber, value, rates: initialRates, editable, onSave, onClose }: Props) {
  const [d, setD] = useState(() => toDraft(value))
  const [rates, setRates] = useState(initialRates)
  const [search, setSearch] = useState<{ investigations: boolean; code: string; narrative: string } | null>(null)
  const [detail, setDetail] = useState<MmaRate | null>(null)
  const surgical = kind === 'S'
  const lines = surgical ? d.surgical : d.nonSurgical
  const lineKey = surgical ? 'surgical' : 'nonSurgical'

  const rate = (code: string) => (code.trim() ? rates[code.trim()] ?? Object.values(rates).find((r) => r.code.toLowerCase() === code.trim().toLowerCase()) : undefined)
  /** Legacy txtProcCode_Change: the rates of a code are looked up as soon as it is entered. */
  const lookUp = (code: string) => {
    const c = code.trim()
    if (!c || rate(c)) return
    invoiceApi.mmaRate(c).then((r) => setRates((x) => ({ ...x, [c]: r })), () => setRates((x) => ({ ...x, [c]: noRate(c) })))
  }
  const setLine = (i: number, patch: Partial<Line>) => setD((x) => ({ ...x, [lineKey]: x[lineKey].map((l, j) => (j === i ? { ...l, ...patch } : l)) }))
  const found = useMutation({ mutationFn: (s: { investigations: boolean; code: string; narrative: string }) => invoiceApi.mmaCodes(s.code, s.narrative, s.investigations) })
  /** Legacy frmSearchCPT / frmSearchInv double-click: the code goes into the first empty slot (the last one when all are taken). */
  const pick = (c: MmaCode) => {
    if (search?.investigations) {
      setD((x) => { const i = x.inv.findIndex((v) => !v.code.trim()); const at = i < 0 ? 2 : i; return { ...x, inv: x.inv.map((v, j) => (j === at ? { ...v, code: c.code } : v)) } })
    } else {
      const i = lines.findIndex((l) => !l.code.trim())
      setLine(i < 0 ? 5 : i, { code: c.code })
      lookUp(c.code)
    }
    setSearch(null)
  }

  const t = (value: string, onChange: (v: string) => void, max: number, w: number | string = '100%') => (
    <TextField size="small" sx={{ ...box, width: w }} value={value} onChange={(e) => onChange(e.target.value)} slotProps={{ input: { readOnly: !editable }, htmlInput: { maxLength: max } }} />
  )
  const amount = (value: string, onChange: (v: string) => void, over: boolean, label: string) => (
    <TextField size="small" sx={{ ...box, width: 90, ...(over ? { '& input': { color: 'error.main', fontWeight: 600 } } : {}) }} value={value} onChange={(e) => onChange(e.target.value)}
      title={over ? 'Above the 13th schedule maximum' : undefined} slotProps={{ input: { readOnly: !editable }, htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' }, 'aria-label': label } }} />
  )
  const shown = (v: number | undefined) => <TextField size="small" sx={{ ...yellow, width: 90 }} value={v == null ? '' : formatMoney(v)} slotProps={{ input: { readOnly: true }, htmlInput: { style: { textAlign: 'right' } } }} />
  const col = (g: (l: Line, r: MmaRate | undefined) => number) => lines.reduce((s, l) => s + g(l, rate(l.code)), 0)
  const totals = procedureTotals(fromDraft(d))
  const cell = (c: ReactNode, key: string | number) => <td key={key}>{c}</td>

  const headers = surgical
    ? ['', 'Procedure', 'OPCS', 'Actual', 'MMA', '13th Sch (Min)', '13th Sch (Max)', 'Actual', 'MMA', '13th Sch']
    : ['', 'Procedures', 'OPCS', 'Actual', 'MMA', '13th Sch (Min)', '13th Sch (Max)']

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ p: 0 }}><LegacyTitle>{surgical ? 'Surgical Procedures Entry' : 'Non-Surgical Procedures Entry'}</LegacyTitle></DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1, pt: '8px !important' }}>
        {!editable && <Alert severity="info">Click Add or Edit on the invoice to change the procedures.</Alert>}
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <LegacyFrame>
            {d.doctors.map((v, i) => <LegacyRow key={i} label={`Attending Doc ${i + 1}`} w={110}>{t(v, (x) => setD((s) => ({ ...s, doctors: s.doctors.map((y, j) => (j === i ? x : y)) })), i === 0 ? 100 : 30)}</LegacyRow>)}
          </LegacyFrame>
          <LegacyFrame>
            {d.anaes.map((v, i) => <LegacyRow key={i} label={`Anaes Name ${i + 1}`} w={110}>{t(v, (x) => setD((s) => ({ ...s, anaes: s.anaes.map((y, j) => (j === i ? x : y)) })), 30)}</LegacyRow>)}
          </LegacyFrame>
          <LegacyFrame title="Medical Management">
            {d.med.map((v, i) => <Box key={i}>{t(v, (x) => setD((s) => ({ ...s, med: s.med.map((y, j) => (j === i ? x : y)) })), 500)}</Box>)}
          </LegacyFrame>
          <LegacyFrame>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Investigation</Typography>
              <Button size="small" variant="outlined" disabled={!editable} onClick={() => { found.reset(); setSearch({ investigations: true, code: '', narrative: '' }) }}>Search</Button>
            </Box>
            {d.inv.map((v, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 0.5 }}>
                {t(v.done, (x) => setD((s) => ({ ...s, inv: s.inv.map((y, j) => (j === i ? { ...y, done: x } : y)) })), 500)}
                {t(v.code, (x) => setD((s) => ({ ...s, inv: s.inv.map((y, j) => (j === i ? { ...y, code: x } : y)) })), 10, 110)}
              </Box>
            ))}
          </LegacyFrame>
        </Box>

        <LegacyFrame>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ borderCollapse: 'collapse', fontSize: 13, '& th': { fontWeight: 600, px: 0.5, textAlign: 'center', whiteSpace: 'nowrap' }, '& td': { px: 0.25, py: 0.15 } }}>
              <thead>
                <tr>
                  <th colSpan={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      <Button size="small" variant="outlined" disabled={!editable} onClick={() => { found.reset(); setSearch({ investigations: false, code: '', narrative: '' }) }}>Search</Button>
                    </Box>
                  </th>
                  <th colSpan={4}>{surgical ? 'Surgical' : 'Non-Surgical'}</th>{surgical && <th colSpan={3}>Anaes</th>}
                </tr>
                <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const r = rate(l.code)
                  const over = (v: string, max: number | undefined) => !!max && (num(v) ?? 0) > max
                  return (
                    <tr key={i}>
                      {cell(<Typography sx={{ fontSize: 13, width: 16 }}>{i + 1}</Typography>, 'n')}
                      {cell(t(l.text, (x) => setLine(i, { text: x }), surgical ? 500 : 200, 300), 't')}
                      {cell(
                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                          <TextField size="small" sx={{ ...box, width: 80 }} value={l.code} onChange={(e) => setLine(i, { code: e.target.value })} onBlur={(e) => lookUp(e.target.value)}
                            slotProps={{ input: { readOnly: !editable }, htmlInput: { maxLength: 6, 'aria-label': `OPCS ${i + 1}` } }} />
                          <Button size="small" variant="outlined" sx={{ minWidth: 26, px: 0 }} disabled={!r || !l.code.trim()} title="MMA / 13th schedule details" onClick={() => setDetail(r ?? null)}>&gt;</Button>
                        </Box>, 'c')}
                      {cell(amount(l.fee, (x) => setLine(i, { fee: x }), over(l.fee, r?.surgeon13th), `Actual fee ${i + 1}`), 'f')}
                      {cell(shown(r?.surgeon), 'm')}{cell(shown(r?.surgeon13thMin), 'mn')}{cell(shown(r?.surgeon13th), 'mx')}
                      {surgical && <>
                        {cell(amount(l.anaes, (x) => setLine(i, { anaes: x }), over(l.anaes, r?.anaesthetist13th), `Actual anaesthetist fee ${i + 1}`), 'af')}
                        {cell(shown(r?.anaesthetist), 'am')}{cell(shown(r?.anaesthetist13th), 'a13')}
                      </>}
                    </tr>
                  )
                })}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', paddingRight: 8 }}><Typography sx={{ fontSize: 13, fontWeight: 600 }}>Total</Typography></td>
                  {cell(shown(surgical ? totals.surgeon : totals.nonSurgical), 'tf')}
                  {cell(shown(col((_, r) => r?.surgeon ?? 0)), 'tm')}{cell(shown(col((_, r) => r?.surgeon13thMin ?? 0)), 'tmn')}{cell(shown(col((_, r) => r?.surgeon13th ?? 0)), 'tmx')}
                  {surgical && <>{cell(shown(totals.anaesthetist), 'taf')}{cell(shown(col((_, r) => r?.anaesthetist ?? 0)), 'tam')}{cell(shown(col((_, r) => r?.anaesthetist13th ?? 0)), 'ta13')}</>}
                </tr>
              </tbody>
            </Box>
          </Box>
        </LegacyFrame>
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Typography sx={{ fontSize: 13, mr: 'auto' }}>Case Number <b>{caseNumber}</b></Typography>
        <Button variant="contained" disabled={!editable} onClick={() => onSave(fromDraft(d), rates)}>Save</Button>
        <Button variant="outlined" onClick={onClose}>Exit</Button>
      </DialogActions>

      {search && (
        <Dialog open onClose={() => setSearch(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{search.investigations ? 'Search Investigation' : 'Search OPCS'}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 1 }}>
            <Box component="form" sx={{ display: 'flex', gap: 1, pt: 1 }} onSubmit={(e) => { e.preventDefault(); found.mutate(search) }}>
              <TextField size="small" label="Code" sx={{ width: 140 }} value={search.code} onChange={(e) => setSearch({ ...search, code: e.target.value })} slotProps={{ htmlInput: { maxLength: 10 } }} />
              <TextField size="small" label="Description" sx={{ flex: 1 }} value={search.narrative} onChange={(e) => setSearch({ ...search, narrative: e.target.value })} slotProps={{ htmlInput: { maxLength: 100 } }} />
              <Button type="submit" variant="outlined" disabled={found.isPending}>Search</Button>
            </Box>
            {found.isError && <Alert severity="error">{(found.error as Error).message}</Alert>}
            {found.data && found.data.length === 0 && <Alert severity="info">Record not found</Alert>}
            {found.data && found.data.length > 0 && (
              <Box sx={{ maxHeight: 360, overflow: 'auto', border: 1, borderColor: 'divider' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, '& td, & th': { px: 1, py: 0.25, textAlign: 'left', borderBottom: 1, borderColor: 'divider' }, '& th': { bgcolor: 'action.selected', position: 'sticky', top: 0 } }}>
                  <thead><tr><th>Code</th><th>Description</th></tr></thead>
                  <tbody>
                    {found.data.map((c) => (
                      <Box component="tr" key={c.code} onDoubleClick={() => pick(c)} title="Double-click to use this code" sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                        <td>{c.code}</td><td>{c.narrative}</td>
                      </Box>
                    ))}
                  </tbody>
                </Box>
              </Box>
            )}
            {found.data && found.data.length === 200 && <Typography variant="caption" color="text.secondary">The first 200 matches are shown; narrow the search to see others.</Typography>}
          </DialogContent>
          <DialogActions><Button onClick={() => setSearch(null)}>Close</Button></DialogActions>
        </Dialog>
      )}

      {detail && (
        <Dialog open onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
          <DialogTitle>MMA / 13th Schedule</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 0.5 }}>
            {([['OPCS Code', detail.code], ['MMA Description', detail.narrative], ['13th Sch Description', detail.scheduleDescription],
              ['Body Part (MMA)', detail.bodyPartMma], ['Page (MMA)', detail.pageMma], ['Body Part (13th)', detail.bodyPart13th], ['Page (13th)', detail.page13th],
              ['Surgeon (MMA)', formatMoney(detail.surgeon)], ['Anaes (MMA)', formatMoney(detail.anaesthetist)], ['Surgeon 13th (Min)', formatMoney(detail.surgeon13thMin)],
              ['Surgeon 13th (Max)', formatMoney(detail.surgeon13th)], ['Anaes 13th', formatMoney(detail.anaesthetist13th)]] as [string, string | null][]).map(([l, v]) => (
              <LegacyRow key={l} label={l} w={150}><TextField size="small" fullWidth multiline={l.includes('Description')} sx={box} value={v ?? ''} slotProps={{ input: { readOnly: true } }} /></LegacyRow>
            ))}
          </DialogContent>
          <DialogActions><Button onClick={() => setDetail(null)}>Close</Button></DialogActions>
        </Dialog>
      )}
    </Dialog>
  )
}
