/*
  The session model.

  One record covers every kind of poker she plays. Two independent choices
  describe it — FORMAT (cash or tournament) and SETTING (live or online) — so a
  live tournament at the casino and an online cash session are the same shape of
  record, and every stat can be filtered by either choice or both.

  Shape (amounts in cents, see money.js; times as local strings, see time.js):

    {
      id, format: 'cash'|'tournament', setting: 'live'|'online',
      status: 'active'|'done',        // 'active' = sitting at the table right now
      date: 'YYYY-MM-DD', start: 'HH:MM'|'', end: 'HH:MM'|'',
      venue,                          // casino when live, site when online
      game,                           // cash: stakes ("1/2 NLH"); tournament: its name
      buyIns: [cents, ...],           // first is the buy-in; the rest rebuys / re-entries / add-ons
      cashOut: cents|null,            // cash only
      prize: cents|null, bounties: cents|null,
      place: number|null, entrants: number|null,   // tournament only
      event: '',                      // special night: "Bad Beat Jackpot", "Promo night", ...
      notes: '', createdAt, updatedAt,
    }

  The fields of the other format are kept rather than wiped when the format is
  switched in the form, so flipping cash → tournament → cash by mistake loses
  nothing; the maths below only ever reads the fields that belong to the
  session's current format.
*/

import { sumCents } from './money.js'
import { durationMinutes, nowHHMM, todayKey } from './time.js'

export const FORMATS = { CASH: 'cash', TOURNAMENT: 'tournament' }
export const SETTINGS = { LIVE: 'live', ONLINE: 'online' }

/** Suggested special-night tags. She can type her own; these are just one tap away. */
export const EVENT_PRESETS = ['Bad Beat Jackpot', 'High Hand', 'Promo night', 'Freeroll', 'Home game']

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // randomUUID needs a secure context; this only runs on a plain-http dev box.
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * A blank session.
 *
 * @param {object} [overrides] fields to set, e.g. { format, setting, venue, game }
 */
export function newSession(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: newId(),
    format: FORMATS.CASH,
    setting: SETTINGS.LIVE,
    status: 'done',
    date: todayKey(),
    start: '',
    end: '',
    venue: '',
    game: '',
    buyIns: [],
    cashOut: null,
    prize: null,
    bounties: null,
    place: null,
    entrants: null,
    event: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * A session being started right now at the table: today, start = now, and the
 * venue and game carried over from her last session of the same format, which
 * is almost always where she is again.
 */
export function startSession(format, setting, previous = []) {
  const last = [...previous]
    .filter((s) => s.format === format && s.setting === setting)
    .sort(compareSessions)
    .at(-1)
  return newSession({
    format,
    setting,
    status: 'active',
    start: nowHHMM(),
    venue: last?.venue || '',
    game: last?.game || '',
  })
}

export const isTournament = (s) => s.format === FORMATS.TOURNAMENT
export const isActive = (s) => s.status === 'active'

/** Everything she paid in: buy-in plus every rebuy / re-entry / add-on. */
export function totalIn(session) {
  return sumCents(session.buyIns)
}

/**
 * Everything she took out, or null if the session is not finished enough to say.
 * A tournament with no prize entered finished out of the money (0), which is a
 * result; a cash session with no cash-out is simply not known yet.
 */
export function totalOut(session) {
  if (isTournament(session)) {
    return sumCents([session.prize, session.bounties])
  }
  return Number.isFinite(session.cashOut) ? session.cashOut : null
}

/** Profit in cents, or null while still in play / unknown. */
export function profit(session) {
  if (isActive(session)) return null
  const out = totalOut(session)
  return out === null ? null : out - totalIn(session)
}

/** Minutes played, or null when start or end is missing. */
export function minutesPlayed(session) {
  return durationMinutes(session.start, session.end)
}

/** Did a tournament pay her anything? */
export function cashedIn(session) {
  return isTournament(session) && sumCents([session.prize, session.bounties]) > 0
}

/** Chronological order: by date, then by start time (sessions with no time sort first that day). */
export function compareSessions(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  const sa = a.start || ''
  const sb = b.start || ''
  if (sa !== sb) return sa < sb ? -1 : 1
  return (a.createdAt || '') < (b.createdAt || '') ? -1 : 1
}

/**
 * What stops a session being saved, as a human sentence, or null if it is fine.
 * Finishing is stricter than saving: an active session may be saved half-filled
 * (that is what "I just sat down" is), but a finished cash session must say what
 * she left with, or its profit would silently count as unknown forever.
 */
export function validate(session) {
  if (!session.date) return 'Pick a date.'
  if (!session.buyIns.length || !session.buyIns.some((c) => c > 0)) return 'Enter the buy-in.'
  if (session.buyIns.some((c) => c === null || c < 0)) return 'One of the buy-ins is not a number.'
  if (session.status === 'done' && !isTournament(session) && !Number.isFinite(session.cashOut)) {
    return 'Enter the cash-out (0 if you busted).'
  }
  if (isTournament(session) && session.place && session.entrants && session.place > session.entrants) {
    return 'Finishing place is higher than the number of entrants.'
  }
  return null
}

/** 1 → "1st", 22 → "22nd", 13 → "13th". */
export function ordinal(n) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`
}
