import { describe, expect, it } from 'vitest'
import { accuracyHeadline } from './progress.js'
import { gradeSentence, gradeTone, lessonText, luckLine, minutesFrom, tierShares, turningText } from './recap.js'

const grade = { accuracy: 70.5, grade: 'D', decisions: 42, right: 26, inaccuracies: 5, mistakes: 7, blunders: 4, groups: {} }

describe('recap wording', () => {
  it('names a leak with its count, stacks and cost', () => {
    const t = lessonText({ lesson: 'shove:shove', count: 8, cost_bb: 9.1, stack_range: [5.4, 9.8] })
    expect(t.title).toBe('Shove more when short')
    expect(t.detail).toBe('8 folds that should have been all-in at 5–10bb · 9.1bb')
    expect(lessonText({ lesson: 'steal:play', count: 1, cost_bb: 0.7, stack_range: null }).detail).toBe(
      '1 fold where raising or shoving was better · ≥0.7bb',
    )
    expect(lessonText({ lesson: 'new:thing', count: 2, cost_bb: 1, stack_range: null }).title).toBe('Fix this spot')
  })

  it('writes the grade sentence from the recap alone', () => {
    const recap = { grade, keep: { group: 'postflop', decisions: 8, right: 8 }, work_on: [{ lesson: 'call:call', count: 6, cost_bb: 9.2 }] }
    expect(gradeSentence(recap)).toBe('After the flop: 8 of 8 right. What cost most: call more shoves.')
    expect(gradeSentence({ grade: { ...grade, grade: null, decisions: 6 }, keep: null, work_on: [] })).toMatch(/too few/)
    expect(gradeSentence({ grade: { ...grade, decisions: 0 }, keep: null, work_on: [] })).toMatch(/big enough/)
  })

  it('colours letters and splits the tier bar', () => {
    expect([gradeTone('A-'), gradeTone('C+'), gradeTone('F'), gradeTone(null)]).toEqual(['gain', 'accent', 'loss', 'muted'])
    const sh = tierShares(grade)
    expect(sh.map((x) => x.key)).toEqual(['right', 'inaccuracies', 'mistakes', 'blunders'])
    expect(Math.round(sh.reduce((a, x) => a + x.pct, 0))).toBe(100)
  })

  it('says how the all-ins ran', () => {
    expect(luckLine({ allins: 6, luck_bb: 12.3 })).toEqual({ text: '6 all-ins · ran 12.3bb above what they were worth', tone: 'gain' })
    expect(luckLine({ allins: 1, luck_bb: -0.4 }).text).toBe('1 all-in · ran about as expected')
    expect(luckLine({ allins: 0, luck_bb: 0 })).toBeNull()
  })

  it('describes a turning point with the measured equity', () => {
    const tp = { kind: 'hand', time: '18:09', before_bb: 9.5, after_bb: 21.2, net_bb: 11.7, verdict: 'right', bust: false }
    const t = turningText(tp, { allin: { equity: 68, actual_bb: 11.7 } })
    expect(t.headline).toBe('18:09 · 10 → 21bb')
    expect(t.detail).toBe('68% to win when the money went in, and won · Right decision')
    expect(t.value).toBe('+11.7bb')
    const stretch = turningText({ kind: 'stretch', from: '18:21', to: '18:37', mistakes: 12, cost_bb: 18.3 })
    expect(stretch.value).toBe('−18.3bb')
    expect(turningText({ ...tp, verdict: null }, {}).detail).toMatch(/Not a graded spot/)
  })

  it('counts minutes across midnight', () => {
    expect(minutesFrom(['23:50', '23:58', '00:05', '00:20'])).toEqual([0, 8, 15, 30])
    expect(minutesFrom([])).toEqual([])
  })
})

describe('accuracy headline', () => {
  it('compares the last solid week with the ones before', () => {
    const weeks = [
      { week: 'a', accuracy: 80, thin: false },
      { week: 'b', accuracy: 82, thin: false },
      { week: 'c', accuracy: 90, thin: true },
      { week: 'd', accuracy: 85, thin: false },
    ]
    const h = accuracyHeadline(weeks)
    expect(h.last.week).toBe('d')
    expect(h.change).toBe(4)
    expect(accuracyHeadline([{ week: 'x', per_100: 30, thin: false }])).toBeNull()
  })
})
