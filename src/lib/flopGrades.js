/*
  Wording for PokerEdge's low-SPR flop grades (analysis/flop_grading.py).

  The spot: an opponent makes the first bet on the flop, the stack-to-pot
  ratio is under 3, and you fold, call or raise. PokerEdge prices continuing
  against what this pool bets with on that board (learned from the hands it
  showed) and publishes, per game, the counts and the costliest mistakes
  (play.flop.low_spr.graded). This file only turns those numbers into
  sentences: the judging is done on the beast.

  `priced` says how continuing was valued:
    all_in    calling would leave less than the pot behind — committed, so
              the stacks are treated as going in
    pot_odds  a small bet that leaves room to fold later; judged at 70% and
              100% of your equity used, a mistake only when both agree
  `ev_range` is [low, high] continuing-vs-folding in big blinds (equal when
  all_in); `ev_bb` is its middle.
*/
import { bb } from './grades.js'

const ACTED = { call: 'Called', raise: 'Raised' }

/** What the bettor did before the flop, in words. */
const ROLE = { raiser: 'the preflop raiser', caller: 'a player who called preflop' }

/** "IP" / "OOP" / "multiway" from where you sat. */
const SITUATION = { hu_ip: 'in position', hu_oop: 'out of position', multi: 'multiway' }

const FLAG_TEXT = {
  satellite: 'Satellite: a seat pays everyone the same, so surviving is worth more than chips say.',
  bounty_unknown: 'Bounty not counted: winning the pot may also have won a bounty.',
  others_to_act: 'Players still to act behind you are assumed to fold.',
  big_bet: "A big bet: this pool's big bets hold more made hands than the range assumes, so folding may be better than shown.",
  pot_odds: 'Priced on pot odds: the turn and river are not played out.',
}

/**
 * The verdict line for one graded flop decision.
 *
 * @returns {{mark: string, text: string, value: string, tone: 'gain'|'loss'|'muted'}}
 */
export function flopVerdict(g) {
  const acted = g.action !== 'fold'
  if (g.verdict === 'close') {
    return { mark: '≈', text: 'Close — continuing or folding, about the same', value: bb(g.ev_bb), tone: 'muted' }
  }
  if (g.verdict === 'correct') {
    return { mark: '✅', text: acted ? `Correct ${g.action}` : 'Correct fold', value: bb(Math.abs(g.ev_bb)), tone: 'gain' }
  }
  return acted
    ? { mark: '❌', text: `${ACTED[g.action] || 'Continued'} — folding was better`, value: bb(-g.cost_bb), tone: 'loss' }
    : { mark: '❌', text: 'Folded — continuing was better', value: bb(-g.cost_bb), tone: 'loss' }
}

/** The short line under the cards: the spot in words. */
export function flopSpot(g) {
  const where = SITUATION[g.situation] || ''
  return `${g.bet_pct}% pot bet · SPR ${g.spr} · ${where}`
}

/**
 * The "why": who bet, your equity against them, the price, and the
 * conclusion. Notes carry the flags.
 *
 * @returns {{lines: string[], conclusion: string, notes: string[]}}
 */
export function flopWhy(g) {
  const lines = [
    `The bet came from ${ROLE[g.bettor_role] || 'an opponent'}. Against what this pool bets there, you have ${g.equity}% equity.`,
    g.priced === 'pot_odds'
      ? `Calling needed ${g.need}% on pot odds.`
      : `With the stacks going in, you needed ${g.need}%.`,
  ]
  const [lo, hi] = g.ev_range || [g.ev_bb, g.ev_bb]
  let conclusion
  if (g.verdict === 'close') {
    conclusion = g.priced === 'pot_odds'
      ? `Continuing is worth between ${bb(lo)} and ${bb(hi)} against folding, depending on how much of your equity you get to use — too close to call.`
      : 'Continuing and folding are worth about the same.'
  } else if (g.better === 'continue') {
    conclusion = g.priced === 'pot_odds'
      ? `Continuing earns at least ${bb(lo).replace('+', '')} more than folding, even using only 70% of your equity.`
      : `Continuing earns ${bb(hi).replace('+', '')} more than folding.`
  } else {
    conclusion = `Folding earns ${bb(-hi).replace('+', '')} more than continuing${g.priced === 'pot_odds' ? ', even using all your equity' : ''}.`
  }
  const notes = (g.flags || []).map((f) => FLAG_TEXT[f]).filter(Boolean)
  return { lines, conclusion, notes }
}

/**
 * One game's block as a headline: graded, mistakes, bb lost, and the split
 * between folds that should have continued and continues that should have
 * folded. Null when nothing was graded.
 */
export function flopTally(block) {
  if (!block || !block.n) return null
  return {
    n: block.n,
    correct: block.correct,
    close: block.close,
    mistake: block.mistake,
    cost: Math.round(block.cost_bb * 10) / 10,
    missed: block.missed,
    missedBb: Math.round(block.missed_bb * 10) / 10,
    bad: block.bad_continue,
    badBb: Math.round(block.bad_continue_bb * 10) / 10,
    ungraded: block.ungraded,
  }
}
