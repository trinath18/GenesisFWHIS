/** The read-only member tabs of the legacy Case Registration form, in the legacy order. */
export type MemberTab = 'benefit' | 'history' | 'warranty' | 'non-disclosure' | 'terms' | 'surgical' | 'wording'
export const memberTabs: [MemberTab, string][] = [
  ['benefit', 'Benefit'], ['history', "MBM'Ship History"], ['warranty', 'Warranty'], ['non-disclosure', 'Non-Disclosure'],
]
export const memberTabsAfterNotes: [MemberTab, string][] = [['terms', 'Policy Terms'], ['surgical', 'Surgical Schedule'], ['wording', 'Policy Wording']]

