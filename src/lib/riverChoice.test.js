import { describe, expect, it } from 'vitest'
import { rangeLine, riverHeadline, sizeLabel, spotLabel } from './riverChoice.js'

const game = (extra) => ({ n: 100, bets: 40, missed_value: 0, bad_bet: 0, consider: 0, ...extra })

describe('riverHeadline', () => {
  it('adds both games and names missed value', () => {
    const h = riverHeadline({ games: { tournament: game({ missed_value: 38, bad_bet: 8 }), cash: game({ missed_value: 66, bad_bet: 6 }) } })
    expect(h.tone).toBe('loss')
    expect(h.text).toContain('104 value bets missed')
    expect(h.text).toContain('14 of your 80 bets')
  })
  it('names betting too often when that is the bigger side', () => {
    expect(riverHeadline({ games: { tournament: game({ missed_value: 1, bad_bet: 9 }) } }).text).toContain('You bet too often')
  })
  it('never counts bluffs to consider', () => {
    const h = riverHeadline({ games: { tournament: game({ consider: 200 }) } })
    expect(h.tone).toBe('gain')
    expect(h.text).not.toContain('200')
  })
  it('says so when there is nothing', () => {
    expect(riverHeadline(null).tone).toBe('muted')
  })
})

describe('spot wording', () => {
  it('describes each kind', () => {
    expect(spotLabel({ kind: 'missed_value' })).toContain('value bet')
    expect(spotLabel({ kind: 'bad_bet', bet_pct: 60 })).toContain('60%')
    expect(spotLabel({ kind: 'missed_bluff' })).toContain('could work')
  })
  it('turns a size into a share of the pot', () => {
    expect(sizeLabel({ best_size: 1.25 })).toBe('125% of the pot')
    expect(sizeLabel({ best_size: 0.33 })).toBe('33% of the pot')
  })
  it('reads both ranges', () => {
    expect(rangeLine({ equity: 71.4, equity_check: 82.6 })).toBe('You beat 71% of the hands that call, 83% of the hands that check.')
  })
})
