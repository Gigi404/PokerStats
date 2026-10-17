import { describe, expect, it } from 'vitest'
import { canReplay, handVerdict, replaySteps } from './replay.js'

const tens = {
  hand_id: '1',
  board: ['Qh', '3h', '5d', '2d', '6s'],
  shown: [{ seat: 'BB', cards: '3c Qc' }],
  pot_bb: 42.2,
  net_bb: -19.3,
  tags: ['big loss'],
  streets: [
    { street: 'preflop', actions: ['You raise to 3.0bb', 'SB calls 2.5bb', 'BB calls 2.0bb'], pot_bb: 1.6 },
    { street: 'flop', actions: ['SB checks', 'BB checks', 'You check'], pot_bb: 9.9 },
    { street: 'turn', actions: ['SB checks', 'BB bets 7.6bb', 'You call 7.6bb'], pot_bb: 9.9 },
    { street: 'river', actions: ['BB bets 8.5bb', 'You call 8.5bb'], pot_bb: 25.1 },
  ],
  postflop_grades: [
    { street: 'turn', verdict: 'correct', action: 'call', ev_bb: 5.3, cost_bb: 0 },
    { street: 'river', verdict: 'correct', action: 'call', ev_bb: 12.3, cost_bb: 0 },
  ],
}

describe('replay steps', () => {
  it('one step per street, then the result', () => {
    const steps = replaySteps(tens)
    expect(steps.map((s) => s.name)).toEqual(['Preflop', 'Flop', 'Turn', 'River', 'Showdown'])
    expect(steps.map((s) => s.board.length)).toEqual([0, 3, 4, 5, 5])
    expect(steps[2].pot).toBe(9.9)
    expect(steps[4].result.net).toBe(-19.3)
    expect(steps[4].result.verdict).toBe('Both graded decisions were right: this result was the cards, not you.')
  })

  it('counts the mistakes when there were some', () => {
    expect(handVerdict({ grade: { verdict: 'mistake' }, postflop_grades: [{ verdict: 'correct' }] }, 5)).toBe(
      '1 of 2 graded decisions was a mistake.',
    )
    expect(handVerdict({}, 0)).toBeNull()
  })

  it('marks the current street and keeps the earlier ones', () => {
    const turn = replaySteps(tens)[2]
    expect(turn.lines).toHaveLength(9)
    expect(turn.lines.filter((l) => l.current).map((l) => l.text)).toEqual(['SB checks', 'BB bets 7.6bb', 'You call 7.6bb'])
    expect(replaySteps(tens).at(-1).lines.every((l) => !l.current)).toBe(true)
  })

  it('puts each grade on its own street', () => {
    const steps = replaySteps(tens)
    expect(steps[1].notes).toEqual([])
    expect(steps[2].notes[0].text).toMatch(/Correct call/)
    expect(typeof steps[2].notes[0].why).toBe('string')
    expect(steps[3].notes).toHaveLength(1)
  })

  it('a preflop all-in shows its equity, then the board and the luck', () => {
    const h = {
      board: ['Qc', 'Jc', '6s', '7d', '3c'],
      shown: [{ seat: 'BTN', cards: 'Ts As' }],
      net_bb: 11.7,
      streets: [{ street: 'preflop', actions: ['You raise to 3.0bb', 'BTN raises to 11.5bb', 'You call all-in 6.3bb'], pot_bb: 2.4 }],
      allin: { street: 'preflop', equity: 68, luck_bb: 6.8, actual_bb: 11.7, approx: false },
    }
    const steps = replaySteps(h)
    expect(steps).toHaveLength(2)
    expect(steps[0].notes[0].text).toBe('All in: you had 68% to win')
    expect(steps[1].board).toHaveLength(5)
    expect(steps[1].result.luck).toBe('The cards ran 6.8bb better than the odds.')
  })

  it('needs action to replay', () => {
    expect(canReplay({ streets: [] })).toBe(false)
    expect(replaySteps({})).toEqual([])
  })
})
