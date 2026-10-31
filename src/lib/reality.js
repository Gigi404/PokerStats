/*
  Reality check wording — PokerEdge analysis/reality.py (play.reality). The
  beast compares the graders with real chips; this says what that means. Noise is
  large, so nothing here is worded as more than the range allows.
*/

const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x)}`

/** One realisation row: what the grader assumes against what its range allows. */
export function realisationVerdict(r) {
  if (!r?.n || r.n < 30) return 'too few'
  if (r.high < r.guess_low) return 'below the assumed range'
  if (r.low > 1) return 'above the assumed range'
  return 'fits'
}

/** The first line: does the grader's assumption survive? */
export function realisationHeadline(rows) {
  const read = (rows || []).filter((r) => r.n >= 30)
  if (!read.length) return 'Not enough calls to check the assumption yet.'
  const off = read.filter((r) => realisationVerdict(r) !== 'fits')
  if (!off.length) return 'The graders’ assumption holds: your real results fit it on every street checked.'
  return `The graders’ assumption is off in ${off.length} of ${read.length} spots.`
}

/** The big blind line: predicted against real, with the noise. */
export function bbHeadline(b) {
  if (!b?.n) return 'Not enough big blind calls to check yet.'
  const gap = Math.abs(b.bb - b.predicted)
  const fit = gap <= 2 * b.se ? 'That fits, within the noise' : 'That doesn’t fit'
  return `On ${b.n} calls the model never saw, it predicted ${signed(b.predicted)}bb a call and they made ${signed(b.bb)}bb (±${b.se}). ${fit}.`
}

/** Does calling from the big blind pay? The evidence for folding too much. */
export function bbCallsLine(b) {
  const { hero_calls: h, pool_calls: p } = b || {}
  if (!h?.n || !p?.n) return null
  return `Compared with folding, your big blind calls made ${signed(h.bb)}bb each (±${h.se}, ${h.n} hands) and the pool’s made ${signed(p.bb)}bb (±${p.se}, ${p.n.toLocaleString('en-CA')} hands).`
}
