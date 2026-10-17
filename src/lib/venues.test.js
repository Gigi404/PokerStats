import { describe, expect, it } from 'vitest'
import { HOME_PREFIX, homeFormats, homeName, homeVenue, isHomeGame, stakesOptions, venueOptions } from './venues.js'

const s = (o) => ({ format: 'cash', setting: 'live', venue: '', game: '', buyIns: [], date: '2026-10-01', ...o })

describe('venues', () => {
  it('names home games with one prefix', () => {
    expect(homeVenue(" Marc's ")).toBe(`${HOME_PREFIX}Marc's`)
    expect(isHomeGame(homeVenue('Marc'))).toBe(true)
    expect(homeName(homeVenue('Marc'))).toBe('Marc')
    expect(isHomeGame('Playground')).toBe(false)
  })

  it('offers presets, past live venues and home games, recent first', () => {
    const sessions = [
      s({ venue: homeVenue('Marc'), date: '2026-09-01' }),
      s({ venue: homeVenue('Julie'), date: '2026-10-01' }),
      s({ venue: 'Casino Lac-Leamy' }),
      s({ venue: 'PokerStars', setting: 'online' }),
    ]
    const o = venueOptions(sessions)
    expect(o.places).toEqual(['Casino de Montréal', 'Playground', 'Casino Lac-Leamy'])
    expect(o.homes).toEqual([homeVenue('Julie'), homeVenue('Marc')])
    // An old online session keeps its site selectable.
    expect(venueOptions(sessions, 'PokerStars').places.at(-1)).toBe('PokerStars')
  })

  it('offers the preset stakes, then the ones she has played', () => {
    expect(stakesOptions([s({ game: '2/5 NL' }), s({ game: '1/2 NL' })])).toEqual(['1/2 NL', '1/2 PLO', '2/5 NL'])
    expect(stakesOptions([], '0.25/0.50')).toEqual(['1/2 NL', '1/2 PLO', '0.25/0.50'])
  })

  it('remembers each home game\'s sit & go formats', () => {
    const marc = homeVenue('Marc')
    const sessions = [
      s({ format: 'tournament', venue: marc, buyIns: [5000], chips: 1500, date: '2026-09-01' }),
      s({ format: 'tournament', venue: marc, buyIns: [2000], chips: 1000, date: '2026-10-01' }),
      s({ format: 'tournament', venue: marc, buyIns: [5000], chips: 1500, date: '2026-08-01' }),
      s({ format: 'tournament', venue: homeVenue('Julie'), buyIns: [10000], chips: 3000 }),
    ]
    const f = homeFormats(sessions, marc)
    expect(f.map((x) => [x.buyIn, x.chips])).toEqual([[2000, 1000], [5000, 1500]])
    expect(f[1].label).toMatch(/^\$50 · 1,500 chips$/)
  })
})
