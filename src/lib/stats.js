/*
  Stats.

  Pure functions over a list of sessions — no storage, no React — so every
  number on the Stats screen is unit-tested (stats.test.js).

  Cash and tournament results are never blended into one rate. $/hour means
  something for a cash game and nothing for a tournament, and ROI is the
  reverse; only the overall profit total spans both.
*/

import { cashedIn, compareSessions, isActive, isTournament, minutesPlayed, profit, totalIn, totalOut } from './sessions.js'
import { daysAgoKey, todayKey } from './time.js'

export const PERIODS = {
  all: 'All time',
  year: 'This year',
  d90: 'Last 90 days',
  d30: 'Last 30 days',
}

/** Finished sessions only: an active session has no result yet. */
export const finished = (sessions) => sessions.filter((s) => !isActive(s))

/**
 * Apply the Stats screen filters. Any filter left as 'all' / '' is ignored.
 *
 * @param {object[]} sessions
 * @param {{format?, setting?, period?, venue?, event?}} f
 */
export function filterSessions(sessions, f = {}, today = new Date()) {
  let since = null
  if (f.period === 'year') since = `${today.getFullYear()}-01-01`
  if (f.period === 'd90') since = daysAgoKey(90, today)
  if (f.period === 'd30') since = daysAgoKey(30, today)
  const until = todayKey(today)

  return sessions.filter((s) => {
    if (f.format && f.format !== 'all' && s.format !== f.format) return false
    if (f.setting && f.setting !== 'all' && s.setting !== f.setting) return false
    if (since && (s.date < since || s.date > until)) return false
    if (f.venue && s.venue !== f.venue) return false
    if (f.event && s.event !== f.event) return false
    return true
  })
}

/** Net result of every finished session given, in cents. */
export function netProfit(sessions) {
  return finished(sessions).reduce((sum, s) => sum + (profit(s) ?? 0), 0)
}

/**
 * Cash-game stats.
 *
 * $/hour only counts sessions that have both a start and an end time: dividing
 * the profit of ALL sessions by the hours of SOME of them would inflate the rate
 * every time she forgot to note a time.
 */
export function cashStats(sessions) {
  const done = finished(sessions).filter((s) => !isTournament(s))
  const results = done.map(profit)
  const net = results.reduce((a, b) => a + b, 0)

  let timedMinutes = 0
  let timedProfit = 0
  let untimed = 0
  for (const s of done) {
    const mins = minutesPlayed(s)
    if (mins === null) {
      untimed += 1
      continue
    }
    timedMinutes += mins
    timedProfit += profit(s)
  }

  const wins = results.filter((p) => p > 0).length
  return {
    count: done.length,
    net,
    minutes: timedMinutes,
    hourly: timedMinutes > 0 ? Math.round((timedProfit / timedMinutes) * 60) : null,
    winRate: done.length ? wins / done.length : null,
    average: done.length ? Math.round(net / done.length) : null,
    best: results.length ? Math.max(...results) : null,
    worst: results.length ? Math.min(...results) : null,
    untimed,
  }
}

/**
 * Tournament stats.
 *
 * ROI = profit / everything paid in (buy-ins, re-entries, add-ons). ITM ("in the
 * money") is the share of tournaments that paid her anything, bounties
 * included — a bounty-only finish still put money back in her pocket.
 */
export function tournamentStats(sessions) {
  const done = finished(sessions).filter(isTournament)
  const spent = done.reduce((sum, s) => sum + totalIn(s), 0)
  const won = done.reduce((sum, s) => sum + (totalOut(s) ?? 0), 0)
  const placed = done.filter((s) => Number.isFinite(s.place) && s.place > 0)

  // Best finish is ranked by place, then by the size of the field it was in:
  // 2nd of 180 beats 2nd of 12.
  const best = [...placed].sort((a, b) => a.place - b.place || (b.entrants || 0) - (a.entrants || 0))[0]

  return {
    count: done.length,
    spent,
    won,
    net: won - spent,
    roi: spent > 0 ? (won - spent) / spent : null,
    itm: done.length ? done.filter(cashedIn).length / done.length : null,
    cashes: done.filter(cashedIn).length,
    biggestCash: done.length ? Math.max(...done.map((s) => totalOut(s) ?? 0)) : null,
    bestFinish: best ? { place: best.place, entrants: best.entrants, name: best.game, date: best.date } : null,
    averageFinish: placed.length ? Math.round(placed.reduce((sum, s) => sum + s.place, 0) / placed.length) : null,
  }
}

/**
 * Running total after each finished session, oldest first — the chart's data.
 *
 * @returns {{session, result:number, total:number}[]}
 */
export function cumulative(sessions) {
  let total = 0
  return finished(sessions)
    .sort(compareSessions)
    .map((session) => {
      const result = profit(session) ?? 0
      total += result
      return { session, result, total }
    })
}

/**
 * Group finished sessions by a field (venue, game, event) and total each group,
 * biggest earner first. Blank values are grouped under `blank`.
 */
export function breakdown(sessions, key, blank = '—') {
  const groups = new Map()
  for (const s of finished(sessions)) {
    const label = (s[key] || '').trim() || blank
    const g = groups.get(label) || { label, count: 0, net: 0, minutes: 0, timedProfit: 0, spent: 0 }
    const p = profit(s) ?? 0
    const mins = minutesPlayed(s)
    g.count += 1
    g.net += p
    g.spent += totalIn(s)
    if (mins !== null) {
      g.minutes += mins
      g.timedProfit += p
    }
    groups.set(label, g)
  }
  return [...groups.values()]
    .map((g) => ({
      ...g,
      hourly: g.minutes > 0 ? Math.round((g.timedProfit / g.minutes) * 60) : null,
      roi: g.spent > 0 ? g.net / g.spent : null,
    }))
    .sort((a, b) => b.net - a.net)
}

/** Distinct non-blank values of a field, most recently used first — for pickers and suggestions. */
export function distinctValues(sessions, key) {
  const seen = new Set()
  const out = []
  for (const s of [...sessions].sort(compareSessions).reverse()) {
    const v = (s[key] || '').trim()
    if (v && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out
}
