import { describe, expect, it } from 'vitest'
import { buyInText, rangeText, sampleText, varianceHeadline } from './variance.js'

const block = (allZero, restZero, extra = {}) => ({
  n: 228,
  all: { roi: 79, low: -5, high: 210, above_zero: allZero, needed: 5000 },
  without_best: { roi: 7, low: -30, high: 60, above_zero: restZero, needed: 1400 },
  ...extra,
})

describe('varianceHeadline', () => {
  it('says when the record stands without the best run', () => {
    const h = varianceHeadline(block(100, 99))
    expect(h.tone).toBe('gain')
    expect(h.text).toContain('even without')
  })
  it('says when it rests on one result', () => {
    const h = varianceHeadline(block(99, 60))
    expect(h.text).toContain('rests on one result')
    expect(h.text).toContain('+7%')
  })
  it('says when it is unproven', () => {
    const h = varianceHeadline(block(90, 60))
    expect(h.text).toContain('isn’t proven yet')
    expect(h.text).toContain('−5% to +210%')
  })
  it('handles nothing', () => {
    expect(varianceHeadline(null).tone).toBe('muted')
  })
})

describe('small wording', () => {
  it('reads a range', () => {
    expect(rangeText({ low: -22.6, high: 240.2 })).toBe('−23% to +240%')
  })
  it('reads the sample', () => {
    expect(sampleText({ n: 228 }, { needed: 4800 })).toBe('228 of about 4,800 tournaments')
  })
  it('reads a buy-in', () => {
    expect(buyInText(1.1)).toBe('$1.10')
  })
})
