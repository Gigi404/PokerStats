/*
  Tilt check wording — PokerEdge core/tilt.py (play.tilt). The beast finds
  the blows and does the like-for-like statistics; this turns them into a
  verdict. Tilt is the question "worse after a blow?", so only `worse` is a
  warning; `better` passes the same bar but is said modestly — five cuts are
  tested, and a lucky one at the bar is not a strength.
*/

/** The headline: tilt found, or not, with the one-line reason. */
export function tiltHeadline(t) {
  const cuts = t?.cuts || []
  const worse = cuts.filter((c) => c.finding === 'worse').sort((a, b) => a.diff - b.diff)
  if (worse.length) {
    const c = worse[0]
    return {
      tone: 'loss',
      text: `Tilt: ${c.label.toLowerCase()}, your decisions drop ${Math.abs(c.diff)} points below your usual on the same kind of spots.`,
    }
  }
  const tested = cuts.filter((c) => c.diff !== null && c.diff !== undefined)
  if (!tested.length) return { tone: 'muted', text: 'Not enough graded decisions after a blow to tell yet.' }
  return {
    tone: 'gain',
    text: `No sign of tilt. After a bad beat, a big lost pot, a bust or a blunder, your decisions hold up against the same kind of spots.`,
  }
}

/** The blunder note: raw accuracy after a blunder looks bad, the mix explains it. */
export function blunderNote(t) {
  const c = (t?.cuts || []).find((x) => x.key === 'blunder')
  if (!c || c.diff === null || c.diff === undefined || c.finding) return null
  if (c.rest === null || c.accuracy === null || c.rest - c.accuracy < 3) return null
  return `Mistakes do come in clusters (${c.accuracy}% after a blunder against ${c.rest}% otherwise), but on the same kind of spots the gap is ${signed(c.diff)} — the clusters are stretches of hard short-stack spots, not tilt.`
}

/** "+3.6" / "−1.2" / "—". */
export function signed(x) {
  if (x === null || x === undefined) return '—'
  if (x === 0) return '0'
  return `${x > 0 ? '+' : '−'}${Math.abs(x)}`
}

/** The tone of a cut's gap: a finding is coloured, anything else muted. */
export function cutTone(c) {
  return c.finding === 'worse' ? 'loss' : c.finding === 'better' ? 'gain' : 'muted'
}
