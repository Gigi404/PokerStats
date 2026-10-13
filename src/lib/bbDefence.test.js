import { describe, expect, it } from 'vitest'
import { bbSpot, bbVerdict, bbWhy, defenceBand } from './bbDefence.js'

// Shaped as PokerEdge's analysis/bb_defence._compact writes them; real
// numbers from 2026-10-13.
const missed = {
  hand_id: '1', cards: 'Ac Tc', opener: 'early', open_pct: 10.1, raise_to_bb: 3, stack_bb: 11.5,
  pot_bb: 5.5, action: 'fold', priced: 'pot_odds', equity: 53.8, need: 27, ev_range: [1.39, 2.4],
  ev_bb: 1.9, better: 'defend', verdict: 'mistake', cost_bb: 1.39, flags: ['pot_odds'],
}
const committed = { ...missed, cards: 'Ad 7d', opener: 'BTN', priced: 'all_in', need: 31.9, ev_range: [2.09, 2.09], cost_bb: 2.09, flags: [] }
const close = { ...missed, verdict: 'close', ev_range: [-0.4, 0.6], ev_bb: 0.1, cost_bb: 0 }

describe('big blind defence wording', () => {
  it('verdicts', () => {
    expect(bbVerdict(missed)).toEqual({ mark: '❌', text: 'Folded — defending was better', value: '−1.4bb', tone: 'loss' })
    expect(bbVerdict(close).tone).toBe('muted')
    expect(bbVerdict({ ...missed, action: 'call', verdict: 'correct' }).text).toBe('Correct defend')
  })
  it('spot line', () => {
    expect(bbSpot(missed)).toBe('Early opens to 3bb · 11.5bb deep')
  })
  it('why: pot odds vs committed', () => {
    const w = bbWhy(missed)
    expect(w.lines[0]).toContain('10.1%')
    expect(w.lines[1]).toContain('before the discount')
    expect(w.conclusion).toBe('Defending earns at least 1.4bb more than folding.')
    expect(w.notes).toHaveLength(1)
    expect(bbWhy(committed).lines[1]).toBe('Calling commits you: you needed 31.9%.')
    expect(bbWhy(close).conclusion).toContain('between −0.4bb and +0.6bb')
  })
  it('band against the chart', () => {
    const row = { chart_defend: [42.7, 100], hero: { n: 47, pct: 14.9 } }
    expect(defenceBand(row, 20)).toBe('low')
    expect(defenceBand({ ...row, hero: { n: 10, pct: 14.9 } }, 20)).toBeNull()
    expect(defenceBand({ ...row, hero: { n: 47, pct: 50 } }, 20)).toBe('ok')
  })
})
