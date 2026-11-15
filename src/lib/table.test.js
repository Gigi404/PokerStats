import { describe, expect, it } from 'vitest'
import { actionLabel, boardCards, frames, layout, toCall, totalPot } from './table.js'

// The hand from PokerEdge's tests/test_puzzle_tables.py: SB hero, BB, BTN
// opens to 2.5; hero to act preflop.
const preflop = {
  max: 3,
  seats: [['SB', 19.7], ['BB', 31.8], ['BTN', 68]],
  h: 0,
  b: 2,
  acts: [[0, 0, 's', 0.5], [1, 0, 'B', 1], [2, 0, 'r', 2.5]],
  board: '5d Kd 8h Qc 7d',
  street: 0,
  shown: [[2, 'Ad As']],
}

describe('table frames', () => {
  it('posts the blinds in one frame, then one frame per action and the question', () => {
    const f = frames(preflop)
    expect(f).toHaveLength(3)
    expect(f[0].seats.map((s) => s.bet)).toEqual([0.5, 1, 0])
    expect(f[1].actor).toBe(2)
    expect(f[1].seats[2]).toMatchObject({ bet: 2.5, stack: 65.5, said: 'Raise to 2.5' })
    const q = f[2]
    expect(q.actor).toBe(0)
    expect(q.boardCount).toBe(0)
    expect(toCall(q, 0)).toBe(2)
    expect(totalPot(q)).toBe(4)
  })

  it('sweeps bets into the pot on a new street and shows the board', () => {
    const t = {
      ...preflop,
      acts: [
        [0, 0, 'a', 0.1], [1, 0, 'a', 0.1], [2, 0, 'a', 0.1],
        [0, 0, 's', 0.5], [1, 0, 'B', 1], [2, 0, 'r', 2.5], [0, 0, 'f', 0], [1, 0, 'c', 1.5],
        [1, 1, 'x', 0], [2, 1, 'b', 2],
      ],
      h: 1,
      street: 1,
    }
    const f = frames(t)
    const q = f[f.length - 1]
    expect(q.street).toBe(1)
    expect(q.boardCount).toBe(3)
    expect(q.pot).toBe(5.8) // 0.3 antes + 0.5 + 2.5 + 2.5
    expect(q.seats[0].folded).toBe(true)
    expect(q.seats[2]).toMatchObject({ bet: 2, said: 'Bet 2' })
    expect(toCall(q, 1)).toBe(2)
  })

  it('marks an all-in and caps the call at hero’s stack', () => {
    const t = { ...preflop, seats: [['SB', 3], ['BB', 31.8], ['BTN', 68]], acts: [...preflop.acts.slice(0, 2), [2, 0, 'A', 68]] }
    const q = frames(t).at(-1)
    expect(q.seats[2].allin).toBe(true)
    expect(toCall(q, 0)).toBe(2.5) // 3bb behind, 0.5 already in
  })

  it('words actions like a client', () => {
    expect(actionLabel('r', 2, 3)).toBe('Raise to 3')
    expect(actionLabel('c', 1.5)).toBe('Call 1.5')
    expect(actionLabel('x')).toBe('Check')
  })
})

describe('table layout', () => {
  it('puts hero at the bottom centre', () => {
    const l = layout(6, 2)
    expect(Math.round(l[2].x)).toBe(50)
    expect(l[2].y).toBeGreaterThan(85)
    // The next seat clockwise sits to hero's left (lower-left of the oval).
    expect(l[3].x).toBeLessThan(50)
  })

  it('splits the board', () => {
    expect(boardCards(preflop)).toEqual(['5d', 'Kd', '8h', 'Qc', '7d'])
    expect(boardCards({ board: '' })).toEqual([])
  })
})
