import { describe, expect, it } from 'vitest'
import { cashCurve, cashMonth, handCurve, minutesLabel, rateLabel, stakesLabel } from './cash.js'
import { onlyGame } from './riverChoice.js'

describe('cash wording', () => {
  it('labels stakes, most-played first', () => {
    expect(stakesLabel(['0.25/0.50'])).toBe('$0.25/0.50')
    expect(stakesLabel(['0.10/0.25', '0.25/0.50', '0.50/1.00'])).toBe('$0.10/0.25 +2')
    expect(stakesLabel([])).toBe('Cash')
  })

  it('gives no combined bb/100 across stakes', () => {
    expect(rateLabel({ stakes: ['0.25/0.50'], bb_per_100: 67.18 })).toBe('+67.2 bb/100')
    expect(rateLabel({ stakes: ['0.02/0.05', '0.50/1.00'], bb_per_100: 90.3 })).toBe('mixed stakes')
  })

  it('labels durations', () => {
    expect(minutesLabel(0)).toBe('under a minute')
    expect(minutesLabel(35)).toBe('35m')
    expect(minutesLabel(114)).toBe('1h 54m')
    expect(minutesLabel(60)).toBe('1h 00m')
  })

  it('takes the last month played', () => {
    expect(cashMonth({ by_month: [{ month: '2026-10' }, { month: '2026-11' }] }).month).toBe('2026-11')
    expect(cashMonth({ by_month: [] })).toBeNull()
  })

  it('builds the running total oldest first, in cents', () => {
    const newestFirst = [
      { date: '2026-11-14', net: -2.5, stakes: ['0.25/0.50'] },
      { date: '2026-11-13', net: 4.09, stakes: ['0.10/0.25'] },
    ]
    const pts = cashCurve(newestFirst)
    expect(pts.map((p) => p.total)).toEqual([409, 159])
    expect(pts[0].session.venue).toBe('Cash · $0.10/0.25')
  })
})

describe('a session hand by hand', () => {
  it('turns the running net into chart points', () => {
    const pts = handCurve([0.5, -1.25, 2], '2026-11-14')
    expect(pts.map((p) => [p.result, p.total])).toEqual([[50, 50], [-175, -125], [325, 200]])
    expect(pts[2].session).toEqual({ date: '2026-11-14', venue: 'Hand 3' })
    expect(handCurve(undefined)).toEqual([])
  })
})

describe('river choices for one game', () => {
  it('keeps only that game', () => {
    const r = {
      games: { tournament: { n: 5 }, cash: { n: 3 } },
      spots: [{ game: 'cash', hand_id: 1 }, { game: 'tournament', hand_id: 2 }],
      consider: [{ game: 'tournament', hand_id: 3 }],
    }
    const c = onlyGame(r, 'cash')
    expect(Object.keys(c.games)).toEqual(['cash'])
    expect(c.spots.map((g) => g.hand_id)).toEqual([1])
    expect(c.consider).toEqual([])
  })
})
