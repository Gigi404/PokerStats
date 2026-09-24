/*
  Helpers for the Playground tab — pure functions over the playground.json the
  daily fetcher writes (scripts/fetch-playground.mjs), unit-tested in
  playground.test.js.

  Amounts in that file are whole DOLLARS, as Playground publishes them; the rest
  of the app works in cents, so convert with toCentsFromDollars before handing
  anything to money.js.
*/

import { formatDay } from './time.js'

export const KIND_LABELS = { all: 'All', daily: 'Daily', series: 'Series', satellite: 'Satellites' }

/** Playground's dollars → the app's cents. */
export const toCentsFromDollars = (dollars) => (Number.isFinite(dollars) ? Math.round(dollars * 100) : null)

function shiftDay(key, days) {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'Today', 'Tomorrow', or 'Sat 27'. */
export function dayLabel(key, today) {
  if (key === today) return 'Today'
  if (key === shiftDay(today, 1)) return 'Tomorrow'
  const d = new Date(`${key}T12:00:00`)
  return `${d.toLocaleDateString('en-CA', { weekday: 'short' })} ${d.getDate()}`
}

/**
 * The days (from today on) that have at least one tournament of this kind —
 * the chips across the top of the schedule. Capped so the row stays scannable.
 */
export function scheduleDays(tournaments, today, kind = 'all', limit = 21) {
  const days = []
  for (const t of tournaments) {
    if (t.date < today || (kind !== 'all' && t.kind !== kind)) continue
    if (days.at(-1) !== t.date) days.push(t.date)
    if (days.length >= limit) break
  }
  return days
}

/** One day's tournaments of a kind, in start order. */
export function tournamentsOn(tournaments, day, kind = 'all') {
  return tournaments
    .filter((t) => t.date === day && (kind === 'all' || t.kind === kind))
    .sort((a, b) => (a.time < b.time ? -1 : 1))
}

/**
 * Drop the series name from a series event's title when it is already shown:
 * "MSPT Canadian Poker Championship Event #1: $300 Mega Stack Day 1A"
 *   → "#1 · $300 Mega Stack Day 1A".
 */
export function shortName(t) {
  if (!t.seriesName) return t.name
  const m = t.name.match(/Event\s*#\s*(\w+)\s*:\s*(.+)$/i)
  return m ? `#${m[1]} · ${m[2]}` : t.name.replace(t.seriesName, '').trim() || t.name
}

/** A series' events grouped by day: [{ date, events: [...] }]. */
export function seriesSchedule(tournaments, key) {
  const days = []
  for (const t of tournaments) {
    if (t.series !== key || t.kind !== 'series') continue
    let day = days.find((d) => d.date === t.date)
    if (!day) {
      day = { date: t.date, events: [] }
      days.push(day)
    }
    day.events.push(t)
  }
  days.sort((a, b) => (a.date < b.date ? -1 : 1))
  for (const d of days) d.events.sort((a, b) => (a.time < b.time ? -1 : 1))
  return days
}

/** "Oct 1 – 12" or "Oct 28 – Nov 3". */
export function dateRange(start, end) {
  const a = new Date(`${start}T12:00:00`)
  const b = new Date(`${end}T12:00:00`)
  const month = (d) => d.toLocaleDateString('en-CA', { month: 'short' })
  if (start === end) return `${month(a)} ${a.getDate()}`
  return a.getMonth() === b.getMonth()
    ? `${month(a)} ${a.getDate()} – ${b.getDate()}`
    : `${month(a)} ${a.getDate()} – ${month(b)} ${b.getDate()}`
}

/** "$1M", "$125K", "$2.5M" — guarantee badges. */
export function compactDollars(dollars) {
  if (!Number.isFinite(dollars)) return ''
  if (dollars >= 1_000_000) return `$${+(dollars / 1_000_000).toFixed(dollars % 1_000_000 ? 1 : 0)}M`
  if (dollars >= 1_000) return `$${+(dollars / 1_000).toFixed(dollars % 1_000 ? 1 : 0)}K`
  return `$${dollars}`
}

/**
 * How old the data is, in words: "today at 6:02", "yesterday", "3 days ago".
 * Shown on the tab so a stale copy never passes for a fresh one.
 */
export function ageLabel(iso, now = new Date()) {
  if (!iso) return 'never'
  const then = new Date(iso)
  const key = (d) => d.toDateString()
  const days = Math.round((new Date(key(now)) - new Date(key(then))) / 86_400_000)
  if (days <= 0) return `today at ${then.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}`
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/** "Jul 2, 2026" for a last-hit date; old ones read as the year only. */
export function lastHitLabel(key) {
  if (!key) return null
  return formatDay(key, true).replace(/^\w+, /, '')
}
