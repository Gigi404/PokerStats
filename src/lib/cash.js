/*
  Cash wording and shapes for the Online tab's Cash half (2026-11-15).
  The numbers come from PokerEdge core/cash_sessions.py (summary.cash); this
  only words them and reshapes them for the chart.
*/

import { signed } from './online.js'

/**
 * A session's win rate in words: bb/100 at one stake, "mixed stakes" across
 * several, where big blinds are worth different money (the session sheet
 * then lists each stake on its own).
 */
export function rateLabel(s) {
  if (s.stakes?.length > 1) return 'mixed stakes'
  return `${signed(s.bb_per_100)} bb/100`
}

/** "0.10/0.25" or, across several, "0.10/0.25 +1": the most-played first. */
export function stakesLabel(stakes) {
  if (!stakes?.length) return 'Cash'
  return stakes.length === 1 ? `$${stakes[0]}` : `$${stakes[0]} +${stakes.length - 1}`
}

/** "1h 54m", "35m", or "one hand" for a session of 0 minutes. */
export function minutesLabel(minutes) {
  if (!minutes) return 'under a minute'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

/**
 * The month of the last session, from by_month (null without sessions).
 * The latest month played, not the calendar month: "this month" would read
 * empty for a whole month off.
 */
export function cashMonth(cash) {
  const months = cash?.by_month || []
  return months.length ? months[months.length - 1] : null
}

/**
 * ProfitChart points, oldest first, in cents: {session, result, total}.
 * `session` carries what the chart's tooltip reads (date, venue).
 */
export function cashCurve(sessions) {
  let total = 0
  return [...(sessions || [])].reverse().map((s) => {
    const result = Math.round(s.net * 100)
    total += result
    return { session: { date: s.date, venue: `Cash · ${stakesLabel(s.stakes)}` }, result, total }
  })
}
