import { describe, expect, it } from 'vitest'
import { bbCallsLine, bbHeadline, realisationHeadline, realisationVerdict } from './reality.js'

const row = (extra) => ({ n: 90, guess_low: 0.7, measured: 0.9, low: 0.5, high: 1.3, ...extra })

describe('realisationVerdict', () => {
  it('fits when the range meets the assumption', () => {
    expect(realisationVerdict(row())).toBe('fits')
  })
  it('names a shortfall and an excess', () => {
    expect(realisationVerdict(row({ low: 0.1, high: 0.5 }))).toBe('below the assumed range')
    expect(realisationVerdict(row({ low: 1.1, high: 1.6 }))).toBe('above the assumed range')
  })
  it('says too few', () => {
    expect(realisationVerdict(row({ n: 12 }))).toBe('too few')
  })
})

describe('realisationHeadline', () => {
  it('holds when all fit', () => {
    expect(realisationHeadline([row(), row()])).toContain('holds')
  })
  it('counts the misses', () => {
    expect(realisationHeadline([row(), row({ low: 0.1, high: 0.5 })])).toContain('off in 1 of 2')
  })
  it('ignores thin rows', () => {
    expect(realisationHeadline([row({ n: 5 })])).toContain('Not enough')
  })
})

describe('big blind lines', () => {
  it('reads a fit', () => {
    const t = bbHeadline({ n: 72, predicted: 0.75, bb: 1.12, se: 1.38 })
    expect(t).toContain('+0.75bb')
    expect(t).toContain('That fits')
  })
  it('reads a miss', () => {
    expect(bbHeadline({ n: 500, predicted: 1, bb: -2, se: 0.5 })).toContain('doesn’t fit')
  })
  it('handles nothing', () => {
    expect(bbHeadline(null)).toContain('Not enough')
    expect(bbCallsLine(null)).toBeNull()
  })
  it('compares hero and pool', () => {
    const t = bbCallsLine({ hero_calls: { n: 177, bb: 1.27, se: 0.8 }, pool_calls: { n: 1162, bb: 0.33, se: 0.33 } })
    expect(t).toContain('+1.27bb')
    expect(t).toContain('1,162 hands')
  })
})
