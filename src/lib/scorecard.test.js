import { describe, expect, it } from 'vitest'
import { costliestText, headline, shares } from './scorecard.js'

// The 2026-10-16 scorecard as the beast built it.
const day = {
  graded: 77, correct: 40, close: 11, mistakes: 26, cost_bb: 32.3, steal_floor: false,
  groups: [{ group: 'short_stack', graded: 63, mistakes: 21, cost_bb: 24.7 }],
  costliest: {
    group: 'short_stack', tournament_id: '4038334403', hand_id: '262416804118', cards: 'Jc 7h',
    action: 'fold', better: 'shove', cost_bb: 7.3, stack_bb: 33.6, seat: 'SB', spot: 'reshove',
  },
}

describe('scorecard', () => {
  it('heads with counts and the cost, "at least" when a steal is in it', () => {
    expect(headline(day)).toEqual({ counts: '77 graded · 26 mistakes', cost: '−32.3bb' })
    expect(headline({ ...day, steal_floor: true }).cost).toBe('≥−32.3bb')
    expect(headline({ ...day, mistakes: 0, cost_bb: 0 })).toEqual({ counts: '77 graded · 0 mistakes', cost: null })
  })

  it('shares always sum to 100', () => {
    const s = shares(day)
    expect(s.correct + s.close + s.mistake).toBe(100)
    expect(shares({ graded: 3, correct: 1, close: 1, mistakes: 1 })).toEqual({ correct: 34, close: 33, mistake: 33 })
  })

  it('says what the costliest mistake was', () => {
    expect(costliestText(day.costliest)).toBe('SB · 33.6bb · folded to a raise — shove was better')
    expect(costliestText({ group: 'turn', action: 'fold', better: 'continue' })).toBe(
      'folded to a turn bet — continuing was better',
    )
    expect(costliestText({ group: 'bb', action: 'fold', better: 'call', seat: 'BB' })).toBe(
      'BB · folded the big blind to a raise — call was better',
    )
  })
})
