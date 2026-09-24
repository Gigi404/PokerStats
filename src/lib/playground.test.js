import { describe, expect, it } from 'vitest'
import {
  ageLabel,
  compactDollars,
  dateRange,
  dayLabel,
  scheduleDays,
  seriesSchedule,
  shortName,
  toCentsFromDollars,
  tournamentsOn,
} from './playground.js'

const t = (o) => ({ kind: 'daily', series: null, seriesName: null, name: 'x', time: '19:00', ...o })

const rows = [
  t({ id: 1, date: '2026-09-24', time: '19:00', name: '$150 Monster Stack' }),
  t({ id: 2, date: '2026-09-24', time: '12:00', name: '$150 Monster Stack Turbo' }),
  t({ id: 3, date: '2026-09-25', kind: 'satellite', name: '$180 Satellite' }),
  t({
    id: 4,
    date: '2026-10-01',
    time: '19:00',
    kind: 'series',
    series: 'mspt',
    seriesName: 'MSPT Canadian Poker Championship',
    name: 'MSPT Canadian Poker Championship Event #1: $300 Mega Stack Day 1B',
  }),
  t({
    id: 5,
    date: '2026-10-01',
    time: '12:00',
    kind: 'series',
    series: 'mspt',
    seriesName: 'MSPT Canadian Poker Championship',
    name: 'MSPT Canadian Poker Championship Event #1: $300 Mega Stack Day 1A',
  }),
]

describe('playground helpers', () => {
  it('labels days relative to today', () => {
    expect(dayLabel('2026-09-24', '2026-09-24')).toBe('Today')
    expect(dayLabel('2026-09-25', '2026-09-24')).toBe('Tomorrow')
    expect(dayLabel('2026-09-26', '2026-09-24')).toBe('Sat 26')
    // Month rollover
    expect(dayLabel('2026-10-01', '2026-09-30')).toBe('Tomorrow')
  })

  it('lists schedule days by kind, skipping the past', () => {
    expect(scheduleDays(rows, '2026-09-24')).toEqual(['2026-09-24', '2026-09-25', '2026-10-01'])
    expect(scheduleDays(rows, '2026-09-25', 'series')).toEqual(['2026-10-01'])
    expect(scheduleDays(rows, '2026-09-24', 'satellite')).toEqual(['2026-09-25'])
  })

  it('orders a day by start time', () => {
    expect(tournamentsOn(rows, '2026-09-24').map((r) => r.id)).toEqual([2, 1])
  })

  it('shortens series event names', () => {
    expect(shortName(rows[3])).toBe('#1 · $300 Mega Stack Day 1B')
    expect(shortName(rows[0])).toBe('$150 Monster Stack')
  })

  it('groups a series by day', () => {
    const s = seriesSchedule(rows, 'mspt')
    expect(s).toHaveLength(1)
    expect(s[0].events.map((e) => e.id)).toEqual([5, 4])
  })

  it('formats ranges and guarantees', () => {
    expect(dateRange('2026-10-01', '2026-10-12')).toBe('Oct 1 – 12')
    expect(dateRange('2026-10-28', '2026-11-03')).toBe('Oct 28 – Nov 3')
    expect(compactDollars(1_000_000)).toBe('$1M')
    expect(compactDollars(2_500_000)).toBe('$2.5M')
    expect(compactDollars(125_000)).toBe('$125K')
    expect(toCentsFromDollars(1141973)).toBe(114197300)
  })

  it('describes data age', () => {
    const now = new Date('2026-09-26T12:00:00')
    expect(ageLabel('2026-09-25T10:00:00', now)).toBe('yesterday')
    expect(ageLabel('2026-09-23T10:00:00', now)).toBe('3 days ago')
    expect(ageLabel('2026-09-26T06:02:00', now)).toMatch(/^today at 6:02/)
  })
})
