import { describe, expect, it } from 'vitest'
import { findingSentence, moneyReadable, quietSentence } from './suits.js'

describe('findingSentence', () => {
  it('says which way, where, and by how much', () => {
    expect(findingSentence({ dimension: 'buy_in', label: '$2.21 – $5.50', accuracy: 81, expected: 82.9, diff: -3.0 })).toBe(
      'You decide worse at $2.21 – $5.50 buy-ins: 81% accurate, 3 points below your usual on the same kind of spots.',
    )
    expect(findingSentence({ dimension: 'night', label: 'Third hour +', accuracy: 88.2, expected: 84, diff: 4.5 })).toBe(
      'You decide better in the third hour and later of a night: 88.2% accurate, 4.5 points above your usual on the same kind of spots.',
    )
  })
  it('reads start times naturally', () => {
    expect(findingSentence({ dimension: 'start', label: 'Before 18:00', accuracy: 80, diff: -4 })).toContain('started before 18:00')
    expect(findingSentence({ dimension: 'start', label: '21:00 – midnight', accuracy: 80, diff: -4 })).toContain('started at 21:00 – midnight')
  })
})

describe('quietSentence / moneyReadable', () => {
  it('counts the decisions it looked at', () => {
    expect(quietSentence({ overall: { decisions: 2562 } })).toContain('2,562 decisions')
  })
  it('hides thin or ROI-less money', () => {
    expect(moneyReadable({ money: { thin: false, roi: 12 } })).toBe(true)
    expect(moneyReadable({ money: { thin: true, roi: 12 } })).toBe(false)
    expect(moneyReadable({ money: { thin: false, roi: null } })).toBe(false)
    expect(moneyReadable({})).toBe(false)
  })
})
