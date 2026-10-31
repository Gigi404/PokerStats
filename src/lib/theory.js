/*
  The theory behind each leak (Phase 8 step 6, 2026-10-29).

  The graders already say WHAT was better and give the numbers of the spot
  (lib/grades.js, bbDefence.js, flopGrades.js). This file says WHY in poker
  terms: the principle a leak breaks, the reasons it holds, and one line of
  arithmetic built from the hand's own numbers, so the principle is shown
  working on a real spot.

  Keyed like the recap's leaks: '<area>:<better play>' (PokerEdge
  core/tourney_recap.lesson). Principles only — no hand charts written by
  hand (a rejected approach in PokerEdge): every "which hands" answer stays
  with the graders, which compute it against this pool.
*/

import { studyNotes } from './study.js'

const pct = (x) => `${Math.round(x)}%`
const bb = (x) => `${Math.round(x * 10) / 10}bb`
const has = (...xs) => xs.every((x) => x !== null && x !== undefined && Number.isFinite(Number(x)))

/** Folds alone, before the cards matter: fold% × the pot. */
function foldsAlone(d) {
  const w = d.why || {}
  if (!has(w.fold_pct, d.pot_bb)) return null
  return `Here everyone folded ${pct(w.fold_pct)} of the time, so the shove won ${bb((w.fold_pct / 100) * d.pot_bb)} on average from folds alone — before your cards were even looked at.`
}

/** What happens when called: how often, and with what equity. */
function whenCalled(d) {
  const w = d.why || {}
  if (!has(w.called_pct, w.equity_if_called_pct)) return null
  return `Here you got called ${pct(w.called_pct)} of the time, and then won only ${pct(w.equity_if_called_pct)} of showdowns.`
}

/** A call of an all-in: the price against the equity. */
function callPrice(d) {
  const w = d.why || {}
  if (!has(w.needed_pct, w.equity_pct)) return null
  const range = has(w.shove_pct) ? ` against their top ${Math.round(w.shove_pct)}% of hands` : ''
  return `Here the price needed ${pct(w.needed_pct)} and you had ${pct(w.equity_pct)}${range}.`
}

/** The big blind: the pool's opening range, your equity, the price. */
function bbPrice(g) {
  if (!has(g.equity, g.need)) return null
  const range = has(g.open_pct) ? `they open about ${pct(g.open_pct)} of hands from there, ` : ''
  return `Here ${range}you had ${pct(g.equity)} equity against that and needed ${pct(g.need)}.`
}

/**
 * Facing a bet: what the bet size asks for, by the formula, then what the
 * hand had. A bet of b × pot asks b / (1 + 2b) of the final pot, and the
 * minimum defence is 1 / (1 + b).
 */
function betPrice(g) {
  // With the stacks going in (low SPR, or the river priced exactly), the
  // grader prices the whole commitment, not the bet: quote its number, or
  // the bet-only formula would contradict the "why" just above.
  if (g.priced && g.priced !== 'pot_odds') {
    if (!has(g.need, g.equity)) return null
    if (g.priced === 'exact') return `Here no card was to come, so the price was exact: you needed ${pct(g.need)} and had ${pct(g.equity)}.`
    return `Here the stacks were going in, so the price was everything left, not just the bet: you needed ${pct(g.need)} and had ${pct(g.equity)}.`
  }
  if (!has(g.bet_pct)) return null
  const b = g.bet_pct / 100
  const need = (100 * b) / (1 + 2 * b)
  const mdf = 100 / (1 + b)
  const yours = has(g.equity) ? ` You had ${pct(g.equity)} against what this pool bets there.` : ''
  return `A ${Math.round(g.bet_pct)}% pot bet asks for ${pct(need)} equity on the price alone, and to stop any two cards betting at a profit you'd continue about ${pct(mdf)} of the time.${yours}`
}

