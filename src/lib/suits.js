/*
  Which tournaments suit you (Phase 8 step 7) — wording for PokerEdge's
  core/suits.py (play.suits). The beast does the counting and the statistics;
  this file only turns its numbers into sentences.
*/

/** Short tab labels for the dimensions, in the file's order. */
export const DIMENSION_TABS = {
  format: 'Format',
  buy_in: 'Buy-in',
  field: 'Field',
  start: 'Start',
  stage: 'In game',
  night: 'Night',
}

/** How each dimension reads inside a sentence: "in <label> <phrase>". */
const PHRASE = {
  format: (l) => `in ${l} tournaments`,
  buy_in: (l) => `at ${l} buy-ins`,
  field: (l) => `in fields of ${l.toLowerCase()} players`,
  start: (l) => `in tournaments started ${l.toLowerCase().startsWith('before') ? l.toLowerCase() : `at ${l}`}`,
  stage: (l) => `${l.toLowerCase()} into a tournament`,
  night: (l) => `in the ${l.toLowerCase().replace(' +', ' and later')} of a night`,
}

/**
 * One sentence for a finding: where the play stands apart, which way, and by
 * how much against the same kind of spots elsewhere.
 *
 * @param {{dimension: string, label: string, accuracy: number, expected: number, diff: number}} f
 * @returns {string}
 */
export function findingSentence(f) {
  const where = (PHRASE[f.dimension] || ((l) => `in ${l}`))(f.label)
  const better = f.diff > 0
  const pts = Math.abs(f.diff).toFixed(1).replace(/\.0$/, '')
  return `You decide ${better ? 'better' : 'worse'} ${where}: ${f.accuracy}% accurate, ${pts} points ${
    better ? 'above' : 'below'
  } your usual on the same kind of spots.`
}

/**
 * The headline when nothing stands out: still a result, and the honest one
 * until there is enough play to tell cells apart.
 *
 * @param {{overall: {decisions: number}, finding_se: number}} s
 */
export function quietSentence(s) {
  return `Nothing stands out yet. Across ${s.overall.decisions.toLocaleString('en-CA')} decisions, no format, buy-in, time or stage plays clearly better or worse than the rest on like-for-like spots. A lower letter in a row below mostly means harder spots there (more short-stack all-ins), not worse play.`
}

/** True when a row's money has enough tournaments to read at all. */
export const moneyReadable = (row) => !!row.money && !row.money.thin && row.money.roi !== null
