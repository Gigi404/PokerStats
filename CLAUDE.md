# PokerStats

A results tracker for live (and online) poker — cash games and tournaments —
built for the owner's girlfriend's **iPhone**. Installed from Safari via
Share → Add to Home Screen. Started 2026-09-24.

## Architecture
- **Frontend only.** React 19 + Vite 7 + Tailwind 4 + vite-plugin-pwa. No backend,
  no network calls: every session lives in **IndexedDB on her phone**
  (`src/lib/db.js`, raw API, pattern copied from Ritual).
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
**Not yet verified on a real iPhone** — share sheet, Add to Home Screen, iOS
date/time pickers, safe areas.

## Rejected approaches
- Beast backend (Flask + SQLite): her iPhone would need Tailscale, plus the
  Doze-style tunnel drops seen on the Pixel. Revisit only as optional sync.
