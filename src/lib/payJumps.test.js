import { describe, expect, it } from 'vitest'
import { payHeadline, payLabel, pressure, stageLine } from './payJumps.js'

describe('payHeadline', () => {
  it('names both kinds', () => {
    const t = payHeadline({ decisions: 271, cleared: 17, risky: 4 })
    expect(t).toContain('271')
    expect(t).toContain('17 folds')
    expect(t).toContain('4 all-ins were')
  })
  it('handles one of each', () => {
    const t = payHeadline({ decisions: 3, cleared: 1, risky: 1 })
    expect(t).toContain('1 fold the chips')
    expect(t).toContain('1 all-in was')
  })
  it('says when nothing changes', () => {
    expect(payHeadline({ decisions: 12, cleared: 0, risky: 0 })).toContain('change nothing')
  })
  it('says so when there is nothing', () => {
    expect(payHeadline(null)).toContain('Not enough')
  })
})

describe('spot wording', () => {
  it('bands the pressure', () => {
    expect([pressure(1.05), pressure(1.3), pressure(1.8)]).toEqual(['light', 'real', 'heavy'])
  })
  it('never calls a fold a mistake', () => {
    expect(payLabel({ spot: 'reshove', action: 'fold' })).toBe('Folded instead of a re-shove: the pay jump may back the fold')
    expect(payLabel({ spot: 'call', action: 'call' })).toContain('risky')
  })
  it('stays approximate', () => {
    expect(stageLine({ left: 6, paid: 5, factor: 1.86, bounty: false })).toBe('about 6 left, about 5 paid · pressure heavy (×1.86)')
    expect(stageLine({ left: 4, paid: 491, factor: 1.5, bounty: true })).toContain('in the money, about 4 left')
    expect(stageLine({ left: 4, paid: 491, factor: 1.5, bounty: true })).toContain('bounty event')
  })
})
