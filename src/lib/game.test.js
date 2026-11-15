import { describe, expect, it } from 'vitest'
import { both, emptyGame, level, levelName, mastery, points, score, todayScore } from './game.js'

const NOW = new Date('2026-11-15T20:00:00').getTime()

describe('points', () => {
  it('pays right answers, more on a streak and with time left', () => {
    expect(points(false, 5, 10)).toBe(0)
    expect(points(true, 0)).toBe(100)
    expect(points(true, 3)).toBe(130)
    expect(points(true, 25)).toBe(200) // streak bonus capped at +100
    expect(points(true, 0, 8.4)).toBe(140)
  })
})

describe('score', () => {
  it('builds a streak, keeps the best and tallies the day', () => {
    let g = emptyGame()
    for (const right of [true, true, true]) g = score(g, right, NOW).game
    expect(g.streak).toBe(3)
    expect(g.xp).toBe(100 + 110 + 120)
    const r = score(g, false, NOW)
    expect(r.game.streak).toBe(0)
    expect(r.game.best).toBe(3)
    expect(r.gained).toBe(0)
    expect(todayScore(r.game, NOW)).toEqual({ answered: 4, right: 3, points: 330 })
  })

  it('says when a level or a best streak is reached', () => {
    const r = score({ ...emptyGame(), xp: 450, streak: 2, best: 2 }, true, NOW)
    expect(r.levelUp).toBe(true)
    expect(r.newBest).toBe(true)
  })
})

describe('levels', () => {
  it('needs a little more each time', () => {
    expect(level(0)).toMatchObject({ level: 1, into: 0, need: 500 })
    expect(level(500).level).toBe(2)
    expect(level(1499).level).toBe(2)
    expect(level(1500)).toMatchObject({ level: 3, into: 0, need: 1500 })
    expect(levelName(1)).toBe('Fish')
    expect(levelName(99)).toBe('Legend')
  })
})

describe('mastery and filters', () => {
  const items = [
    { id: 'a', game: 'cash', group: 'bb' },
    { id: 'b', game: 'tournament', group: 'bb' },
    { id: 'c', group: 'flop' },
  ]
  const BB = { key: 'bb', label: 'Big blind', test: (p) => p.group === 'bb' }

  it('counts box 2 and up as mastered', () => {
    expect(mastery(items, { a: { box: 2 }, b: { box: 1 } }, [BB])).toEqual([{ key: 'bb', label: 'Big blind', mastered: 1, total: 2, pct: 50 }])
  })

  it('combines a game with a spot filter; old puzzles count as tournament', () => {
    const all = { key: 'leaks', label: 'All', test: () => true }
    expect(items.filter(both('cash', BB).test).map((p) => p.id)).toEqual(['a'])
    expect(items.filter(both('tournament', all).test).map((p) => p.id)).toEqual(['b', 'c'])
  })
})
