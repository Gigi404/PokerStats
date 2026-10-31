/*
  What the coaching videos left us (PokerEdge docs/VIDEO_STUDY.md, 2026-10-30).

  Three kinds of thing, kept apart on purpose:
    POOL     claims tested on this pool's hands, with the result
    HABITS   your own habits measured beside the pool
    NOTES    a coach's judgment, untested, shown with the matching theory card

  Static, like lib/trust.js: these are dated measurements, not live stats. None
  of it is a grading rule: a coach's advice is opinion, and typing it into a
  grader is the rejected approach of 2026-08-17.
*/

export const STUDY_AS_OF = '2026-10-30'

/** Tested on the pool: what to do about it, and the evidence. */
export const POOL = [
  {
    text: 'Fold one pair to a river raise.',
    evidence: 'Only 7% of shown tournament river raises were bluffs (12% in cash), half the rate of a first bet. About 90% of called raises were shown.',
  },
  {
    text: 'Give up marginal hands to a flop check-raise in tournaments.',
    evidence: '75% of shown check-raises were a pair or better, and only 12% were air (97 hands).',
  },
  {
    text: 'Bluff the river big, not small.',
    evidence: 'In tournaments, bets over 75% of the pot got a fold 62% of the time, against 33% for bets under 40%.',
  },
  {
    text: 'A turn check after a flop bet is usually a middling hand, not air.',
    evidence: '66% were a pair or worse, but only 21% were air, and about a third still had top pair or better.',
  },
]

/** Measured on your own hands. */
export const HABITS = [
  {
    text: 'Raise your blind 3-bets in cash.',
    evidence: 'Your median is 2.7× the open; the pool’s is 4× (52 hands).',
  },
  {
    text: 'Your button 3-bets run backwards.',
    evidence: 'In tournaments, 10.7% against early opens but 4.6% against middle ones. The pool is 8.1% and 9.7%.',
  },
  {
    text: 'Your c-bets don’t change with the board.',
    evidence: 'In tournaments, 61% on low boards and 60% on high ones when out of position. With players behind you bet more, where the pool bets less.',
  },
  {
    text: 'Watch cold-calling early opens.',
    evidence: 'You get squeezed 30% of the time after calling (96 hands). The pool gets squeezed 21%.',
  },
  {
    text: 'Bet the river a bit more often when checked to.',
    evidence: 'Your size is fine at half pot, but you bet 22% of the time in tournaments, and the pool bets 32%.',
  },
]

/** A coach's judgment, by the theory card it belongs with. Never tested. */
const NOTES = {
  'postflop:continue': [
    'Against a jam on a draw-heavy board, overcards with a flush draw is an easy call.',
    'The lowest overpair usually bets or check-raises for protection.',
  ],
  'postflop:fold': [
    'A tight player’s cold call of your 3-bet, in front of a shover, is often a trap.',
  ],
  'steal:play': ['Don’t isolate a very loose player: keep them in the pot.'],
  'reshove:shove': ['Against a loose opener who 4-bets a lot, call wider rather than 3-bet.'],
  'bb:defend': ['Mix the close spots rather than always doing one thing.'],
}

/** The coach's notes for a theory card, or none. */
export function studyNotes(lesson) {
  return NOTES[lesson] || []
}

/** Every theory card with notes (for tests). */
export const NOTE_KEYS = Object.keys(NOTES)
