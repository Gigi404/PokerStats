/*
  The hand replay (Phase 8 step 3): a key hand (PokerEdge core/day_review.py
  _describe) cut into steps, one per street plus the result, so the phone can
  walk through it like a table.

  A key hand carries
    streets: [{ street, actions: ['You raise to 3.0bb', …], pot_bb }]  pot_bb = pot as the street began
    board: ['Qh', '3h', …], shown: [{ seat, cards }], pot_bb (final), net_bb,
    grade (short-stack all-in), bb_grade, postflop_grades: [{ street, … }],
    allin: { street, equity, luck_bb, actual_bb }
  Every grade is the beast's; this file only places each one on the street
  where the decision was made, worded by the existing grade helpers.
*/

import { bbVerdict, bbWhy } from './bbDefence.js'
import { flopVerdict, flopWhy } from './flopGrades.js'
import { verdictLine, whyLines } from './grades.js'

const BOARD_AT = { preflop: 0, flop: 3, turn: 4, river: 5 }
const NAMES = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' }

/** Can this key hand be replayed? It needs at least one street of action. */
export function canReplay(h) {
  return Array.isArray(h?.streets) && h.streets.length > 0
}

/** The grade notes for one street, worded like the grade lists. */
function notesFor(h, street) {
  const out = []
  // The why under a grade: the same sentences the grade lists show when tapped.
  const why = (w) => (Array.isArray(w) ? w : w?.lines || []).join(' ')
  if (street === 'preflop') {
    if (h.grade) out.push({ ...verdictLine(h.grade), why: why(whyLines(h.grade)), kind: 'grade' })
    if (h.bb_grade) out.push({ ...bbVerdict(h.bb_grade), why: why(bbWhy(h.bb_grade)), kind: 'grade' })
  }
  const post = h.postflop_grades || (h.postflop_grade ? [h.postflop_grade] : [])
  for (const g of post) if ((g.street || 'flop') === street) out.push({ ...flopVerdict(g), why: why(flopWhy(g)), kind: 'grade' })
  if (h.allin && h.allin.street === street) {
    out.push({
      kind: 'equity',
      mark: '⚖',
      text: `All in: you had ${Math.round(h.allin.equity)}% to win${h.allin.approx ? ' (several players, approximate)' : ''}`,
      value: '',
      tone: 'muted',
    })
  }
  return out
}

/**
 * The steps of a replay: one per street that had action, then the result.
 *
 * @returns {{name: string, board: string[], pot: number, lines: {street: string, text: string, current: boolean}[],
 *            notes: object[], result: object|null}[]}
 */
export function replaySteps(h) {
  if (!canReplay(h)) return []
  const steps = []
  const lines = []
  for (const s of h.streets) {
    for (const l of lines) l.current = false
    for (const text of s.actions) lines.push({ street: s.street, text, current: true })
    steps.push({
      name: NAMES[s.street] || s.street,
      board: (h.board || []).slice(0, BOARD_AT[s.street] ?? 0),
      pot: s.pot_bb ?? null,
      lines: lines.map((l) => ({ ...l })),
      notes: notesFor(h, s.street),
      result: null,
    })
  }
  for (const l of lines) l.current = false
  const net = h.net_bb ?? 0
  const luck = h.allin
    ? h.allin.luck_bb > 0.5
      ? `The cards ran ${h.allin.luck_bb}bb better than the odds.`
      : h.allin.luck_bb < -0.5
        ? `The cards ran ${Math.abs(h.allin.luck_bb)}bb worse than the odds.`
        : 'The cards ran about as the odds said.'
    : null
  steps.push({
    name: (h.shown || []).length ? 'Showdown' : 'Result',
    board: h.board || [],
    pot: h.pot_bb ?? null,
    lines: lines.map((l) => ({ ...l })),
    notes: [],
    result: { net, shown: h.shown || [], luck, verdict: handVerdict(h, net), bust: (h.tags || []).includes('bust') },
  })
  return steps
}

/**
 * The hand's decisions in one line, for the end of the replay: were the
 * graded decisions right, whatever the result? Null when nothing was graded.
 */
export function handVerdict(h, net) {
  const post = h.postflop_grades || (h.postflop_grade ? [h.postflop_grade] : [])
  const grades = [h.grade, h.bb_grade, ...post].filter((g) => g && g.verdict)
  if (!grades.length) return null
  const wrong = grades.filter((g) => g.verdict === 'mistake').length
  const n = grades.length
  if (!wrong) {
    const all = n === 1 ? 'The graded decision was right' : n === 2 ? 'Both graded decisions were right' : `All ${n} graded decisions were right`
    return net < 0 ? `${all}: this result was the cards, not you.` : `${all}.`
  }
  return `${wrong} of ${n} graded decision${n === 1 ? '' : 's'} ${wrong === 1 ? 'was a mistake' : 'were mistakes'}.`
}
