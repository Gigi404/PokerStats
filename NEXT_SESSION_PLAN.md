# Next Session Plan — PokerStats

<!-- BRIEF:START -->
DO NOW
🟡 phones     | v0.17.1 is live: open with signal, swipe closed, reopen (Backup
              | footer says v0.17.1). Look at: Recent → Decisions on each day;
              | My game → Progress (top) and "When you open"; Overview →
              | Satellites; and log a live session with the new form — check the
              | date / arrived / left row fits on the iPhone.

NEEDS YOUR CALL
🟡 next       | what she asks for once she uses the new form (home games,
              | formats). Still open from 09-24: memorable hands.

CARRIED OVER — still open, still correct
🟡 backup     | her live sessions exist only on her phone. Nudge her to take one
              | backup (Backup tab → Save a backup → Files).
🟢 grades     | shipped (v0.6.0 → v0.17.1): grades on the review and My game,
              | plus the day scorecard and weekly progress.

SETTLED
✅ live only  | the session form logs live poker only; online results arrive by
              | themselves on the Online tab. Old online sessions stay.
✅ venues     | a home game is a venue "Home game · <name>"; its sit & go formats
              | come from its past sessions (buy-in + chips). No separate store.
✅ hosting    | GitHub Pages, public repo (free plan). Her data never leaves her phone.
✅ online     | PokerStars results arrive as an encrypted file on the `data` branch,
              | unlocked by a passphrase typed once per phone. Shown in US$.
✅ judging    | the app lays out PokerEdge's verdicts; it holds no poker rules.
✅ playground | info only, English, Playground only, refreshed once a morning.

RUNS ITSELF
⏳ each sync  | the beast publishes new online results whenever a PokerEdge sync
              | lands (07:30 daily fallback); the phone picks them up on its next
              | open with signal.
⏳ 06:00      | daily GitHub Actions run refreshes Playground's data and redeploys.
⏳ updates    | every push to main redeploys; installed apps pick it up on the
              | open after next.
<!-- BRIEF:END -->
