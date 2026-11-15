/*
  Review notes (2026-10-17): a checklist of what to look at on the phone
  before the "less dense" pass (Phase 8 step 5), with a place to say what you
  like, dislike, want more of, would remove or would move. Kept on this phone
  (IndexedDB meta 'reviewNotes') and shared as plain text, so the notes can be
  pasted into the next session.

  Notes: { [itemKey]: { tags: ['like', …], text: '' }, _other: { text } }
*/

export const TAGS = [
  { key: 'like', label: 'Like' },
  { key: 'dislike', label: 'Dislike' },
  { key: 'want', label: 'Want more' },
  { key: 'remove', label: 'Remove' },
  { key: 'move', label: 'Move' },
]

/** What to look for, screen by screen. Each item is a question to answer by looking. */
export const CHECKLIST = [
  {
    // Added 2026-11-15 for the Sessions screen rebuilt 2026-11-13 (live only).
    screen: 'Sessions (live)',
    items: [
      ['sess-month', 'The month header (Live, Cash | MTT side by side, $/hour and $/session): what you want to see first?'],
      ['sess-day', 'Same-day sessions under one date tile with the day’s total: easy to find a night?'],
      ['sess-mtt', 'MTT rows in blue: do they stand apart from cash at a glance?'],
    ],
  },
  {
    screen: 'Online → Recent (day cards)',
    items: [
      ['day-grade', 'The night’s grade and luck line under “Decisions”: clear at a glance?'],
      ['day-letters', 'A letter on each tournament row: useful when scanning a night?'],
      ['day-checks', '“How we played” checks: still worth having on the day card?'],
    ],
  },
  {
    screen: 'Tournament recap',
    items: [
      ['recap-grade', 'Grade card: do the letter, accuracy and the tier bar make sense without reading the footnote?'],
      ['recap-sentence', 'The one sentence under the grade: says something useful?'],
      ['recap-luck', 'All-in luck line: understood? trusted?'],
      ['recap-workon', '“Work on”: would you actually change how you play from it?'],
      ['recap-timeline', 'The timeline: readable on the phone? too much on it? anything missing?'],
      ['recap-how', '“How it went”: the right moments? the wording clear?'],
      ['recap-folded', 'The folded sections at the bottom: anything you miss up top, or never open?'],
    ],
  },
  {
    screen: 'Hand replay',
    items: [
      ['replay-steps', 'Stepping street by street: natural? too slow / too fast?'],
      ['replay-why', 'The grade and its reason on the street: understandable?'],
      ['replay-end', 'The last step (result, luck, “the cards, not you”): useful?'],
    ],
  },
  {
    screen: 'Puzzles',
    items: [
      ['puz-question', 'Is there enough information to decide? anything you wanted to know first?'],
      ['puz-answer', 'Is the explanation convincing — would you play it that way next time?'],
      ['puz-mix', 'Mix of spots and of “right” vs “wrong” answers: feels right?'],
      ['puz-filters', 'The filter chips: useful? the right groups?'],
      ['puz-habit', 'Would you do 10 a day? what would make you?'],
    ],
  },
  {
    screen: 'Online → My game (the step 5 page)',
    items: [
      ['game-progress', 'Progress (accuracy by week): read it? clear?'],
      ['game-stats', 'Your stats vs typical (VPIP, PFR…): keep, move, remove?'],
      ['game-opens', 'Opening by seat / by stack / “When you open”: which do you read?'],
      ['game-short', 'Short-stack decisions and 3-betting deep: keep, move, remove?'],
      ['game-bb', 'Big blind defence: keep, move, remove?'],
      ['game-post', 'Flop habits, after the flop, bet sizing: keep, move, remove?'],
      ['game-leaks', 'Your biggest leak and the ranked list: is the top one what you would work on?'],
      ['game-trends', 'Opening rates by month and tickets: still needed?'],
      ['game-order', 'If this page showed only three things, which three?'],
      // Added 2026-11-15: the My game cards built after v0.21.0 (10-29 → 10-31),
      // none of which had been looked at on a phone. Appended, never renamed:
      // notes are stored by key, so an existing key must keep its exact name.
      ['game-luck', 'How much is luck (ROI with and without your best, how fragile the balance is): understood? believed?'],
      ['game-reality', 'Do the grades hold up (calling after the flop, big blind calls): convincing?'],
      ['game-river', 'River choices: does it match how you remember playing the river?'],
      ['game-payjumps', 'Pay jumps: useful near the money? clear?'],
      ['game-position', 'Position after the flop: keep, move, remove?'],
      ['game-videos', '“Work on: from the videos”: would you watch them? the right ones?'],
      ['game-suits', 'Which tournaments suit you: does it match your gut? would it change what you register for?'],
      ['game-tilt', 'Tilt check: fair? would you want to know this during a night?'],
      ['game-theory', 'The theory notes under a leak or a “Work on”: do they explain the why?'],
      ['game-practise', 'The “Practise these” buttons (recap, leaks): did you tap one? did the puzzles fit?'],
    ],
  },
  {
    screen: 'Other Online views',
    items: [
      ['other-overview', 'Overview: what do you look at there?'],
      ['other-history', 'History: still needed next to Recent?'],
      ['other-goal', 'Goal (bankroll ladder): right place?'],
      ['other-charts', 'Charts: used? would you rather reach them from a puzzle or a grade?'],
    ],
  },
  {
    // Added 2026-11-15 for "How sure are we" (under More since 2026-10-29).
    screen: 'More',
    items: [
      ['more-trust', 'How sure are we: does it change how far you trust the grades?'],
      ['more-theory', 'Theory covered / not covered yet: useful, or only for us?'],
    ],
  },
  {
    screen: 'The app as a whole',
    items: [
      ['app-tabs', 'Tab bar (Sessions, Online, Puzzles, Stats, More): right order? right tabs?'],
      ['app-more', 'Playground and Backup under More: fine there?'],
      ['app-dense', 'Where is it still too dense?'],
      ['app-missing', 'What is missing that you looked for?'],
      ['app-friend', 'Would you hand it to your friend as it is? what stops you?'],
    ],
  },
]

