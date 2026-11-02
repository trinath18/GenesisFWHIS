/** Toggles one key in a Set held in React state: setChecked(toggleIn(key)). */
export const toggleIn = (key: string) => (s: Set<string>) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n }
