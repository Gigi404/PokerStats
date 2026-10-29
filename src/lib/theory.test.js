import { describe, expect, it } from 'vitest'
import { theory, THEORY_KEYS } from './theory.js'

// The recap's leak keys (lib/recap.js LESSONS): every one has a card.
const LESSON_KEYS = [
  'shove:shove', 'shove:fold', 'call:call', 'call:fold', 'reshove:shove', 'reshove:fold',
  'fourbet:shove', 'fourbet:fold', 'steal:play', 'bb:defend', 'bb:fold', 'postflop:continue', 'postflop:fold',
]

describe('theory', () => {
  it('covers every leak the recap can name', () => {
    expect([...THEORY_KEYS].sort()).toEqual([...LESSON_KEYS].sort())
    for (const k of LESSON_KEYS) {
      const t = theory(k)
      expect(t.idea.length).toBeGreaterThan(40)
      expect(t.points.length).toBeGreaterThan(0)
      expect(t.worked).toBeNull()
    }
  })
  it('is null for an unknown leak', () => {
    expect(theory('nope:nope')).toBeNull()
  })
  it('works the fold equity of a shove from the hand', () => {
    const t = theory('shove:shove', { pot_bb: 2.5, why: { fold_pct: 60 } })
    expect(t.worked).toContain('folded 60% of the time')
    expect(t.worked).toContain('won 1.5bb on average')
  })
  it('works the price of a call from the hand', () => {
    const t = theory('call:fold', { why: { needed_pct: 41, equity_pct: 33.6, shove_pct: 12 } })
    expect(t.worked).toBe('Here the price needed 41% and you had 34% against their top 12% of hands.')
  })
  it('works the price of a bet from its size', () => {
    // Half pot: 0.5 / 2 = 25% needed; continue 1 / 1.5 = 67%.
    const t = theory('postflop:continue', { bet_pct: 50, equity: 31 })
    expect(t.worked).toContain('asks for 25% equity')
    expect(t.worked).toContain('about 67% of the time')
    expect(t.worked).toContain('You had 31%')
  })
  it('quotes the committed price when the stacks are going in', () => {
    const t = theory('postflop:continue', { bet_pct: 111, equity: 58.6, need: 40.2, priced: 'committed' })
    expect(t.worked).toBe('Here the stacks were going in, so the price was everything left, not just the bet: you needed 40% and had 59%.')
  })
  it('leaves the worked line out when the hand lacks the numbers', () => {
    expect(theory('bb:defend', { equity: 40 }).worked).toBeNull()
    expect(theory('shove:shove', { why: {} }).worked).toBeNull()
  })
})
