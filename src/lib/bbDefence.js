/*
  Wording for PokerEdge's big blind defence (analysis/bb_defence.py →
  play.bb_defence). The spot: you are the big blind, one player raised (not
  all-in), nobody called. Defending = calling or 3-betting.

  PokerEdge prices a call against the opener's range in this pool. When
  calling leaves less than the pot behind it is treated as all-in; otherwise
  on pot odds, discounted for how much equity the hand gets to use out of
  position (approximate, by hand type). A fold is graded a mistake only when
  defending wins even at the cautious end. 3-bets count as defending and are
  not graded. This file only words the numbers.
*/
import { bb } from './grades.js'

export const OPENER_LABEL = { early: 'Early', middle: 'Middle', BTN: 'Button', SB: 'Small blind', all: 'All' }

const FLAG_TEXT = {
  satellite: 'Satellite: a seat pays everyone the same, so surviving is worth more than chips say.',
  bounty_unknown: 'Bounty not counted.',
  pot_odds: 'Priced on pot odds, discounted for the equity this kind of hand gets to use out of position — an estimate.',
}

/** The verdict line for one graded big blind decision. */
export function bbVerdict(g) {
  if (g.verdict === 'close') return { mark: '≈', text: 'Close — defending or folding, about the same', value: bb(g.ev_bb), tone: 'muted' }
  if (g.verdict === 'correct') {
    return { mark: '✅', text: g.action === 'call' ? 'Correct defend' : 'Correct fold', value: bb(Math.abs(g.ev_bb)), tone: 'gain' }
  }
  return g.action === 'call'
    ? { mark: '❌', text: 'Called — folding was better', value: bb(-g.cost_bb), tone: 'loss' }
    : { mark: '❌', text: 'Folded — defending was better', value: bb(-g.cost_bb), tone: 'loss' }
}

/** "Button opens to 2bb · 25bb deep" */
export function bbSpot(g) {
  return `${OPENER_LABEL[g.opener] || g.opener} opens to ${g.raise_to_bb}bb · ${g.stack_bb}bb deep`
}

/** The "why" for one graded decision. */
export function bbWhy(g) {
  const lines = [
    `From there this pool opens about ${g.open_pct}% of hands. Against that you have ${g.equity}% equity.`,
    g.priced === 'pot_odds'
      ? `Calling needed ${g.need}% before the discount for playing out of position.`
      : `Calling commits you: you needed ${g.need}%.`,
  ]
  const [lo, hi] = g.ev_range || [g.ev_bb, g.ev_bb]
  let conclusion
  if (g.verdict === 'close') conclusion = `Defending is worth between ${bb(lo)} and ${bb(hi)} against folding — too close to call.`
  else if (g.better === 'defend') conclusion = `Defending earns at least ${bb(lo).replace('+', '')} more than folding.`
  else conclusion = `Folding earns ${bb(-hi).replace('+', '')} more than calling.`
  return { lines, conclusion, notes: (g.flags || []).map((f) => FLAG_TEXT[f]).filter(Boolean) }
}

/** 'low' when you defend less than the chart's clear-defend share (with enough spots). */
export function defenceBand(row, minSpots) {
  if (!row.chart_defend || !row.hero || row.hero.n < minSpots || row.hero.pct === null) return null
  return row.hero.pct < row.chart_defend[0] ? 'low' : 'ok'
}
