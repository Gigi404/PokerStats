import { describe, expect, it } from 'vitest'
import { AREAS, COVERED, GAINS, NOT_YET, confidenceTone } from './trust.js'

describe('trust page data', () => {
  it('gives every area a confidence, evidence and a label', () => {
    for (const a of AREAS) {
      expect(a.label).toBeTruthy()
      expect(a.evidence).toBeTruthy()
      expect(a.confidence).toBeGreaterThanOrEqual(0)
      expect(a.confidence).toBeLessThanOrEqual(100)
    }
    expect(new Set(AREAS.map((a) => a.label)).size).toBe(AREAS.length)
  })
  it('has gains and both theory lists', () => {
    expect(GAINS.length).toBeGreaterThan(0)
    expect(COVERED.length).toBeGreaterThan(0)
    expect(NOT_YET.every(([, , size]) => ['small', 'medium', 'big'].includes(size))).toBe(true)
  })
  it('colours confidence by band', () => {
    expect([confidenceTone(98), confidenceTone(85), confidenceTone(84), confidenceTone(60), confidenceTone(59)]).toEqual([
      'gain', 'gain', 'accent', 'accent', 'loss',
    ])
  })
})
