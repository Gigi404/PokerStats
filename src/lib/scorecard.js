/*
  Wording for a play day's decision scorecard (PokerEdge core/online_summary.py
  attach_scorecards): every grade the day's tournaments carry, added up, so
  "how well did we play" reads off the day card.

  A scorecard is
    { graded, correct, close, mistakes, cost_bb,
      groups: [{ group, graded, mistakes, cost_bb }],
      costliest: { group, tournament_id, hand_id, cards, action, better,
                   cost_bb, stack_bb, seat, spot } | null,
      steal_floor }
  or null on a day with nothing graded — which is not a clean day, so it is
  never shown as one. No judging happens here; the beast did it.
*/

import { bb, situation } from './grades.js'

/** Short names for the groups, in the order the beast lists them. */
export const GROUP_LABELS = {
  short_stack: 'Short-stack all-ins',
  steal: 'Missed steals',
  bb: 'Big blind vs a raise',
  flop: 'Flop, facing a bet',
  turn: 'Turn, facing a bet',
  river: 'River, facing a bet',
}

/**
 * The headline: counts and what the mistakes cost. A missed steal's cost is a
 * floor, so a day that has one says "at least".
 *
 * @returns {{counts: string, cost: string|null}}
 */
export function headline(sc) {
  const counts = `${sc.graded} graded · ${sc.mistakes} mistake${sc.mistakes === 1 ? '' : 's'}`
  if (!sc.mistakes) return { counts, cost: null }
  return { counts, cost: `${sc.steal_floor ? '≥' : ''}${bb(-sc.cost_bb)}` }
}

/**
 * Shares of correct / close / mistake, in whole percent summing to 100, for
 * the three-colour bar. Rounding error goes to the largest share.
 */
export function shares(sc) {
  if (!sc.graded) return { correct: 0, close: 0, mistake: 0 }
  const raw = { correct: sc.correct, close: sc.close, mistake: sc.mistakes }
  const out = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round((v / sc.graded) * 100)]))
  const big = Object.keys(out).reduce((a, b) => (raw[a] >= raw[b] ? a : b))
  out[big] += 100 - (out.correct + out.close + out.mistake)
  return out
}

const STREET_DID = { fold: 'folded', continue: 'continued', call: 'called', raise: 'raised' }

/**
 * The costliest mistake in words: what happened and what was better.
 * "SB 33.6bb · folded to a raise — re-shove was better"
 */
export function costliestText(c) {
  const where = [c.seat, Number.isFinite(c.stack_bb) ? `${c.stack_bb}bb` : null].filter(Boolean).join(' · ')
  let what
  if (c.group === 'short_stack' || c.group === 'steal') {
    what = situation(c)
  } else if (c.group === 'bb') {
    what = c.action === 'fold' ? 'folded the big blind to a raise' : `${STREET_DID[c.action] || c.action} in the big blind`
  } else {
    what = `${STREET_DID[c.action] || c.action} to a ${c.group} bet`
  }
  const better = c.group === 'steal' ? 'raise or shove' : c.better === 'continue' ? 'continuing' : c.better
  return `${where ? `${where} · ` : ''}${what} — ${better} was better`
}
