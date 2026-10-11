/*
  Push/fold chart helpers shared by the Charts view and its tests. Seat names
  match PokerEdge's analysis/pushfold.py.
*/
export const RANKS = 'AKQJT98765432'
const BY_BEHIND = { 1: 'SB', 2: 'BTN', 3: 'CO', 4: 'HJ', 5: 'MP' }

/** Shover seats, earliest first — the same names analysis/pushfold.py uses. */
export function seatNames(dealt) {
  const out = []
  for (let behind = dealt - 1; behind >= 1; behind -= 1) {
    const first = dealt - 1 - behind
    if (first === 0 && dealt > 3) out.push('UTG')
    else if (behind > 5) out.push(`UTG${first}`)
    else out.push(BY_BEHIND[behind])
  }
  return out
}

/** The hand class in grid row r, column c: pairs on the diagonal, suited above. */
export function cellClass(r, c) {
  if (r === c) return RANKS[r] + RANKS[r]
  return r < c ? `${RANKS[r]}${RANKS[c]}s` : `${RANKS[c]}${RANKS[r]}o`
}

export const combos = (cls) => (cls.length === 2 ? 6 : cls.endsWith('s') ? 4 : 12)
