import { describe, expect, it } from 'vitest'
import { flopSpot, flopTally, flopVerdict, flopWhy } from './flopGrades.js'

// Shaped exactly as PokerEdge's analysis/flop_grading.compact writes them;
// the numbers are real grades from 2026-10-13.
const missedFold = {
  hand_id: '262030136989', cards: 'Kd Ad', board: 'Qs Jd 3s', action: 'fold', better: 'continue',
  verdict: 'mistake', equity: 47.6, need: 37.6, ev_bb: 9.37, ev_range: [9.37, 9.37], cost_bb: 9.37,
  priced: 'all_in', spr: 1.71, pot_bb: 23.3, effective_bb: 35.3, bet_pct: 43, bettor_role: 'raiser',
  situation: 'multi', flags: ['bounty_unknown', 'others_to_act'],
}
const badRaise = {
  ...missedFold, hand_id: 'r', cards: 'Ac Td', board: '9h 6h Qc', action: 'raise', better: 'fold',
  equity: 30.5, need: 41.4, ev_bb: -2.52, ev_range: [-2.52, -2.52], cost_bb: 2.52, situation: 'hu_ip', flags: [],
}
const closeCall = {
  ...missedFold, hand_id: 'c', action: 'call', verdict: 'close', better: 'continue', priced: 'pot_odds',
  ev_bb: 0.4, ev_range: [-0.6, 1.4], cost_bb: 0, need: 20, flags: ['pot_odds'],
}

describe('flop verdict', () => {
  it('a fold that should have continued', () => {
    expect(flopVerdict(missedFold)).toEqual({ mark: '❌', text: 'Folded — continuing was better', value: '−9.4bb', tone: 'loss' })
  })
  it('a raise that should have folded', () => {
    expect(flopVerdict(badRaise)).toMatchObject({ text: 'Raised — folding was better', value: '−2.5bb' })
  })
  it('a close call', () => {
    expect(flopVerdict(closeCall)).toMatchObject({ mark: '≈', tone: 'muted' })
  })
})

describe('flop why', () => {
  it('committed: equity against the price, then what continuing earns', () => {
    const w = flopWhy(missedFold)
    expect(w.lines[0]).toContain('the preflop raiser')
    expect(w.lines[0]).toContain('47.6%')
    expect(w.lines[1]).toBe('With the stacks going in, you needed 37.6%.')
    expect(w.conclusion).toBe('Continuing earns 9.4bb more than folding.')
    expect(w.notes).toHaveLength(2)
  })
  it('pot odds and close: says the range', () => {
    const w = flopWhy(closeCall)
    expect(w.lines[1]).toBe('Calling needed 20% on pot odds.')
    expect(w.conclusion).toContain('between −0.6bb and +1.4bb')
  })
  it('a continue that should have folded', () => {
    expect(flopWhy(badRaise).conclusion).toBe('Folding earns 2.5bb more than continuing.')
  })
  it('the spot line', () => {
    expect(flopSpot(missedFold)).toBe('43% pot bet · SPR 1.71 · multiway')
  })
})

describe('flop tally', () => {
  it('reads the block; null when nothing graded', () => {
    const t = flopTally({ n: 101, correct: 69, close: 16, mistake: 16, ungraded: 14, cost_bb: 46.6,
      missed: 15, missed_bb: 44.1, bad_continue: 1, bad_continue_bb: 2.5, costliest: [] })
    expect(t).toMatchObject({ n: 101, mistake: 16, cost: 46.6, missed: 15, bad: 1 })
    expect(flopTally({ n: 0 })).toBeNull()
    expect(flopTally(undefined)).toBeNull()
  })
})
