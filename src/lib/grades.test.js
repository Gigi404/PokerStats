import { describe, expect, it } from 'vitest'
import { bb, listDecisions, nashLine, situation, tally, verdictLine, whyLines, withSteals } from './grades.js'

// Shaped exactly as PokerEdge's core/short_stack.compact writes them; the
// numbers are two real decisions from 2026-10-08.
const missedShove = {
  hand_id: '262332332362', spot: 'shove', cards: '4d 3s', seat: 'SB', stack_bb: 6.9, pot_bb: 2.4,
  action: 'fold', better: 'shove', verdict: 'mistake', ev_bb: 1.75, cost_bb: 1.75,
  why: { fold_pct: 67, called_pct: 33, equity_if_called_pct: 33, players_behind: 1, bounty_bb: 5.99, sample: 522 },
  flags: [],
}
const goodCall = {
  hand_id: '262332359415', spot: 'call', cards: 'As Ac', seat: 'UTG', stack_bb: 21.4, pot_bb: 25.8,
  action: 'call', better: 'call', verdict: 'correct', ev_bb: 33.46, cost_bb: 0,
  why: { shove_pct: 7.3, equity_pct: 85, needed_pct: 31, bounty_bb: 16.85, sample: 877 },
  flags: ['others_behind'],
}
const close = { ...missedShove, hand_id: 'c', verdict: 'close', ev_bb: -0.2, cost_bb: 0 }
const badShove = { ...missedShove, hand_id: 'b', action: 'shove', ev_bb: -1.2, cost_bb: 1.2 }

describe('verdict line', () => {
  it('a missed shove says what was better and what it cost', () => {
    expect(verdictLine(missedShove)).toEqual({ mark: '❌', text: 'Folded — shoving was better', value: '−1.8bb', tone: 'loss' })
  })
  it('a correct call shows what it earned over folding', () => {
    expect(verdictLine(goodCall)).toMatchObject({ mark: '✅', text: 'Correct call', value: '+33.5bb' })
  })
  it('a shove that should have been a fold', () => {
    expect(verdictLine(badShove)).toMatchObject({ text: 'Shove — folding was better', value: '−1.2bb' })
  })
  it('a close one takes no side', () => {
    expect(verdictLine(close)).toMatchObject({ mark: '≈', tone: 'muted' })
  })
  it('a correct fold credits the fold', () => {
    expect(verdictLine({ ...missedShove, verdict: 'correct', ev_bb: -2, cost_bb: 0 })).toMatchObject({ text: 'Correct fold', value: '+2bb' })
  })
})

describe('why', () => {
  it('a shove: folds, calls, equity, bounty, conclusion', () => {
    const w = whyLines(missedShove)
    expect(w.lines).toEqual([
      'If you shove, the player behind folds 67% of the time and you win the 2.4bb pot.',
      'You get called 33% of the time, and then you have 33% equity.',
      'Their bounty is worth 6bb to you, counted.',
    ])
    expect(w.conclusion).toBe('Shoving earns 1.8bb more than folding.')
    expect(w.notes).toEqual(['Based on 522 similar spots in this player pool.'])
  })
  it('a call: range, equity against the price, flags as notes', () => {
    const w = whyLines(goodCall)
    expect(w.lines[0]).toBe('Their shoves here: about the top 7.3% of hands.')
    expect(w.lines[1]).toBe('Your equity against that: 85%. The price needed 31%.')
    expect(w.conclusion).toBe('Calling earns 33.5bb more than folding.')
    expect(w.notes[1]).toBe('Players still to act are assumed to fold.')
  })
  it('a negative EV concludes for the fold', () => {
    expect(whyLines(badShove).conclusion).toBe('Folding earns 1.2bb more than shoving.')
  })
})

describe('lists and tallies', () => {
  const all = [goodCall, missedShove, close, badShove]
  it('mistakes view: mistakes only, costliest first', () => {
    expect(listDecisions(all, 'mistakes').map((d) => d.hand_id)).toEqual([missedShove.hand_id, 'b'])
  })
  it('in-order view keeps everything as played', () => {
    expect(listDecisions(all, 'order')).toBe(all)
  })
  it('tally', () => {
    expect(tally(all)).toEqual({ n: 4, correct: 1, close: 1, mistake: 2, folds: 1, cost: 3, chart: 0, pool: 0 })
  })
  it('tally counts chart and pool mistakes', () => {
    const tagged = [{ ...missedShove, nash: 'fold', nash_kind: 'pool' }, { ...badShove, nash: 'fold', nash_kind: 'chart' }, goodCall]
    const t = tally(tagged)
    expect([t.chart, t.pool]).toEqual([1, 1])
  })
  it('4-bet spot wording', () => {
    const fb = { ...missedShove, spot: 'fourbet' }
    expect(situation(fb)).toBe('folded to a 3-bet')
    expect(situation({ ...fb, action: 'shove' })).toBe('4-bet jammed')
    expect(verdictLine(fb).text).toBe('Folded — 4-bet jamming was better')
  })
  it('steal wording: a floor, never a verdict on raising', () => {
    const st = { ...missedShove, spot: 'steal', better: 'play', stack_bb: 19.5, ev_bb: 1.7, cost_bb: 1.7 }
    expect(situation(st)).toBe('folded, first in')
    expect(verdictLine(st)).toEqual({ mark: '❌', text: 'Folded — play it: raise or shove', value: '≥−1.7bb', tone: 'loss' })
    expect(whyLines(st).conclusion).toMatch(/^Shoving alone earns 1.7bb more than folding/)
  })
  it('steals merge into a review in the order played', () => {
    const a = { hand_id: 'a', date: '2026-10-09', time: '21:05' }
    const b = { hand_id: 'b', date: '2026-10-09', time: '21:40' }
    const c = { hand_id: 'c', date: '2026-10-09', time: '21:20' }
    expect(withSteals({ decisions: [a, b], steals: [c] }).map((d) => d.hand_id)).toEqual(['a', 'c', 'b'])
    expect(withSteals({ decisions: [a] })).toEqual([a])
  })
  it('situations and bb', () => {
    expect(situation(missedShove)).toBe('folded, first in')
    expect(situation(goodCall)).toBe('called a shove')
    expect(bb(0)).toBe('±0bb')
  })
})

describe('nash line', () => {
  it('absent in files without charts', () => {
    expect(nashLine(missedShove)).toBeNull()
  })
  it('agrees with the best play', () => {
    expect(nashLine({ ...missedShove, nash: 'shove' })).toBe('The Nash push/fold chart says shove too.')
  })
  it('says when the pool is being exploited', () => {
    expect(nashLine({ ...missedShove, nash: 'fold' })).toBe(
      'The Nash push/fold chart says fold; against how this pool plays, shove earns more.')
  })
})
