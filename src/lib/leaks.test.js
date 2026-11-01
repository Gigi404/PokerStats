import { describe, expect, it } from 'vitest'
import { leakParts, TOPICS } from './leaks.js'
import { lessonText } from './recap.js'
import { THEORY_KEYS } from './theory.js'

describe('My game shape', () => {
  it('sends every leak with a theory card to cards that exist', () => {
    const all = new Set(TOPICS.flatMap((t) => t.parts))
    for (const lesson of THEORY_KEYS) {
      const parts = leakParts(lesson)
      expect(parts.length, lesson).toBeGreaterThan(0)
      for (const p of parts) expect(all.has(p), p).toBe(true)
    }
  })

  it('shows each card under one topic only', () => {
    const parts = TOPICS.flatMap((t) => t.parts)
    expect(new Set(parts).size).toBe(parts.length)
  })

  it('words a ranked leak without a stack range', () => {
    expect(lessonText({ lesson: 'bb:defend', count: 2, cost_bb: 4.5 })).toEqual({
      title: 'Defend your big blind more',
      detail: '2 folds that should have been a defend · 4.5bb',
    })
  })

  it('has no cards for an unknown leak', () => {
    expect(leakParts('mystery:fold')).toEqual([])
  })
})
