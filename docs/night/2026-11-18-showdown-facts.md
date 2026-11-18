# Night 2026-11-18: showdown facts on every puzzle (phone side)

Owner-approved 2026-11-17 in a laptop session. PokerEdge computes a new `sd`
field on each puzzle whose bettor's cards were shown
(`~/dev/Apps/PokerEdge/docs/night/2026-11-18-showdown-facts.md` has the full
contract and the reasons). It may not exist in tonight's summary yet: build and
test against **fixture puzzles written to that contract**.

## Why

In the Puzzles tab the owner sees the runout and the villain's cards, then
"that was the mistake" when, for example, he folded and was beat. It reads as a
contradiction because the screen never says the grade is judged against
everything players bet there, not this hand, and never shows the numbers.

## Field contract (copy, keep in sync with PokerEdge's brief)

`p.g` is unchanged. New on the puzzle: `p.sd`, present only when the bettor was shown.

- `his` str, bettor's cards
- `need` float, equity % a call needs (pot odds)
- `eq_hand` float, hero's exact equity % against `his` at the decision
- `eq_range` float|null, hero's equity % against the range the grade used
- `result` "win"|"lose"|"split", hero vs `his` on the full board as dealt
- `line` str, bettor's actions per street up to the decision, comma-separated
  (`x` check, `b50` bet 50% pot, `r` raise, `c` call, `-` none), preflop first
- `draw` null or `{kinds: [...], outs, clean, rule}`, kinds among
  `nut_flush_draw flush_draw oesd gutshot double_gutshot overcards
  backdoor_flush backdoor_straight`
- `implied_bb` float|null, extra bb to win later when hitting for the call to
  break even against `his`

## What to build

In `src/lib/puzzles.js` `answer()` (and wherever the answer is rendered), a
"Showdown" block under "At the table you …", only when `p.sd` exists. Three
parts, always in this order, exact numbers, **never the word "roughly"**:

1. **This hand.** "He showed 9♠9♦. Calling would have won / lost / split here."
   On a fold: "Folding saved you X bb" or "Folding gave up X bb" if computable
   from the puzzle; otherwise just won/lost.
2. **The math.** "You needed 25%. Against his hand you had 9%. Against
   everything players bet here you had 31%." Skip the range part when
   `eq_range` is null. With a draw: name it in plain words ("nut flush draw +
   gutshot"), "12 outs, 9 clean against his hand: rule of 4 says 36%, exact
   38%". With `implied_bb`: "To make the call pay you'd need to win
   +6.0 bb more when you hit."
3. **What decides the grade.** One line: "The grade uses the range, because you
   can't see his cards when you act. It doesn't see his line (`line` rendered
   readably, e.g. raise, bet ⅓, check, bet ¾) or his bet sizes." When the result
   and the verdict disagree (a fold graded a mistake but calling loses this
   hand, or the reverse), lead with: "This time the result and the grade
   disagree:" so it's never left looking like a contradiction. When they agree,
   keep parts 1 and 2 short.

Match the existing components and wording style (`grades.js`, `flopGrades.js`,
`bbDefence.js`). Suits render as the app already renders cards.

## Rules

- Read `CLAUDE.md` and `NEXT_SESSION_PLAN.md` first.
- No new dependency. No change to Leitner/progress logic, no storage change.
- Tests: unit tests for the wording function covering river fold beaten,
  river fold that would have won, split, flop draw with dirty outs,
  `eq_range` null, no `sd` (block absent). `npm test && npm run build` pass.
- Nothing pushed, nothing deployed (pushing `main` deploys Pages: owner only).
- Docs: the project's session log / CLAUDE.md entry, short.

## Done when

The block renders from fixtures for every case above, tests and build pass,
and a puzzle without `sd` renders exactly as before.
