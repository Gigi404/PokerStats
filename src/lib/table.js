/*
  The puzzle table (2026-11-15, owner: "something that looks like PokerStars
  tables, and then you make your decisions"). PokerEdge core/puzzle_tables.py
  sends each puzzle's table as `t`:

    max, seats [[position, starting stack bb]], h (hero), b (button),
    acts [[seat, street 0-3, kind, chips bb]], board, street, shown

  This turns `t` into FRAMES the table component plays one by one, so the
  hand is dealt out action by action up to the question. Pure, no React.

  kind: a ante, s small blind, B big blind, f fold, x check, c call,
  b bet, r raise, A all-in. Antes and blinds land in the first frame
  together: nobody wants to watch eight antes.
*/

const FORCED = new Set(['a', 's', 'B'])
const BOARD_AT = [0, 3, 4, 5]
const round = (x) => Math.round(x * 10) / 10

/** "Raise to 2.5", "Call 1.5", "Check" … the bubble over a seat. */
export function actionLabel(kind, chips, betAfter) {
  switch (kind) {
    case 'f':
      return 'Fold'
    case 'x':
      return 'Check'
    case 'c':
      return `Call ${round(chips)}`
    case 'b':
      return `Bet ${round(chips)}`
    case 'r':
      return `Raise to ${round(betAfter)}`
    case 'A':
      return 'All-in'
    case 's':
      return 'SB'
    case 'B':
      return 'BB'
    default:
      return ''
  }
}

/**
 * The frames of a puzzle's hand, oldest first. Each frame:
 *   { seats: [{pos, stack, bet, folded, allin, said}], pot, boardCount,
 *     street, actor (seat index or null) }
 * `pot` is what sits in the middle, without the bets still in front of the
 * players (as a poker client draws it). The last frame is the question.
 *
 * @param {object} t  the puzzle's table (see the header)
 * @returns {object[]}
 */
export function frames(t) {
  let seats = t.seats.map(([pos, stack]) => ({ pos, stack, bet: 0, folded: false, allin: false, said: '' }))
  let pot = 0
  let street = 0
  const out = []
  const snap = (actor) => out.push({ seats: seats.map((s) => ({ ...s })), pot: round(pot), boardCount: BOARD_AT[street], street, actor })

  // New street: bets go into the middle, the bubbles clear.
  const sweep = () => {
    pot += seats.reduce((n, s) => n + s.bet, 0)
    seats = seats.map((s) => ({ ...s, bet: 0, said: '' }))
  }

  let forcedDone = false
  for (const [i, s, kind, chips] of t.acts) {
    if (!FORCED.has(kind) && !forcedDone) {
      snap(null)
      forcedDone = true
    }
    if (s > street) {
      sweep()
      street = s
    }
    const seat = seats[i]
    if (!seat) continue
    seat.stack = round(Math.max(0, seat.stack - chips))
    if (kind === 'a') pot += chips
    else seat.bet = round(seat.bet + chips)
    if (kind === 'f') seat.folded = true
    if (kind === 'A' || (seat.stack <= 0.05 && kind !== 'f' && kind !== 'a')) seat.allin = true
    if (kind !== 'a') seat.said = actionLabel(kind, chips, seat.bet)
    if (!FORCED.has(kind)) snap(i)
  }
  if (!forcedDone) snap(null)
  // The question: on the decision's street, hero to act.
  if (t.street > street) {
    sweep()
    street = t.street
  }
  const last = { seats: seats.map((x) => ({ ...x })), pot: round(pot), boardCount: BOARD_AT[street], street, actor: t.h }
  out.push(last)
  return out
}

/** Chips hero needs to put in to call at the question (0 when nobody bet). */
export function toCall(frame, hero) {
  const top = Math.max(...frame.seats.map((s) => s.bet))
  return round(Math.max(0, Math.min(top - frame.seats[hero].bet, frame.seats[hero].stack)))
}

/** The pot hero is looking at: the middle plus every bet in front. */
export function totalPot(frame) {
  return round(frame.pot + frame.seats.reduce((n, s) => n + s.bet, 0))
}

/**
 * Where each seat sits around the oval, hero at the bottom, then clockwise
 * in seat order (the order the hand history lists them). Percent of the
 * table box: {x, y} for the seat, {bx, by} for its bet, {dx, dy} for the
 * dealer button.
 */
export function layout(n, hero) {
  return Array.from({ length: n }, (_, i) => {
    const k = (i - hero + n) % n
    const a = Math.PI / 2 + (k * 2 * Math.PI) / n
    const c = Math.cos(a)
    const s = Math.sin(a)
    return {
      x: 50 + 42 * c,
      y: 50 + 41 * s,
      bx: 50 + 26 * c,
      by: 50 + 25 * s,
      dx: 50 + 31 * c + 6 * Math.cos(a + Math.PI / 2),
      dy: 50 + 30 * s + 6 * Math.sin(a + Math.PI / 2),
    }
  })
}

/** The board cards as a list, and how many show at a frame (all, after the answer). */
export function boardCards(t) {
  return String(t.board || '').split(/\s+/).filter(Boolean)
}
