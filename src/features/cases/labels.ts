/** Display labels copied from the legacy frmCaseInquiry combo lists. */
export const statusLabels: Record<string, string> = { O: 'Open', S: 'Suspend', C: 'Close', D: 'Delete', R: 'Repudiation' }

export const claimabilityLabels: Record<string, string> = {
  AA: 'Accepted', RR: 'Rejected', CC: 'Cancelled', SS: 'Special Approval', PP: 'Pay & Claim', NN: 'Not Decided',
  NA: 'Not Decided/Accepted', NR: 'Not Decided/Rejected', PA: 'Pay&Claim/Accepted', PR: 'Pay&Claim/Rejected',
  AR: 'Accepted/Rejected', RA: 'Rejected/Accepted', ER: 'Expired/Rejected', AI: 'Accepted/Insurance',
}

export const yesNo: Record<string, string> = { Y: 'Yes', N: 'No' }

export const withLabel = (code: string | null | undefined, labels: Record<string, string>) =>
  code ? (labels[code] ? `${code} - ${labels[code]}` : code) : ''
