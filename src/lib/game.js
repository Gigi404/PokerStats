/*
  The puzzle game layer (2026-11-15, owner: "more of a feeling like playing
  a game"): points, a streak, levels and mastery per kind of spot, and an
  optional time bank. Pure functions; the state lives in IndexedDB meta
  'puzzleGame' beside the Leitner schedule ('puzzles', lib/puzzles.js),
  on this phone only.

  SCORING (one answer)
    wrong                     0
    right                   100
    + streak bonus           10 per right answer already in the streak, up to +100
    + time bonus (time bank)  5 per second left
  The streak counts right answers in a row; a wrong one, or running out of
  time, ends it. Points add up to XP; levels need a little more each time.

  MASTERY (per kind of spot, the filter chips' groups)
    A puzzle counts as mastered once it sits in Leitner box 2 or higher:
    right at least twice, the second time a day or more after the first, so
    a lucky tap does not count. Mastery = mastered / puzzles of that kind.
*/

export const GAME_KEY = 'puzzleGame'
export const TIME_BANK_S = 15
export const MASTERED_BOX = 2

/** A fresh state, for a phone that never played. */
export function emptyGame() {
  return { xp: 0, streak: 0, best: 0, days: {}, sound: true, timeBank: false }
}

/** Points for one answer. */
export function points(right, streak, secondsLeft = null) {
  if (!right) return 0
  const bonus = Math.min(streak * 10, 100)
  const time = secondsLeft === null ? 0 : Math.max(0, Math.round(secondsLeft)) * 5
  return 100 + bonus + time
}

const dayKey = (now) => {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The state after one answer, and what to celebrate.
 *
 * @returns {{game: object, gained: number, levelUp: boolean, newBest: boolean}}
 */
export function score(game, right, now, secondsLeft = null) {
  const g = { ...emptyGame(), ...game }
  const gained = points(right, g.streak, secondsLeft)
  const streak = right ? g.streak + 1 : 0
  const key = dayKey(now)
  const d = g.days[key] || { answered: 0, right: 0, points: 0 }
  const before = level(g.xp).level
  const next = {
    ...g,
    xp: g.xp + gained,
    streak,
    best: Math.max(g.best, streak),
    days: { ...g.days, [key]: { answered: d.answered + 1, right: d.right + (right ? 1 : 0), points: d.points + gained } },
  }
  return { game: next, gained, levelUp: level(next.xp).level > before, newBest: streak > g.best && streak > 1 }
}

/** Today's tally: answered, right, points. */
export function todayScore(game, now) {
  return game?.days?.[dayKey(now)] || { answered: 0, right: 0, points: 0 }
}

/**
 * The level for an amount of XP. Level n needs 500·n·(n+1)/2 XP in total
 * (500 to reach 2, 1,500 to reach 3, 3,000 to reach 4 …): about five right
 * answers for the first level, and each one a little longer.
 *
 * @returns {{level: number, into: number, need: number, pct: number}}
 */
export function level(xp) {
  let n = 1
  while (500 * (n * (n + 1)) / 2 <= xp) n += 1
  const floor = (500 * ((n - 1) * n)) / 2
  const ceil = (500 * (n * (n + 1))) / 2
  return { level: n, into: xp - floor, need: ceil - floor, pct: Math.round((100 * (xp - floor)) / (ceil - floor)) }
}

/** A name for a level, so it reads like a game rather than a number. */
export function levelName(n) {
  const names = ['Fish', 'Rounder', 'Grinder', 'Reg', 'Shark', 'Crusher', 'High roller', 'Legend']
  return names[Math.min(n - 1, names.length - 1)]
}

/**
 * Mastery per filter group: [{key, label, mastered, total, pct}], skipping
 * groups with no puzzle. `filters` are lib/puzzles.js FILTERS minus "all".
 */
export function mastery(items, progress, filters) {
  return filters
    .map((f) => {
      const pool = items.filter(f.test)
      const mastered = pool.filter((p) => (progress[p.id]?.box || 0) >= MASTERED_BOX).length
      return { key: f.key, label: f.label, mastered, total: pool.length, pct: pool.length ? Math.round((100 * mastered) / pool.length) : 0 }
    })
    .filter((m) => m.total > 0)
}

/** The game choice in front of the spot chips. */
export const GAMES = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'tournament', label: 'Tournaments', test: (p) => (p.game || 'tournament') === 'tournament' },
  { key: 'cash', label: 'Cash', test: (p) => p.game === 'cash' },
]

/** A filter that keeps both a game and a spot filter: {key, label, test}. */
export function both(gameKey, spot) {
  const g = GAMES.find((x) => x.key === gameKey) || GAMES[0]
  return { key: `${g.key}:${spot.key}`, label: spot.label, test: (p) => g.test(p) && spot.test(p) }
}
