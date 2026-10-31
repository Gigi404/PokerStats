/*
  Variance wording — PokerEdge core/variance.py (play.variance). The beast
  resamples hero's own results; this says what that means in plain words. Every
  figure assumes the future looks like the past, and the card says so.
*/

const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(Math.round(x))}%`

/** A 95% range: "−23% to +240%". */
export function rangeText(s) {
  return `${signed(s.low)} to ${signed(s.high)}`
}

/** The headline: is the ROI proven, and does it survive losing the best run? */
export function varianceHeadline(v) {
  if (!v) return { tone: 'muted', text: 'Not enough tournaments to tell yet.' }
  const without = v.without_best
  if (without.above_zero >= 97.5) {
    return { tone: 'gain', text: `You’re ahead even without your best tournament: ${signed(without.roi)} ROI without it.` }
  }
  if (v.all.above_zero >= 97.5) {
    return {
      tone: 'muted',
      text: `Your ${signed(v.all.roi)} ROI rests on one result. Without your best tournament it’s ${signed(without.roi)}, and the range still includes break-even.`,
    }
  }
  return {
    tone: 'muted',
    text: `Your ${signed(v.all.roi)} ROI isn’t proven yet. The real figure could be anywhere from ${rangeText(v.all)}.`,
  }
}

/** How far through the sample needed: "228 of about 4,800 tournaments". */
export function sampleText(v, side) {
  return `${v.n.toLocaleString('en-CA')} of about ${side.needed.toLocaleString('en-CA')} tournaments`
}

/** A buy-in, as money. */
export function buyInText(b) {
  return `$${Number(b).toFixed(2)}`
}
