/** Legacy-style display formats (dd/mm/yyyy, #,##0.00). Dates arrive as ISO strings without a timezone. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
