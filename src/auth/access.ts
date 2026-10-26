/** USRAccess is a string of '0'/'1' flags, one per legacy screen (1-based position). */
export const isAllowed = (access: string | undefined, position: number): boolean =>
  !!access && position >= 1 && position <= access.length && access[position - 1] === '1'
