import { api } from './client'

// Membership > Upload Bordx (FrmNewMBMEndt2012): the six pipe-delimited FWHS files.
export type BordxKind = 'MP' | 'MW' | 'NP' | 'EP' | 'EX' | 'EW'
export const bordxKinds: BordxKind[] = ['MP', 'MW', 'NP', 'EP', 'EX', 'EW']

export interface BordxUploadFile { name: string; content: string }
export interface BordxIssue { line: number; policyNo: string | null; name: string | null; message: string; fileName: string; blocking: boolean }
export interface BordxFileSummary { kind: BordxKind; fileName: string; records: number; inserts: number; updates: number; skipped: number }
export interface BordxUploadPreview { files: BordxFileSummary[]; issues: BordxIssue[]; canUpload: boolean; totalErrors: number }
export interface BordxUploadResult { files: BordxFileSummary[]; newMemberNumbers: string[] }

/** The kind is the two letters at positions 6-7 of the file name (ETFWMMP002812.TXT is an MP file), as the legacy file buttons checked. */
export const bordxKindOf = (fileName: string): BordxKind | null => {
  const k = fileName.substring(5, 7).toUpperCase() as BordxKind
  return fileName.length >= 7 && bordxKinds.includes(k) ? k : null
}

/** The legacy form read the files as ANSI text (Line Input), so decode them as Windows-1252 rather than UTF-8. */
export const readBordxFile = async (file: File): Promise<BordxUploadFile> =>
  ({ name: file.name, content: new TextDecoder('windows-1252').decode(await file.arrayBuffer()) })

const base = '/api/membership/bordx-upload'
export const bordxUploadApi = {
  preview: (files: BordxUploadFile[]) => api.post<BordxUploadPreview>(`${base}/preview`, { files }),
  upload: (files: BordxUploadFile[]) => api.post<BordxUploadResult>(base, { files }),
}
