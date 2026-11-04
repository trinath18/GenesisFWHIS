import { api } from './client'

// Case > Claims ASCII (From SPPA) (frmCLMASCIIUpload2012): the SPPA claims file ("CH" at positions 6-7 of the name).
export type SppaUploadAction = 'New case' | 'Further invoice' | 'Skipped'

export interface SppaUploadRow {
  line: number; payorCode: string; workerUniqueNo: string; name: string; espRefNo: string; admitted: string; billNo: string; billedAmount: number
  action: SppaUploadAction; memberNumber: string | null; caseNumber: string | null; message: string | null
}
export interface SppaUploadIssue { line: number; message: string }
export interface SppaUploadPreview { fileName: string; rows: SppaUploadRow[]; issues: SppaUploadIssue[]; newCases: number; invoices: number; skipped: number; canUpload: boolean }
export interface SppaUploadResult { fileName: string; rows: SppaUploadRow[]; newCases: number; invoices: number; skipped: number }
export interface SppaUploadFile { fileName: string; content: string }

/** The legacy form only processed a file with "CH" at positions 6-7 of its name (Mid(name, 6, 2)). */
export const isSppaClaimsFile = (fileName: string) => fileName.length >= 7 && fileName.substring(5, 7).toUpperCase() === 'CH'

/** The legacy form read the file as ANSI text (Line Input), so decode it as Windows-1252 rather than UTF-8. */
export const readSppaFile = async (file: File): Promise<SppaUploadFile> =>
  ({ fileName: file.name, content: new TextDecoder('windows-1252').decode(await file.arrayBuffer()) })

const base = '/api/case-ascii/sppa-upload'
export const sppaUploadApi = {
  preview: (file: SppaUploadFile) => api.post<SppaUploadPreview>(`${base}/preview`, file),
  upload: (file: SppaUploadFile) => api.post<SppaUploadResult>(base, file),
}
