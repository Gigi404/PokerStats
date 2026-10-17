# Next Session Plan — PokerStats

<!-- BRIEF:START -->
DO NOW
🟡 review    | v0.21.0: open with signal, swipe closed, reopen (More → Backup
             | footer shows the version). Tap ✎ Review and go through the
             | checklist screen by screen, then "Share notes" into the next
             | session. Recap, replay, Puzzles and More are all unseen on a phone.
🟡 her phone | Her app gets the same update; her puzzle progress is her own.

NEEDS YOUR CALL
🟡 next      | Step 5 (a less dense My game) waits on your review notes.
🟡 memorable | Still open from 09-24: memorable hands for live sessions.

CARRIED OVER — still open, still correct
🟡 backup    | Her live sessions exist only on her phone: nudge one backup
             | (More → Backup → Save a backup → Files).
🟡 iPhone    | The live session form's one-row date / arrived / left, unseen
             | on an iPhone (from v0.17.0).
🟡 link      | The recap's "Practise these" button into Puzzles (in the mockup)
             | is not built yet.

SETTLED
✅ tabs      | Sessions · Online · Puzzles · Stats · More (Playground, Backup,
             | Review notes). To be reworked after the review.
✅ grade     | A review opens on the recap; the grade is decision accuracy, set
             | upstream. The app words it, judges nothing.
✅ replay    | Key hands only, not every hand.
✅ puzzles   | Progress lives on each phone (IndexedDB), not shared.
✅ live only  | the session form logs live poker only; online results arrive by
             | themselves on the Online tab. Old online sessions stay.
✅ venues     | a home game is a venue "Home game · <name>"; its sit & go formats
             | come from its past sessions (buy-in + chips). No separate store.
✅ hosting    | GitHub Pages, public repo (free plan). Her data never leaves her phone.
✅ online     | PokerStars results arrive as an encrypted file on the `data` branch,
             | unlocked by a passphrase typed once per phone. Shown in US$.
✅ playground | info only, English, Playground only, refreshed once a morning.

RUNS ITSELF
⏳ each sync  | the beast publishes new online results whenever a PokerEdge sync
             | lands (07:30 daily fallback); the phone picks them up on its next
             | open with signal.
⏳ 06:00      | daily GitHub Actions run refreshes Playground's data and redeploys.
⏳ updates    | every push to main redeploys; installed apps pick it up on the
             | open after next.
<!-- BRIEF:END -->
