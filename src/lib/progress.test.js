import { describe, expect, it } from 'vitest'
import { progressHeadline } from './progress.js'

const wk = (week, per_100, thin = false) => ({ week, per_100, thin })

describe('progressHeadline', () => {
  it('compares the last solid week with the solid weeks before it', () => {
    const h = progressHeadline([wk('a', 50), wk('b', 40), wk('c', 99, true), wk('d', 30), wk('e', 10, true)])
    expect(h.last.week).toBe('d')
    expect(h.avg).toBe(45)
    expect(h.change).toBe(-15)
  })
  it('has no comparison with one solid week, and nothing with none', () => {
    expect(progressHeadline([wk('a', 20)]).change).toBeNull()
    expect(progressHeadline([wk('a', 20, true)])).toBeNull()
  })
})
