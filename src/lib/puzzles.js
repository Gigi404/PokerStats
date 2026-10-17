/*
  Puzzles from your own hands (Phase 8 step 4, PokerEdge core/puzzles.py →
  play.puzzles). A puzzle is one graded decision: the spot is shown, you
  answer, then you see what was right and why, in the grade lists' own words.

  SCHEDULING (kept on this phone, in IndexedDB meta 'puzzles')
  A small Leitner box per puzzle: a right answer moves it up a box and puts it
  away for longer (1, 3, 7, 21 days); a wrong one sends it back to box 0 and
  brings it back in REDO_MIN minutes, so a mistake returns until it is right.
  The next puzzle is: anything due, oldest first; else an unseen one from the
  area that costs you most ("your leaks first"), mixing mistakes with clearly
  right decisions so the answer is never simply "the other one".
*/

import { bbVerdict, bbWhy } from './bbDefence.js'
import { flopVerdict, flopWhy } from './flopGrades.js'
import { verdictLine, whyLines } from './grades.js'

const DAY = 24 * 60 * 60 * 1000
export const REDO_MIN = 10
const INTERVAL_DAYS = [0, 1, 3, 7, 21]

/** The filter chips: which puzzles each one keeps. */
export const FILTERS = [
  { key: 'leaks', label: 'Your leaks first', test: () => true },
  { key: 'shove', label: 'Shove or fold', test: (p) => p.group === 'steal' || (p.group === 'short_stack' && p.g.spot === 'shove') },
  { key: 'raise', label: 'Facing a raise', test: (p) => p.group === 'short_stack' && (p.g.spot === 'reshove' || p.g.spot === 'fourbet') },
  { key: 'call', label: 'Calling a shove', test: (p) => p.group === 'short_stack' && p.g.spot === 'call' },
  { key: 'bb', label: 'Big blind', test: (p) => p.group === 'bb' },
  { key: 'postflop', label: 'After the flop', test: (p) => ['flop', 'turn', 'river'].includes(p.group) },
]

/** The area a puzzle trains: the leak key without the answer ('shove', 'call', 'postflop', …). */
export const area = (p) => p.lesson.split(':')[0]

const STREET = { flop: 'Flop', turn: 'Turn', river: 'River' }

/**
 * The question: what you see, and the two choices.
 *
 * @returns {{kind: string, text: string, board: string, options: {value: string, label: string}[]}}
 */
export function question(p) {
  const g = p.g
  const where = [g.seat, Number.isFinite(g.stack_bb) ? `${g.stack_bb}bb` : null].filter(Boolean).join(' · ')
  if (p.group === 'steal' || (p.group === 'short_stack' && g.spot === 'shove')) {
    const play = p.group === 'steal' ? { value: 'play', label: 'Raise or shove' } : { value: 'shove', label: 'All-in' }
    return { kind: 'Shove or fold', text: `${where}. Everyone folds to you.`, board: '', options: [{ value: 'fold', label: 'Fold' }, play] }
  }
  if (p.group === 'short_stack' && g.spot === 'reshove') {
    return { kind: 'Facing a raise', text: `${where}. A player raises in front of you; ${g.to_call_bb}bb to call.`, board: '', options: [{ value: 'fold', label: 'Fold' }, { value: 'shove', label: 'Re-shove' }] }
  }
  if (p.group === 'short_stack' && g.spot === 'fourbet') {
    return { kind: 'Facing a 3-bet', text: `${where}. You opened and got 3-bet.`, board: '', options: [{ value: 'fold', label: 'Fold' }, { value: 'shove', label: 'All-in' }] }
  }
  if (p.group === 'short_stack') {
    return {
      kind: 'Calling a shove',
      text: `${where}. A player shoves: ${g.to_call_bb}bb to call into a ${g.pot_bb}bb pot.`,
      board: '',
      options: [{ value: 'fold', label: 'Fold' }, { value: 'call', label: 'Call' }],
    }
  }
  if (p.group === 'bb') {
    const from = { early: 'an early seat', middle: 'a middle seat', BTN: 'the button', SB: 'the small blind' }[g.opener] || 'a player'
    return {
      kind: 'Big blind',
      text: `Big blind, ${g.stack_bb}bb. A raise from ${from} to ${g.raise_to_bb}bb; everyone else folds.`,
      board: '',
      options: [{ value: 'fold', label: 'Fold' }, { value: 'defend', label: 'Defend' }],
    }
  }
  return {
    kind: `${STREET[p.group] || 'After the flop'}`,
    text: `Pot ${g.pot_bb}bb. You face a ${g.bet_pct}% pot bet. Stack-to-pot ratio ${Math.round(g.spr * 10) / 10}.`,
    board: g.board || '',
    options: [{ value: 'fold', label: 'Fold' }, { value: 'continue', label: 'Continue' }],
  }
}

