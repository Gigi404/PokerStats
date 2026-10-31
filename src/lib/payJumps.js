/*
  Pay jumps wording — PokerEdge analysis/icm_notes.py (play.icm). The beast
  estimates the pressure on each all-in near the money; this turns it into
  words. An estimate beside the grade, never a grade (owner, 2026-10-30), so
  nothing here is worded as a verdict and the tone stays neutral.
*/

/** The headline. */
export function payHeadline(i) {
  if (!i?.decisions) return 'Not enough all-ins near the money to tell yet.'
  const parts = []
  if (i.cleared) parts.push(`${i.cleared} ${i.cleared === 1 ? 'fold' : 'folds'} the chips called a mistake may be fine`)
  if (i.risky) parts.push(`${i.risky} ${i.risky === 1 ? 'all-in was' : 'all-ins were'} right in chips but risky with the pay jump`)
  if (!parts.length) return `On ${i.decisions} all-ins near the money, the pay jumps change nothing.`
  return `On ${i.decisions} all-ins near the money: ${parts.join(', and ')}.`
}

/** How much a lost chip weighs, in words. */
export function pressure(factor) {
  if (factor >= 1.5) return 'heavy'
  if (factor >= 1.2) return 'real'
  return 'light'
}

/** What the spot was. */
export function payLabel(s) {
  const what = { shove: 'shove', reshove: 're-shove', fourbet: '4-bet shove', call: 'call' }[s.spot] || s.spot
  if (s.action === 'fold') return `Folded instead of a ${what}: the pay jump may back the fold`
  return `Made the ${what}: right in chips, risky with the pay jump`
}

/** About how many were left and paid: never an exact bubble. */
export function stageLine(icm) {
  const where = icm.left > icm.paid ? `about ${icm.left} left, about ${icm.paid} paid` : `in the money, about ${icm.left} left`
  return `${where} · pressure ${pressure(icm.factor)} (×${icm.factor})${icm.bounty ? ' · bounty event' : ''}`
}
