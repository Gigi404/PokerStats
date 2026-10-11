import { describe, expect, it } from 'vitest'
import { cellClass, seatNames } from './charts.js'
import charts from '../data/pushfold.json'

describe('push/fold charts', () => {
  it('seat names match PokerEdge', () => {
    expect(seatNames(2)).toEqual(['SB'])
    expect(seatNames(8)).toEqual(['UTG', 'UTG1', 'MP', 'HJ', 'CO', 'BTN', 'SB'])
  })
  it('grid: pairs on the diagonal, suited above, offsuit below', () => {
    expect(cellClass(0, 0)).toBe('AA')
    expect(cellClass(0, 1)).toBe('AKs')
    expect(cellClass(1, 0)).toBe('AKo')
    expect(cellClass(12, 11)).toBe('32o')
  })
  it('every seat and ante the view can ask for exists', () => {
    for (let d = 2; d <= 9; d += 1)
      for (const s of seatNames(d))
        for (const a of [0, 0.125, 0.2]) expect(charts.charts[`${d}|${s}|${a}`]).toBeDefined()
  })
})
