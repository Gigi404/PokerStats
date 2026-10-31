/*
  "How sure are we" (2026-10-29, owner's ask): how far to trust each part of
  the Online tab, the evidence behind it, and what would raise it; then which
  poker theory the app covers and which it doesn't yet.

  Written by hand from PokerEdge's audits (docs/SESSION_LOG.md 2026-10-16:
  the outside equity check and the all-in backtest; accuracy.py's
  split-half reliability). The confidences are a judgement on that
  evidence, not a statistic, and they date: AS_OF says when. Update this
  file when a check is run or a gap closes.
*/

export const AS_OF = '2026-10-31'

/**
 * Each area: label, confidence (0-100, a judgement), evidence, raise (how to
 * get it higher, or null when there is nothing left to do).
 */
export const AREAS = [
  {
    label: 'Equity and pot odds',
    confidence: 98,
    evidence: 'You checked 10 graded hands against a free calculator: all within 0.6 points.',
    raise: 'An automated test of ~1,000 random matchups against an independent evaluator.',
  },
  {
    label: 'Nash push/fold charts',
    confidence: 95,
    evidence: 'Solved by the code, not typed in: 108 charts, the worst 0.013bb from perfect. Matches the known heads-up result.',
    raise: 'Compare ~20 chart cells with published chip-EV charts.',
  },
  {
    label: 'Short-stack grades',
    sub: 'shove, call, re-shove',
    confidence: 80,
    evidence: 'Backtest on 246 real all-ins: +626bb predicted vs +595bb real, so the model holds. At 10–15bb it is ~0.9bb optimistic per shove — shown as “close”.',
    raise: 'More all-ins (the backtest re-runs on every publish); check fold rates a second, independent way.',
  },
  {
    label: 'Big blind defence grades',
    confidence: 75,
    evidence: 'Built on the checked equity; the discount for playing out of position is an assumption.',
    raise: 'Backtest your real big blind defends the way the all-ins were: predicted vs what happened.',
  },
  {
    label: 'After-the-flop grades',
    confidence: 60,
    evidence: 'How much of your equity you actually get to use is a set guess (e.g. 70%).',
    raise: 'Measure it from your own hands, and a 10-hand second-opinion check like the preflop one.',
  },
  {
    label: 'Grades near the bubble or a pay jump',
    confidence: 50,
    evidence: 'No ICM yet: chips are judged as if they were money.',
    raise: 'Estimate payout structures, add ICM, and check a few spots in an ICM tool.',
  },
  {
    label: 'Letter grade for one tournament',
    confidence: 67,
    unit: 'signal',
    evidence: 'Measured: two random halves of a tournament’s decisions agree about two thirds of the time.',
    raise: 'Read the weekly grade instead — it pools enough decisions to be steady.',
  },
  {
    label: 'Letter grade for a week',
    confidence: 85,
    evidence: 'Pools 100+ decisions.',
    raise: 'Comes with volume.',
  },
  {
    label: 'Money results since Oct 8',
    confidence: 95,
    evidence: 'PokerStars tournament summaries carry the real prizes.',
    raise: 'Keep summaries switched on in the PokerStars client.',
  },
  {
    label: 'Money results before Oct 8',
    confidence: 75,
    evidence: '74 of 213 results are “assumed bust”; a prize could be missing.',
    raise: 'Can’t be backfilled; it matters less as new results come in.',
  },
  {
    label: 'Bankroll estimate',
    confidence: 30,
    evidence: 'It went below zero after Oct 24: a deposit or a ticket entry is missing.',
    raise: 'Type the cashier balance in once (--balance) — that takes it to ~95%.',
  },
  {
    label: 'Which tournaments suit you — findings',
    confidence: 85,
    evidence: 'Strict bar: 3 standard errors on like-for-like spots. Nothing passes it yet.',
    raise: 'More nights; field size fills in from the next import.',
  },
  {
    label: 'Which tournaments suit you — ROI per row',
    confidence: 40,
    evidence: '11 to 74 tournaments per row; one cash swings it.',
    raise: 'Only time: it takes hundreds of tournaments per row.',
  },
  {
    label: 'Tilt check',
    confidence: 75,
    evidence: 'Like-for-like test on 2,562 decisions: no tilt found. Blunders cluster, but in hard spots, not after blows. Both players are mixed in.',
    raise: 'Who played each tournament (tilt is personal), and more nights.',
  },
  {
    label: 'River choices — missed value and bad bets',
    confidence: 60,
    evidence: 'Fitted on 1,602 river bets, with mucked hands counted as losers. On unseen hands, predicted about 2–3bb per choice above real results, so bb totals are upper estimates. Spots where you act first are estimates too.',
    raise: 'More river showdowns, and a check by a strong player of the costliest spots.',
  },
  {
    label: 'River bluffs to consider',
    confidence: 25,
    evidence: 'Never counted as mistakes. Fold rates come from bets players chose to make, and a bet you never made can’t be checked.',
    raise: 'Try some of these spots and let the results build up.',
  },
  {
    label: 'Pay jumps — ICM notes',
    confidence: 35,
    evidence: 'An estimate beside the grade, never a grade. Prizes come from a curve fitted on six real tables, players left are interpolated, and other tables’ stacks are assumed average. Only 8 tournaments so far, 6 of them bounty events, where ICM says less. The calculator itself matched HoldemResources to two decimals.',
    raise: 'More deep runs, and better estimates of players left.',
  },
  {
    label: 'Theory cards — the formulas',
    confidence: 99,
    evidence: 'Exact arithmetic (25% / 33% to call, minimum defence), tested.',
    raise: null,
  },
  {
    label: 'Theory cards — the principles',
    confidence: 85,
    evidence: 'Standard tournament theory, written for this app and not reviewed by a strong player.',
    raise: 'Have a strong player read all 13 cards.',
  },
  {
    label: 'Your stats vs hers',
    confidence: 0,
    unit: 'separated',
    evidence: 'Both players on the account are mixed in every number.',
    raise: 'Tag who played each tournament — planned after the HUD work.',
  },
]