/** The answer: right or not, what was better, why, and what you did at the table. */
export function explain(p, picked) {
  const g = p.g
  const right = picked === p.answer
  const lines = (w) => (Array.isArray(w) ? w : [...(w?.lines || []), w?.conclusion].filter(Boolean))
  let verdict
  let why
  if (p.group === 'bb') {
    verdict = bbVerdict(g)
    why = lines(bbWhy(g))
  } else if (['flop', 'turn', 'river'].includes(p.group)) {
    verdict = flopVerdict(g)
    why = lines(flopWhy(g))
  } else {
    verdict = verdictLine(g)
    why = lines(whyLines(g))
  }
  const label = question(p).options.find((o) => o.value === p.answer)?.label || p.answer
  const did = g.action === 'fold' ? 'folded' : g.action === 'shove' ? 'went all-in' : `${g.action === 'call' ? 'called' : g.action}`
  return {
    right,
    headline: right ? `Right — ${label.toLowerCase()}.` : `Not quite — the better play is ${label.toLowerCase()}.`,
    why,
    table: `At the table you ${did}${g.verdict === 'mistake' ? ' — that was the mistake.' : ', and that was right.'}`,
    value: verdict.value,
  }
}

/** Record an answer: right moves the puzzle up a box, wrong brings it back soon. */
export function record(progress, id, right, now) {
  const p = progress[id] || { box: 0, seen: 0, right: 0 }
  const box = right ? Math.min(p.box + 1, INTERVAL_DAYS.length - 1) : 0
  const due = right ? now + INTERVAL_DAYS[box] * DAY : now + REDO_MIN * 60 * 1000
  return { ...progress, [id]: { box, due, seen: p.seen + 1, right: p.right + (right ? 1 : 0), last: now, lastRight: right } }
}

/** A stable small number from an id, to mix puzzles without randomness. */
function hash(s) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

/**
 * The next puzzle under a filter: anything due (oldest first), else an
 * unseen one from the costliest area, else the one due soonest. Never the
 * puzzle just answered when another exists.
 */
export function nextPuzzle(items, progress, filterKey, now, lastId = null) {
  const filter = FILTERS.find((f) => f.key === filterKey) || FILTERS[0]
  const pool = items.filter(filter.test)
  if (!pool.length) return null
  const notLast = pool.filter((p) => p.id !== lastId)
  const list = notLast.length ? notLast : pool

  const due = list.filter((p) => progress[p.id] && progress[p.id].due <= now).sort((a, b) => progress[a.id].due - progress[b.id].due)
  if (due.length) return due[0]

  const cost = {}
  for (const p of items) if (p.g.verdict === 'mistake') cost[area(p)] = (cost[area(p)] || 0) + (p.g.cost_bb || 0)
  // Within an area: two mistakes, then one clearly right decision, and so on,
  // so leaks lead but the answer is never always "the other one".
  const rank = {}
  const byArea = {}
  for (const p of list.filter((x) => !progress[x.id])) (byArea[area(p)] ||= []).push(p)
  for (const ps of Object.values(byArea)) {
    const wrong = ps.filter((p) => p.g.verdict === 'mistake').sort((a, b) => hash(a.id) - hash(b.id))
    const right = ps.filter((p) => p.g.verdict !== 'mistake').sort((a, b) => hash(a.id) - hash(b.id))
    wrong.forEach((p, k) => (rank[p.id] = Math.floor(k / 2) * 3 + (k % 2)))
    right.forEach((p, k) => (rank[p.id] = k * 3 + 2))
  }
  const unseen = Object.values(byArea)
    .flat()
    .sort((a, b) => (cost[area(b)] || 0) - (cost[area(a)] || 0) || rank[a.id] - rank[b.id])
  if (unseen.length) return unseen[0]

  return list.slice().sort((a, b) => progress[a.id].due - progress[b.id].due)[0]
}

/** Today's tally on this phone: answered and right. */
export function today(progress, now) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const rows = Object.values(progress).filter((p) => p.last >= start.getTime())
  return { answered: rows.length, right: rows.filter((p) => p.lastRight).length }
}

/** How many puzzles still need work: mistakes not yet answered right, and anything due. */
export function remaining(items, progress, now) {
  return items.filter((p) => {
    const s = progress[p.id]
    return s ? s.due <= now : p.g.verdict === 'mistake'
  }).length
}
