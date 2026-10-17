import { describe, expect, it } from 'vitest'
import { explain, nextPuzzle, question, record, REDO_MIN, remaining, today } from './puzzles.js'

const NOW = new Date('2026-10-17T20:00:00').getTime()

const shove = (id, verdict, better, cost = 0) => ({
  id,
  group: 'short_stack',
  lesson: `shove:${better}`,
  answer: better,
  g: { spot: 'shove', seat: 'BTN', stack_bb: 7.5, pot_bb: 2.2, action: verdict === 'mistake' ? (better === 'shove' ? 'fold' : 'shove') : better, better, verdict, cost_bb: cost, ev_bb: 1.6, why: { fold_pct: 50, called_pct: 50, equity_if_called_pct: 52, players_behind: 2 } },
})
const turn = {
  id: 't',
  group: 'turn',
  lesson: 'postflop:continue',
  answer: 'continue',
  g: { street: 'turn', board: 'Qh 3h 5d 2d', pot_bb: 9.9, bet_pct: 77, spr: 5.3, action: 'fold', better: 'continue', verdict: 'mistake', cost_bb: 4, ev_bb: 4, equity: 55, need: 30, priced: 'pot_odds' },
}

describe('puzzle questions and answers', () => {
  it('asks a short-stack spot as fold or all-in', () => {
    const q = question(shove('a', 'mistake', 'shove', 1.6))
    expect(q.text).toBe('BTN · 7.5bb. Everyone folds to you.')
    expect(q.options.map((o) => o.value)).toEqual(['fold', 'shove'])
  })

  it('asks a postflop spot with its board', () => {
    const q = question(turn)
    expect(q.kind).toBe('Turn')
    expect(q.board).toBe('Qh 3h 5d 2d')
    expect(q.options.map((o) => o.value)).toEqual(['fold', 'continue'])
  })

  it('explains, and says what you did at the table', () => {
    const e = explain(shove('a', 'mistake', 'shove', 1.6), 'fold')
    expect(e.right).toBe(false)
    expect(e.headline).toBe('Not quite — the better play is all-in.')
    expect(e.table).toBe('At the table you folded — that was the mistake.')
    expect(e.why.length).toBeGreaterThan(0)
    expect(explain(turn, 'continue').right).toBe(true)
  })
})

describe('scheduling', () => {
  it('a wrong answer comes back soon, a right one later', () => {
    let p = record({}, 'a', false, NOW)
    expect(p.a.due).toBe(NOW + REDO_MIN * 60000)
    expect(p.a.box).toBe(0)
    p = record(p, 'a', true, NOW)
    expect(p.a.box).toBe(1)
    expect(p.a.due).toBe(NOW + 86400000)
    expect(p.a.seen).toBe(2)
  })

  it('due first, then unseen from the costliest area, never the one just answered', () => {
    const items = [shove('s1', 'mistake', 'shove', 5), shove('s2', 'correct', 'fold'), turn]
    expect(nextPuzzle(items, {}, 'leaks', NOW).id).toBe('s1') // shove area costs 5 > turn 4; a mistake leads
    const progress = { t: { box: 0, due: NOW - 1, seen: 1, right: 0 } }
    expect(nextPuzzle(items, progress, 'leaks', NOW).id).toBe('t')
    expect(nextPuzzle(items, progress, 'leaks', NOW, 't').id).not.toBe('t')
    expect(nextPuzzle(items, {}, 'postflop', NOW).id).toBe('t')
    expect(nextPuzzle(items, {}, 'bb', NOW)).toBeNull()
  })

  it('counts today and what is left', () => {
    let p = record({}, 'a', true, NOW)
    p = record(p, 'b', false, NOW)
    expect(today(p, NOW)).toEqual({ answered: 2, right: 1 })
    const items = [shove('a', 'mistake', 'shove', 1), shove('b', 'mistake', 'shove', 1), shove('c', 'mistake', 'shove', 1), shove('d', 'correct', 'fold')]
    expect(remaining(items, p, NOW + REDO_MIN * 60000)).toBe(2) // b is due again, c unseen; a put away, d a right one
  })
})