/** The biggest gains, in order: what to do and what it buys. */
export const GAINS = [
  ['Type in the cashier balance', 'Bankroll 30% → 95%, in ten seconds.'],
  ['ICM for bubble and pay-jump spots', 'Fixes the weakest grades exactly where mistakes cost the most money.'],
  ['A second-opinion check of after-the-flop grades', 'Lifts the 60% area the way your 10-hand check proved the preflop maths.'],
  ['Backtest the big blind defends', 'Cheap: the all-in backtest already exists to copy.'],
  ['Who played each tournament', 'Every number becomes yours instead of a blend (after the HUD).'],
]

/** Theory the app grades or measures today. */
export const COVERED = [
  ['Equity and pot odds', 'the engine under everything'],
  ['Push/fold at 15bb and under', 'graded, with the Nash chart as a second opinion'],
  ['Re-shoving over an open, 12–35bb', 'graded, with a re-jam equilibrium'],
  ['3-bet and 4-bet jams up to 40bb', 'graded'],
  ['Stealing at 15–25bb', 'graded as a floor'],
  ['Big blind defence', 'graded, with charts'],
  ['Facing a bet on the flop, turn and river', 'graded'],
  ['Bounties in your own shoves and calls', 'counted in every PKO grade'],
  ['Opening by seat and stack', 'measured against typical'],
  ['C-bets, folding to c-bets, check-raises', 'measured'],
  ['Bet sizing against this pool', 'measured'],
  ['The price of a bet and minimum defence', 'in the theory cards'],
  ['Tilt after a bad beat, a big pot, a bust or a blunder', 'tested on the same kind of spots'],
  ['Your own river bets and checks', 'priced on this pool, outside the letter grade'],
  ['Pay jumps near and in the money', 'an ICM estimate beside each all-in'],
]

/** Theory not covered yet: [topic, why it matters, size]. */
export const NOT_YET = [
  ['ICM: bubbles, pay jumps, final tables, satellite bubbles', 'The biggest gap — near the money, chips are not money, and a chip-right play can be a big mistake.', 'big'],
  ['Your own bets after the flop', 'Value bets, bluffs, c-bet sizing, barrels. Only facing a bet is graded today.', 'big'],
  ['Variance and sample size', 'How many tournaments before an ROI means anything; the risk of going broke at a given buy-in.', 'small'],
  ['Equity realisation from your own hands', 'Replaces the guess behind the after-the-flop grades.', 'medium'],
  ['Deep stacks preflop (over 40bb)', '3-bet bluffs, calling opens, set-mining: counted, not graded.', 'medium'],
  ['Multiway pots after the flop', 'Counted Oct 29: ~365 flop spots, mostly deep — too few to grade yet. Short-stack squeezes are already graded as re-shoves.', 'medium'],
  ['Board texture, range advantage, blockers', 'Who the flop favours and which cards make a bluff work.', 'big'],
  ['Opponents calling for your bounty', 'Measured and parked until there are about twice as many PKO hands.', 'medium'],
  ['Player types and exploits', 'Planned with the HUD: most opponents are met once, so types beat names.', 'big'],
  ['Late registration and re-entry decisions', 'When joining late or re-entering pays.', 'small'],
]

/** Colour of a confidence: green from 85, gold from 60, red below. */
export function confidenceTone(c) {
  return c >= 85 ? 'gain' : c >= 60 ? 'accent' : 'loss'
}