const THEORY = {
  'shove:shove': {
    idea: 'At 15bb and under, all-in or fold is the whole game. A shove wins two ways: everyone folds and you take the blinds and antes, or you get called and still win the showdown often enough.',
    points: [
      'The blinds and antes cost you every orbit. With a big blind ante that is about 2.5bb a round, so at 10bb each orbit you wait costs about a quarter of your stack.',
      'Going first is the edge: a shove asks everyone behind to call with a real hand, and calling needs a much stronger hand than shoving does.',
      'A fold that should have been a shove never looks like a mistake, because you never see what would have happened. The grader counts it anyway.',
    ],
    math: foldsAlone,
  },
  'shove:fold': {
    idea: 'A shove only works when enough of the table folds. When it is called you are usually behind the calling range, so the weakest hands in a shoving range need a lot of folds to pay.',
    points: [
      'Each player still to act is another chance someone has a hand: early seats need a tighter shove than the button or small blind.',
      'The deeper you are, the more you risk to win the same blinds and antes, so the shove must win more often.',
      'Weak aces and kings are the classic trap: when they are called, a better ace or king is often what calls.',
    ],
    math: whenCalled,
  },
  'call:call': {
    idea: 'Calling an all-in is pot odds and nothing else: you need to win at least the share of the final pot you are putting in. You don’t need a premium hand — you need to beat their shoving range often enough.',
    points: [
      'Judge your hand against their range, not against the best hands. The wider they shove, the wider you can call.',
      'Money already in the pot — blinds, antes, an open — lowers the price, so the more that is in, the less equity you need.',
      'Short stacks shove wide because they have to. Their shove says less about their hand than a deep player’s would.',
    ],
    math: callPrice,
  },
  'call:fold': {
    idea: 'When you call an all-in you can only win the showdown — there is no fold equity. So calling needs a stronger hand than shoving would. That difference is called the gap.',
    points: [
      'Look at who shoved and from where. An early-seat or tight player’s shove is a strong range.',
      'Hands that look good alone, like A-9 or K-Q, can be clear underdogs to a strong shoving range.',
      'Putting your tournament at risk on a coin flip only pays when the price is right.',
    ],
    math: callPrice,
  },
  'reshove:shove': {
    idea: 'When someone opens and you have 12–35bb, a re-shove wins their open plus the blinds and antes — often 4 to 5bb — every time they fold, and openers can’t call a jam with most of what they open.',
    points: [
      'Late-position openers raise wide to steal; most of that range has to fold to a jam.',
      'At these stacks a re-shove beats calling: you never play a flop out of position, and you keep the fold equity.',
      'The pot you win when they fold is a big share of your stack, which is why the re-shove range is wider than it feels.',
    ],
    math: foldsAlone,
  },
  'reshove:fold': {
    idea: 'A re-shove needs the opener to fold. Early-position openers and tight players open strong ranges, and they call a jam with much of it.',
    points: [
      'Who opened matters more than your hand: re-shove wide against late-position steals and tight against early opens.',
      'Players still to act behind you can wake up with a hand as well.',
    ],
    math: whenCalled,
  },
  'fourbet:shove': {
    idea: 'When you open and get 3-bet with 20–40bb, the pot is already big next to your stack. A jam makes them decide for everything, and many 3-bets are bluffs or hands that can’t call.',
    points: [
      'Folding to a 3-bet loses your open for certain; a jam often wins the 3-bet as well.',
      'It works because of how often they 3-bet. The grader measured how this pool 3-bets in that spot.',
    ],
    math: foldsAlone,
  },
  'fourbet:fold': {
    idea: 'If the 3-bettor’s range is strong, a jam is called by the hands that beat you and folds out the ones you beat.',
    points: ['Against an early-position or tight 3-bet, fold all but your strongest hands.'],
    math: whenCalled,
  },
  'steal:play': {
    idea: 'At 15–25bb the blinds and antes are worth a lot next to your stack. From late position, with few players behind, taking them is how a short stack stays alive.',
    points: [
      'Fewer players behind means fewer chances someone has a hand: the cutoff, button and small blind are the stealing seats.',
      'Folding a stealing hand costs no chips now — it costs the pot you didn’t take, and the blinds keep coming.',
      'This grade is a floor: it counts only the shove. A smaller raise may be worth even more.',
    ],
    math: foldsAlone,
  },
  'bb:defend': {
    idea: 'In the big blind you already have 1bb in, so calling a raise comes at a discount. Against a small open the price is low enough that many ordinary-looking hands are worth a call.',
    points: [
      'You close the action: nobody behind you can raise.',
      'Antes make the pot bigger, so the price gets better still.',
      'Late-position openers raise wide; your hand only has to do well against their range.',
      'You play the rest of the hand out of position, so the grader discounts your equity before it says defend.',
    ],
    math: bbPrice,
  },
  'bb:fold': {
    idea: 'The discount doesn’t make every hand playable. Out of position a weak hand rarely gets to use all its equity — you end up check-folding a lot of flops.',
    points: [
      'Against early-position opens their range is strong: let go of dominated hands like weak aces and weak kings.',
      'A bigger open raises the price: against 3x you need a clearly better hand than against a min-raise.',
    ],
    math: bbPrice,
  },
  'postflop:continue': {
    idea: 'A bet gives you a price. You need to win more often than your call’s share of the final pot: 25% against a half-pot bet, 33% against a pot-size bet.',
    points: [
      'If you fold too often, they profit by betting any two cards at you. Against a half-pot bet you’d need to continue about two times in three to stop that.',
      'Draws and middle pairs often have the equity to call. The grader counts what your hand wins against what this pool actually bets with.',
    ],
    math: betPrice,
  },
  'postflop:fold': {
    idea: 'A call only pays if you win often enough against the hands that bet. When the bettors here mostly have it, a good price doesn’t save the call.',
    points: [
      'Later streets and bigger bets usually mean stronger hands; the grader measured what this pool bets with there.',
      'One pair is often not enough against bets on both the turn and the river.',
    ],
    math: betPrice,
  },
}

/**
 * The theory card for a leak.
 *
 * @param {string} lesson  '<area>:<better play>'
 * @param {object} [decision]  a grader dict (puzzle `g`), for the worked line
 * @returns {{idea: string, points: string[], worked: string|null} | null}
 */
export function theory(lesson, decision) {
  const t = THEORY[lesson]
  if (!t) return null
  let worked = null
  if (decision) {
    try {
      worked = t.math(decision)
    } catch {
      worked = null
    }
  }
  return { idea: t.idea, points: t.points, worked, notes: studyNotes(lesson) }
}

/** Every leak key with a card (for tests and coverage). */
export const THEORY_KEYS = Object.keys(THEORY)
