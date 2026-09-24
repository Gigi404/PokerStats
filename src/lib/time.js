/*
  Dates and times.

  A session's date is a local 'YYYY-MM-DD' string and its start/end are local
  'HH:MM' strings — exactly what <input type="date"> and <input type="time">
  produce. Nothing is stored as a timestamp: "I sat down at 8pm on Friday" is a
  wall-clock fact, and converting it through UTC is how a late session ends up
  filed under the wrong day.
*/

const pad = (n) => String(n).padStart(2, '0')

/** Today as 'YYYY-MM-DD' in local time. (toISOString() would be UTC.) */
export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** The current local time as 'HH:MM'. */
export function nowHHMM(now = new Date()) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** 'HH:MM' → minutes since midnight, or null. */
export function toMinutes(hhmm) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Minutes played between two 'HH:MM' times.
 *
 * An end earlier than the start means the session crossed midnight — sat down
 * at 21:00, left at 02:30 is five and a half hours, not minus eighteen and a
 * half. Live sessions longer than 24 hours are not a case worth modelling.
 *
 * @returns {number|null} null when either time is missing
 */
export function durationMinutes(start, end) {
  const a = toMinutes(start)
  const b = toMinutes(end)
  if (a === null || b === null) return null
  return b >= a ? b - a : b + 24 * 60 - a
}

/** 200 → "3h 20m", 45 → "45m". */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

/** 'YYYY-MM-DD' → "Fri, Sep 19". Parsed as local noon so no timezone can shift the day. */
export function formatDay(key, withYear = false) {
  if (!key) return ''
  const date = new Date(`${key}T12:00:00`)
  return date.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

/** 'YYYY-MM-DD' → "September 2026" — the month headings in the session list. */
export function formatMonth(key) {
  const date = new Date(`${key.slice(0, 7)}-01T12:00:00`)
  return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

/** The 'YYYY-MM-DD' key `days` days before `from`. */
export function daysAgoKey(days, from = new Date()) {
  const date = new Date(from)
  date.setDate(date.getDate() - days)
  return todayKey(date)
}
