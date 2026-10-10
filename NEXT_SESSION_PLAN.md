# Next Session Plan — PokerStats

<!-- BRIEF:START -->
DO NOW
🟡 phones     | put v0.5.0 on both phones: open with signal, swipe closed, reopen
              | (Backup footer says v0.5.0). New: Online → Goal, the bankroll on
              | its way to US$1,000 and when to take money out. The owner is
              | installing it on their own phone too — passphrase once there;
              | live sessions stay separate per phone. Never seen on a real phone.
🟡 after play | after the next PokerStars session, check Online moved by itself and
              | Goal's estimate moved off US$116.

COMING NEXT
🟡 grades     | PokerEdge Phase 7a step 7: decision grades on the review and My
              | game. Mockups first; summary stays schema 1.

NEEDS YOUR CALL
🟡 next       | what she asks for once she uses it. Still open from 09-24:
              | memorable hands (the one field deferred from day one).

CARRIED OVER — still open, still correct
🟡 backup     | her live sessions exist only on her phone. Nudge her to take one
              | backup (Backup tab → Save a backup → Files); the app reminds her
              | every 10 changes.
🟢 laptop     | PokerStats is now cloned on the laptop too (`C:\Dev\Apps              | PokerStats`, plus a `beast` remote). gigi404.github.io is still
              | beast-only.

SETTLED
✅ hosting    | GitHub Pages, public repo (free plan — private would unpublish the
              | site). Her data never leaves her phone.
✅ goal       | the Goal view only lays out PokerEdge's `bankroll` block; ladder and
              | buy-in bands are decided there, not in the app.
✅ online     | PokerStars results arrive as an encrypted file on the `data` branch,
              | unlocked by a passphrase typed once per phone. Shown in US$, never
              | added to the CAD live results. Live sessions stay manual.
✅ scope      | CAD for live. Cash + tournament × live + online. Home games are
              | ordinary sessions. No backfilling of old sessions.
✅ playground | info only, English, Playground only, refreshed once a morning.

RUNS ITSELF
⏳ each sync  | the beast publishes new online results whenever a PokerEdge sync
              | lands (07:30 daily fallback); the phone picks them up on its next
              | open with signal. No redeploy involved.
⏳ 06:00      | daily GitHub Actions run (10:00 UTC) refreshes Playground's data
              | and redeploys; a keepalive job stops GitHub disabling it.
⏳ updates    | every push to main redeploys; installed apps pick it up on the
              | open after next.
<!-- BRIEF:END -->
