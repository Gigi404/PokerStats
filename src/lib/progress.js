/*
  Weekly progress wording (PokerEdge core/progress.py → play.progress).
*/

/**
 * The headline: the latest week with enough decisions, against the average
 * of the solid weeks before it (up to four).
 */
export function progressHeadline(weeks) {
  const solid = weeks.filter((w) => !w.thin)
  if (!solid.length) return null
  const last = solid.at(-1)
  const before = solid.slice(-5, -1)
  if (!before.length) return { last, change: null }
  const avg = before.reduce((a, w) => a + w.per_100, 0) / before.length
  return { last, avg: Math.round(avg * 10) / 10, change: Math.round((last.per_100 - avg) * 10) / 10 }
}
