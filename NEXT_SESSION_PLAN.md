# Next Session Plan — PokerStats

<!-- BRIEF:START -->
DO NOW
🟢 nothing   | Nothing is urgent. The app is live and installed on her iPhone;
             | the next work starts from whatever she asks for after real use.
🟡 check     | Fri 09-25, any time after 06:00: open the Playground tab (or
             | gigi404.github.io/PokerStats/data/playground.json) and confirm it
             | says "updated today at 6:0x". That is the first UNATTENDED
             | morning refresh — so far it has only run on pushes. If it did not
             | run: gh run list -R Gigi404/PokerStats.
🟡 v0.2.0    | Confirm her phone picked up v0.2.0: the Backup tab footer shows
             | the version. If still v0.1.0, swipe the app closed and reopen.

NEEDS YOUR CALL
🟡 next      | What to build next, once she has used it: memorable hands (the
             | one field deferred from day one), or optional backup/sync to the
             | beast (would mean Tailscale on her phone — rejected for now).

CARRIED OVER — still open, still correct
🟡 backup    | Her sessions exist only on her phone. Worth nudging her to take
             | one backup (Backup tab → Save a backup → Files) after a few
             | sessions; the app also reminds her every 10.
🟡 laptop    | PokerStats and gigi404.github.io are cloned only on the beast
             | (plus GitHub). Clone to the laptop only if you ever want to work
             | on them there.

SETTLED
✅ hosting   | GitHub Pages (public repo), data only on her phone, no beast
             | backend. gigi404.github.io redirects every casing to /PokerStats/.
✅ scope     | CAD only. Cash + tournament × live + online. Home games are
             | ordinary sessions (tag "Home game"). No backfilling of old
             | sessions — forward from 2026-09-24.
✅ playground| Playground tab is info only (no "log this tournament"), English,
             | Playground only, refreshed once a morning.

RUNS ITSELF
⏳ 06:00     | Daily GitHub Actions run (10:00 UTC) re-fetches Playground's
             | jackpots, schedule and promos and redeploys; a keepalive job
             | stops GitHub disabling the schedule in quiet months.
⏳ updates   | Every push to main redeploys; her installed app picks it up on
             | its next open with signal.
<!-- BRIEF:END -->
