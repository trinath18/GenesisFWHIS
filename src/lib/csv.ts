/** Builds a CSV file (Excel-friendly: UTF-8 BOM, CRLF, quoted when needed). Replaces the legacy "Print to File" ListView-to-Excel export. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    // A leading = + - @ would be run as a formula by Excel; prefix it so the text stays text.
    const safe = /^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

export const csvBlob = (headers: string[], rows: (string | number | null | undefined)[][]) => new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
