/** Compact input styling of the legacy VB forms. */
export const legacyBox = { '& .MuiInputBase-input': { py: 0.4, px: 0.75, fontSize: 13 } } as const
/** The yellow read-only boxes of the legacy forms (case number, WS No, status). */
export const legacyYellow = { ...legacyBox, '& .MuiInputBase-root': { bgcolor: '#fff9c4' } } as const
