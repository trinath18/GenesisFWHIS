/** Compact input styling of the legacy VB forms. */
export const legacyBox = { '& .MuiInputBase-input': { py: 0.4, px: 0.75, fontSize: 13 } } as const
/** The yellow read-only boxes of the legacy forms (case number, WS No, status). Colour comes from the theme so it adapts to dark mode. */
export const legacyYellow = { ...legacyBox, '& .MuiInputBase-root': { bgcolor: 'legacy.readOnly' } } as const
/** The cyan read-only boxes of the legacy forms. */
export const legacyCyan = { ...legacyBox, '& .MuiInputBase-root': { bgcolor: 'legacy.readOnlyAlt' } } as const
