export const toDmy = (iso: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

/** dd/mm/yyyy to yyyy-mm-dd; returns '' when the text is not a real calendar date. */
export function toIso(dmy: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy)
  if (!m) return ''
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return y >= 1900 && date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

/** Formats typed digits as dd/mm/yyyy while typing ("0102" becomes "01/02"). */
export function maskDmy(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter((p) => p.length > 0).join('/') + (digits.length === 2 || digits.length === 4 ? '/' : '')
}
