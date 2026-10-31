/*
  Position wording — PokerEdge analysis/position.py (play.position). The beast
  measures results on heads-up flops; this reads them. A measure, never a
  grade, so a thin or noisy gap is said to be one.
*/

const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x)}`

/** "+0.13 bb" or "too few" under the block's minimum. */
export function sideValue(s, minRead = 30) {
  if (!s?.n || s.n < minRead || s.bb === null) return 'too few'
  return `${signed(s.bb)}bb`
}

/** In-position minus out-of-position, with its standard error; null when too thin. */
export function edge(side, minRead = 30) {
  const { ip, oop } = side || {}
  if (!ip || !oop || ip.n < minRead || oop.n < minRead) return null
  return { bb: Math.round((ip.bb - oop.bb) * 100) / 100, se: Math.round(Math.hypot(ip.se, oop.se) * 100) / 100 }
}

/** The verdict for one game: how much of the pool's positional edge you take. */
export function positionHeadline(g, minRead = 30) {
  const mine = edge(g?.hero, minRead)
  const pool = edge(g?.pool, minRead)
  if (!mine || !pool) return 'Not enough heads-up flops to read yet.'
  const gap = Math.abs(mine.bb - pool.bb)
  const noise = Math.hypot(mine.se, pool.se)
  const compare = `Being in position is worth ${signed(mine.bb)}bb a hand to you, and ${signed(pool.bb)}bb to the pool.`
  if (gap < noise) return `${compare} That gap is within the noise.`
  const side = mine.bb < pool.bb ? 'You take less of it than they do' : 'You take more of it than they do'
  return gap >= 2 * noise ? `${compare} ${side}.` : `${compare} ${side}, though not by much more than the noise.`
}

/** "dry 2 of 40, wet 5 of 30": flop mistakes by board, for one game. */
export function textureLine(block) {
  if (!block) return null
  const parts = ['dry', 'semi-wet', 'wet'].filter((k) => block[k]?.n).map((k) => `${k} ${block[k].mistakes} of ${block[k].n}`)
  return parts.length ? parts.join(', ') : null
}
