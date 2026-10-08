# PokerStats

A results tracker for live (and online) poker — cash games and tournaments —
built for the owner's girlfriend's **iPhone**. Installed from Safari via
Share → Add to Home Screen. Started 2026-09-24.

## Architecture
- **Frontend only.** React 19 + Vite 7 + Tailwind 4 + vite-plugin-pwa. No backend:
  every session lives in **IndexedDB on her phone** (`src/lib/db.js`, raw API,
  pattern copied from Ritual). The only network reads are two data files: the
  Playground schedule and the encrypted online results (both below).
- **Hosting: GitHub Pages** at `https://gigi404.github.io/PokerStats/`, deployed by
  `.github/workflows/deploy.yml` on push to `main`. Chosen because her phone has
  never been on the tailnet — a public static host needs no Tailscale and exposes
  nothing on the beast. The code is public; her data never leaves the phone.
- `base: '/PokerStats/'` in `vite.config.js`; manifest `start_url`/`scope` are
  relative. Renaming the repo means changing `BASE`.
- Dev server / preview: **5181** (in the port map). Code lives on the beast at
  `~/dev/Apps/PokerStats`.

## Data model (`src/lib/sessions.js`)
One record per session. Two independent choices: **format** (cash | tournament)
× **setting** (live | online). Amounts are integer **cents**. Date `YYYY-MM-DD`,
times `HH:MM` local; an end before the start = crossed midnight.
`buyIns` is a list (buy-in + rebuys / re-entries / add-ons). `status: 'active'`
= at the table now. `event` = special night tag (Bad Beat Jackpot, …).
Currency: **CAD only** (owner's decision).

## Stats (`src/lib/stats.js`, unit-tested)
Cash and tournaments never mix: $/hr, win rate for cash; ROI, ITM, best finish
for tournaments. $/hr only counts sessions with both times.

## Playground tab (v0.2.0)
Read-only "what's on" for Playground Poker Club: the 3 Bad Beat Jackpots, big
series, the tournament schedule (daily / series / satellites) and poker promos.
- `scripts/fetch-playground.mjs` (Node, no deps) writes `public/data/playground.json`
  (gitignored, never committed). Sources, all undocumented and public:
  `services.playground.ca/api/v1/poker/tournaments?start_date&end_date` (end
  EXCLUSIVE, ~7 weeks horizon; type 1 daily, 2 satellite, 5 series, 4 online
  skipped), `/api/v1/jackpots/{primary_bbj,omaha_bbj,high_stakes_bbj}` (both wrapped
  in `{data: ...}`), `cms.playground.ca/api/promotions` (poker category, filtered to
  live by publishAt/unpublishAt) and `/api/high-hand-promotions` (Markdown prose).
- Their CORS only allows www.playground.ca, hence the server-side fetch.
- Each section fails independently and keeps its copy from the live site,
  recorded in `stale`; the tab shows the data's age.
- Runs in the deploy workflow on every push **and daily at 10:00 UTC** (owner:
  once a morning). A `keepalive` job re-enables the workflow so GitHub's
  60-days-without-commits rule can't silently stop the refresh.
- Service worker: NetworkFirst for the data file only (not precached).
- Owner decisions: info only (no "log this tournament"), English, Playground only.

## Online tab (v0.3.0)
Read-only results of the **shared PokerStars account** (Kmpat), which nobody types
in. PokerEdge builds a summary after each session; the beast encrypts it and
commits it to this repo's orphan **`data` branch** as `online.enc.json`
(PokerEdge `tools/publish_summary.py`, fired by `pokeredge-publish.path` when a
sync lands, plus a 07:30 daily fallback).
- The app fetches it from `raw.githubusercontent.com` (CORS `*`), so a data update
  needs **no site redeploy** and the deploy workflow ignores the branch.
- Envelope: `{v, alg:'AES-256-GCM', kdf:'PBKDF2-SHA256', iter, salt, iv, ct,
  published_at}`; `ct` = ciphertext‖tag, exactly what WebCrypto wants, so no crypto
  library is bundled (`src/lib/online.js`). Only `published_at` is readable
  without the key.
- **Passphrase entered once per phone**, kept in the META store; the derived
  non-extractable `CryptoKey` is cached per salt so most opens skip the ~1s PBKDF2
  (`src/hooks/useOnline.js`). "Lock on this phone" removes both.
- Amounts are **USD shown as "US$"** and never mixed with the CAD live results.
- Views: Overview · Tournaments (history + detail sheet with satellite ↔ seat
  links) · My game (stats vs typical ranges, opening % by seat, stack depth, leak
  trends, tickets). The ranges ship in the file — the app has no poker knowledge.
- Service worker: NetworkFirst for the file, so the tab works offline from the
  last copy. `src/lib/online.fixture.json` was encrypted by PokerEdge's Python
  publisher, so the tests prove the phone opens what the beast sends.
- `VITE_ONLINE_URL` exists only for local test builds; production never sets it.

## Backup
Data is phone-only, so the Backup tab exports a JSON backup (restorable) and a
CSV (spreadsheet, NOT restorable) through the iOS share sheet. Nudge after 10
changed sessions. **Safari and the Home Screen app have separate storage on iOS**
— hence the "install first" banner.

## Commands
`npm run dev` · `npm test` · `npm run lint` · `npm run build` ·
`python3 tools/generate_icons.py` (icons are committed).

## Session log
### 2026-09-24 — v0.1.0 built
Built end to end on the beast. 14 unit tests, lint clean, driven in headless
Chromium at iPhone 13 size (start → rebuy → cash out, stats both formats, chart
tooltip, backup, edit) with no console errors and no horizontal overflow.
At build time it had not been tried on a real iPhone. **Later the same day the owner
confirmed it installed via Add to Home Screen and works on her iPhone** (share
sheet backup and the iOS pickers not specifically reported on).

### 2026-09-24 — polish + published
Polish pass (felt glow, chip logo, hero cards, gold buttons, calendar-tile rows,
tab-bar pill, slide-up sheet, shaded chart). Repo **Gigi404/PokerStats** created
(public), Pages enabled with build_type=workflow; live at
https://gigi404.github.io/PokerStats/ — verified 200s for page/manifest/sw/icon,
no console errors, service worker controls the page on reload. The first push
run was cancelled by the concurrency group (Pages was enabled a moment after the
push); the manual workflow_dispatch run deployed. Every push to main redeploys.

### 2026-09-24 — Playground tab (v0.2.0)
Data sources mapped by a research pass. Fetcher run live: 3 jackpots, High
Hand, 4 promos, 2 series (MSPT Oct 1-12, WSOP-C Nov), 122 tournaments. 21 unit
tests, lint clean, headless iPhone check incl. offline reload (jackpots still
shown). Home games stay as ordinary sessions (a few a year; owner: no
backfilling, forward only).

### 2026-09-24 — redirect repo, v0.2.0 shipped (wrap)
- **"It doesn't exist" on her phone** = GitHub's "There isn't a GitHub Pages site
  here" 404: Pages paths are case-sensitive (`/pokerstats/` 404s) and the bare
  `gigi404.github.io` had no site. Fixed with a separate public repo
  **`Gigi404/gigi404.github.io`** (beast: `~/dev/Apps/gigi404.github.io`) whose
  `index.html` and `404.html` are the same redirect to `/PokerStats/`, keeping any
  deep-link remainder. Verified in headless Chromium: bare domain, `/pokerstats`
  and `/pokerstats/` all land in the app. Side effect: the bare domain now belongs
  to PokerStats; a second Pages app would need that redirect revisited.
- v0.2.0 pushed (owner's OK); the Pages run ran the fetcher on GitHub with every
  section `ok`, and the live `data/playground.json` served 122 tournaments.
- **Not yet observed:** the first scheduled (06:00) run — only push-triggered
  runs so far — and her phone actually showing v0.2.0.
- Tried and replaced: remote edits through `ssh '…'` with nested heredocs broke on
  quoting twice (no damage); writing the script/commit message locally and
  `scp`-ing it works, as the Apps-level notes already say.

### 2026-10-06 — Online tab (v0.3.0)
Built from the laptop (first time this repo was cloned there; the beast's unpushed
09-24 wrap commit was pulled in first). See "Online tab" above; the PokerEdge side
is in PokerEdge's CLAUDE.md, session log 2026-10-05.
- 28 tests (7 new), lint clean. Checked in Chrome against the real summary
  encrypted under a throwaway passphrase: wrong passphrase rejected, all three
  views, the detail sheet and satellite links. Two bugs found that way: the detail
  sheet was invisible — `<main>`'s fade-up transform traps `position: fixed`
  children, so it is portalled to `<body>` — and the unlock form blanked while
  checking.
- `ProfitChart` gained optional `formatAmount` / `itemLabel` / `emptyText`; the
  Stats tab is unchanged.
- Pushed (`712825e`, with `b9a3ea3`), Pages deploy succeeded, live bundle serves
  v0.3.0; beast pulled level.
- **Not verified on a real iPhone.** The browser window would not shrink to
  phone width, so the check ran in the app's ~480px column.
- Gotcha: under Git Bash, `VITE_ONLINE_URL=/PokerStats/…` was rewritten to
  `C:/Program Files/Git/PokerStats/…`. Use `MSYS_NO_PATHCONV=1`.

### 2026-10-06 — Recent view and tournament review (v0.4.0)
`src/screens/OnlineReview.jsx`: Recent (the last 3 days played as cards, each
with a stats strip and an expandable "How we played" list of checks) and a
full-screen Review per tournament (result, stack graph, checks, key hands with
card chips). Online opens on Recent when the file has `recent_days`, else on
Overview. "Tournaments" renamed History; a recent tournament's sheet gets "Open
full review". A tournament started after midnight shows its weekday ("Sun
01:31"). The app judges nothing itself: verdicts, ranges and spreads come in the
file. Checked at a true 390px viewport (headless Chrome over the DevTools
protocol); not on a real iPhone. Schema stays 1: the new field is additive.

### 2026-10-08 — My game splits tournament stats by table size (v0.4.1)
"Your stats vs typical" has Full (7+ players, judged against the ranges),
Short (2–6, no verdict) and Cash columns, read from `play.tournament_full` /
`tournament_short`; older summaries fall back to the single column. Checked at
390px in headless Chrome against the real summary under a throwaway
passphrase; not on a real phone. The version bump first rewrote package.json's
line endings and a lockfile entry (a sed accident) — undone in `f40cfd9`.
Next (PokerEdge Phase 7a step 7): decision grades in the review and on My game.

## Rejected approaches
- Beast backend (Flask + SQLite): her iPhone would need Tailscale, plus the
  Doze-style tunnel drops seen on the Pixel. Revisit only as optional sync.
  (Still true 2026-10-06: online results reach the phone as an encrypted file on
  this repo instead.)
- Making this repo private (2026-10-06): free plan, so Pages would unpublish and
  her installed app would stop updating; a paid-plan Pages site is public anyway.
