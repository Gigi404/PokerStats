/*
  The shape of My game (Phase 8, density pass). The page leads with your leaks,
  costliest first (PokerEdge core/leaks.py → play.leaks); every older card is
  detail, under the leak it explains or folded by topic below. The app ranks
  nothing itself: the order comes in the file.
*/

import { area } from './puzzles.js'

/** How many leaks show before "See all". */
export const SHOWN_LEAKS = 3

/** The cards that explain a leak, by its area. Keys are My game's `parts`. */
const LEAK_PARTS = {
  shove: ['short'],
  call: ['short'],
  reshove: ['short'],
  fourbet: ['short', 'deep'],
  steal: ['seats', 'opens'],
  bb: ['bb'],
  postflop: ['post', 'flop'],
}

/** The cards under one leak ('<area>:<better play>'). */
export const leakParts = (lesson) => LEAK_PARTS[area({ lesson })] || []

/** Every card of My game, folded by topic under the leaks and the progress card. */
export const TOPICS = [
  { key: 'preflop', title: 'Before the flop', hint: 'Your stats, opening, stack sizes', parts: ['stats', 'seats', 'opens', 'response', 'depth', 'trends'] },
  { key: 'short', title: 'Short stacks', hint: 'All-ins and 3-betting deep', parts: ['short', 'deep'] },
  { key: 'bb', title: 'Big blind', hint: 'Defending against a raise', parts: ['bb'] },
  { key: 'postflop', title: 'After the flop', hint: 'Habits, sizing, river, position', parts: ['flop', 'post', 'sizing', 'river', 'position'] },
  { key: 'tournaments', title: 'Tournaments', hint: 'What suits you, tilt, pay jumps, tickets', parts: ['suits', 'tilt', 'pay', 'tickets'] },
  { key: 'trust', title: 'How far to trust this', hint: 'Luck, grade checks, coaching videos', parts: ['variance', 'reality', 'study'] },
]