const ALL_ITEMS = CHECKLIST.flatMap((s) => s.items.map(([key]) => key))

/** How many checklist items have a tag or a note. */
export function progressCount(notes) {
  return { done: ALL_ITEMS.filter((k) => hasNote(notes?.[k])).length, total: ALL_ITEMS.length }
}

function hasNote(n) {
  return !!n && ((n.tags && n.tags.length > 0) || (n.text && n.text.trim() !== ''))
}

/** Toggle a tag on an item, returning new notes. */
export function toggleTag(notes, key, tag) {
  const n = notes[key] || { tags: [], text: '' }
  const tags = n.tags.includes(tag) ? n.tags.filter((t) => t !== tag) : [...n.tags, tag]
  return { ...notes, [key]: { ...n, tags } }
}

/** Set an item's note text, returning new notes. */
export function setText(notes, key, text) {
  const n = notes[key] || { tags: [], text: '' }
  return { ...notes, [key]: { ...n, text } }
}

/**
 * All notes as plain text, screen by screen, only the items that have
 * something — what gets shared and pasted into the next session.
 */
export function toText(notes, version = '') {
  const label = Object.fromEntries(TAGS.map((t) => [t.key, t.label]))
  const out = [`PokerStats review notes${version ? ` (v${version})` : ''}`]
  for (const s of CHECKLIST) {
    const rows = s.items.filter(([key]) => hasNote(notes?.[key]))
    if (!rows.length) continue
    out.push('', `## ${s.screen}`)
    for (const [key, q] of rows) {
      const n = notes[key]
      const tags = (n.tags || []).map((t) => label[t] || t).join(', ')
      out.push(`- ${q}`)
      if (tags) out.push(`  [${tags}]`)
      if (n.text?.trim()) out.push(`  ${n.text.trim()}`)
    }
  }
  if (notes?._other?.text?.trim()) out.push('', '## Other', notes._other.text.trim())
  return out.length > 1 ? out.join('\n') : `${out[0]}\n\n(no notes yet)`
}
