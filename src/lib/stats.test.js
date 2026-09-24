import { describe, expect, it } from 'vitest'
import { centsToInput, formatSigned, toCents } from './money.js'
import { durationMinutes } from './time.js'
import { newSession, profit, validate } from './sessions.js'
import { breakdown, cashStats, cumulative, filterSessions, netProfit, tournamentStats } from './stats.js'
import { parseBackup, toBackupJSON, toCSV } from './backup.js'

const cash = (o) => newSession({ format: 'cash', ...o })
const mtt = (o) => newSession({ format: 'tournament', ...o })

describe('money', () => {
  it('parses what gets typed at a table', () => {
    expect(toCents('300')).toBe(30000)
    expect(toCents('$1,200')).toBe(120000)
    expect(toCents('12,50')).toBe(1250) // French decimal comma
    expect(toCents('0.1')).toBe(10)
    expect(toCents('')).toBeNull()
    expect(toCents('abc')).toBeNull()
    expect(centsToInput(1250)).toBe('12.5')
  })

  it('always writes the sign', () => {
    expect(formatSigned(4550)).toBe('+$45.50')
    expect(formatSigned(-30000)).toBe('−$300')
    expect(formatSigned(123456700)).toBe('+$1,234,567')
  })
})

describe('time', () => {
  it('handles sessions that cross midnight', () => {
    expect(durationMinutes('20:00', '23:30')).toBe(210)
    expect(durationMinutes('21:00', '02:30')).toBe(330)
    expect(durationMinutes('21:00', '')).toBeNull()
  })
})

describe('session maths', () => {
  it('cash profit counts every rebuy', () => {
    expect(profit(cash({ buyIns: [30000, 20000], cashOut: 61500 }))).toBe(11500)
  })

  it('an active session has no result yet', () => {
    expect(profit(cash({ status: 'active', buyIns: [30000], cashOut: 90000 }))).toBeNull()
  })

  it('a tournament with no prize is a loss of everything paid in', () => {
    expect(profit(mtt({ buyIns: [15000, 15000] }))).toBe(-30000)
    expect(profit(mtt({ buyIns: [15000], prize: 60000, bounties: 5000 }))).toBe(50000)
  })

  it('refuses to finish a cash session with no cash-out', () => {
    expect(validate(cash({ buyIns: [30000] }))).toMatch(/cash-out/)
    expect(validate(cash({ buyIns: [30000], cashOut: 0 }))).toBeNull()
    expect(validate(cash({ status: 'active', buyIns: [30000] }))).toBeNull()
  })
})

describe('stats', () => {
  const sessions = [
    cash({ date: '2026-09-01', start: '20:00', end: '00:00', buyIns: [30000], cashOut: 50000, venue: 'Montréal' }),
    cash({ date: '2026-09-05', start: '19:00', end: '21:00', buyIns: [30000, 30000], cashOut: 0, venue: 'Montréal' }),
    cash({ date: '2026-09-07', buyIns: [20000], cashOut: 40000, venue: 'Lac-Leamy', setting: 'online' }), // untimed
    mtt({ date: '2026-09-03', buyIns: [15000], prize: 45000, place: 3, entrants: 120 }),
    mtt({ date: '2026-09-10', buyIns: [15000, 15000], place: 60, entrants: 120 }),
    cash({ status: 'active', date: '2026-09-11', buyIns: [30000] }),
  ]

  it('cash $/hr ignores sessions without times', () => {
    const s = cashStats(sessions)
    expect(s.count).toBe(3)
    expect(s.net).toBe(20000 - 60000 + 20000)
    expect(s.minutes).toBe(360)
    // timed profit (+200 − 600 = −400) over 6h = −$66.67/h
    expect(s.hourly).toBe(Math.round((-40000 / 360) * 60))
    expect(s.untimed).toBe(1)
    expect(s.winRate).toBeCloseTo(2 / 3)
  })

  it('tournament ROI and ITM', () => {
    const t = tournamentStats(sessions)
    expect(t.count).toBe(2)
    expect(t.spent).toBe(45000)
    expect(t.won).toBe(45000)
    expect(t.roi).toBe(0)
    expect(t.itm).toBe(0.5)
    expect(t.bestFinish.place).toBe(3)
  })

  it('net profit spans both formats and skips active sessions', () => {
    expect(netProfit(sessions)).toBe(-20000 + 0)
  })

  it('filters combine', () => {
    expect(filterSessions(sessions, { format: 'cash', setting: 'online' })).toHaveLength(1)
    expect(filterSessions(sessions, { venue: 'Montréal' })).toHaveLength(2)
    expect(filterSessions(sessions, { period: 'd30' }, new Date('2026-09-20T12:00:00'))).toHaveLength(6)
    expect(filterSessions(sessions, { period: 'd30' }, new Date('2026-12-20T12:00:00'))).toHaveLength(0)
  })

  it('cumulative runs in date order', () => {
    const points = cumulative(sessions)
    expect(points.map((p) => p.session.date)).toEqual(['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-07', '2026-09-10'])
    expect(points.at(-1).total).toBe(netProfit(sessions))
  })

  it('breakdown groups and sorts', () => {
    const rows = breakdown(sessions.filter((s) => s.format === 'cash'), 'venue')
    expect(rows[0].label).toBe('Lac-Leamy')
    expect(rows.find((r) => r.label === 'Montréal').net).toBe(-40000)
  })
})

describe('backup', () => {
  it('round-trips and refuses foreign files', () => {
    const list = [cash({ buyIns: [100], cashOut: 200, notes: 'said "nice hand", folded' })]
    expect(parseBackup(toBackupJSON(list))).toEqual(list)
    expect(() => parseBackup('{"sessions":[]}')).toThrow(/not a PokerStats backup/)
    expect(() => parseBackup('Date,Format')).toThrow(/CSV/)
    expect(toCSV(list)).toContain('"said ""nice hand"", folded"')
  })
})
