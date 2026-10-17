/*
  Where she plays and at what stakes — the choices the session form offers.

  Live only (2026-10-16): online results arrive by themselves on the Online
  tab, so the form no longer offers an online session. A venue is a plain
  string on the session, as before; a home game is a venue that starts with
  HOME_PREFIX ("Home game · Marc's"), so every past session keeps working and
  Stats can still group by venue. Nothing here is stored on its own: the
  lists are rebuilt from the sessions already logged, so a home game or a
  stake typed once is offered from then on.

  A home game's sit & go FORMAT is its usual buy-in and starting chips
  ("$50 · 1,500 chips"), remembered per home game from its past tournament
  sessions (`buyIns[0]` and the `chips` field).
*/

import { formatMoney } from './money.js'

export const VENUE_PRESETS = ['Casino de Montréal', 'Playground']
export const HOME_PREFIX = 'Home game · '
export const STAKES_PRESETS = ['1/2 NL', '1/2 PLO']

export const isHomeGame = (venue) => String(venue || '').startsWith(HOME_PREFIX)
export const homeName = (venue) => (isHomeGame(venue) ? venue.slice(HOME_PREFIX.length) : venue)
export const homeVenue = (name) => `${HOME_PREFIX}${String(name).trim()}`

/** Most recent first, each value once, blanks dropped. */
function recentDistinct(sessions, pick) {
  const seen = new Set()
  const out = []
  for (const s of [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
    const v = pick(s)
    if (v && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out
}

/**
 * The "Where" choices: { places, homes }. Places are the presets, then any
 * other venue she has played live (older sessions typed by hand), then
 * `current` if it is none of those (an old online session's site), so the
 * select can always show what is saved. Homes are her home games, most
 * recently played first.
 */
export function venueOptions(sessions, current = '') {
  const venues = recentDistinct(sessions, (s) => s.venue)
  const homes = venues.filter(isHomeGame)
  const live = recentDistinct(sessions.filter((s) => s.setting !== 'online'), (s) => s.venue).filter((v) => !isHomeGame(v))
  const places = [...VENUE_PRESETS, ...live.filter((v) => !VENUE_PRESETS.includes(v))]
  if (current && !isHomeGame(current) && !places.includes(current)) places.push(current)
  if (current && isHomeGame(current) && !homes.includes(current)) homes.unshift(current)
  return { places, homes }
}

/** Cash stakes: the presets, then every other stake she has logged, then `current`. */
export function stakesOptions(sessions, current = '') {
  const past = recentDistinct(sessions.filter((s) => s.format === 'cash'), (s) => s.game)
  const out = [...STAKES_PRESETS, ...past.filter((g) => !STAKES_PRESETS.includes(g))]
  if (current && !out.includes(current)) out.push(current)
  return out
}

/** "$50 · 1,500 chips" (chips left out when unknown). */
export function formatLabel(buyIn, chips) {
  const money = formatMoney(buyIn).replace(/\.00$/, '')
  return chips ? `${money} · ${Number(chips).toLocaleString('en-CA')} chips` : money
}

/**
 * The sit & go formats played at one home game, most recent first:
 * [{ key, buyIn (cents), chips, label }].
 */
export function homeFormats(sessions, venue) {
  const at = sessions.filter((s) => s.venue === venue && s.format === 'tournament' && s.buyIns?.[0] > 0)
  return recentDistinct(at, (s) => `${s.buyIns[0]}|${s.chips || ''}`).map((key) => {
    const [buyIn, chips] = key.split('|')
    return { key, buyIn: Number(buyIn), chips: chips ? Number(chips) : null, label: formatLabel(Number(buyIn), chips) }
  })
}
