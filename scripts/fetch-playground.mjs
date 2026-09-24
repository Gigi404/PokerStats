#!/usr/bin/env node
/*
  Fetch Playground Poker Club's public data into public/data/playground.json.

  Runs in GitHub Actions every morning (and on every deploy), never in the
  browser: Playground's servers only allow cross-origin requests from
  www.playground.ca, so the phone cannot ask them directly. The app reads the
  file this script writes, which ships with the site and is cached for offline.

  Sources (none documented, all public, no key; mapped 2026-09-24):
    tournaments  services.playground.ca/api/v1/poker/tournaments?start_date&end_date
                 (end_date is EXCLUSIVE; horizon is ~7 weeks ahead)
    jackpots     services.playground.ca/api/v1/jackpots/{primary_bbj,omaha_bbj,high_stakes_bbj}
    promotions   cms.playground.ca/api/promotions?where[category][equals]=poker
    high hand    cms.playground.ca/api/high-hand-promotions (the active one's text)

  Resilience: every section is fetched on its own. A section that fails keeps
  its value from the previously published file (PREV_URL) and records how old
  that copy is, so one broken endpoint never blanks the whole tab — and the app
  can say "jackpots from 3 days ago" instead of pretending they are fresh.

  Polite by design: one run a day, a handful of requests.

  Usage: node scripts/fetch-playground.mjs [outFile]
*/

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const OUT = process.argv[2] || 'public/data/playground.json'
const PREV_URL = process.env.PREV_URL || 'https://gigi404.github.io/PokerStats/data/playground.json'
const API = 'https://services.playground.ca/api/v1'
const CMS = 'https://cms.playground.ca/api'
const SITE = 'https://www.playground.ca'
const HORIZON_DAYS = 50

// Playground's tournament `type` codes, read from their site's code.
// 4 (online) is left out: this tab is about the room.
const KINDS = { 1: 'daily', 2: 'satellite', 5: 'series' }

const JACKPOTS = [
  { key: 'primary_bbj', label: 'Bad Beat Jackpot' },
  { key: 'omaha_bbj', label: 'Omaha Bad Beat' },
  { key: 'high_stakes_bbj', label: 'High Stakes Bad Beat' },
]

/** GET a JSON document with a timeout; throws on anything but a 2xx. */
async function getJSON(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'PokerStats personal app (daily)' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

/** 'YYYY-MM-DD' in Montréal time — the room's calendar, whatever the runner's timezone. */
function montrealDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montreal' }).format(date)
}

function addDays(key, days) {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return Number.isFinite(n) ? n : null
}

// ---------------------------------------------------------------- sections

async function fetchTournaments(today) {
  const url = `${API}/poker/tournaments?start_date=${today}&end_date=${addDays(today, HORIZON_DAYS)}`
  const body = await getJSON(url)
  if (!Array.isArray(body?.data)) throw new Error('tournaments: unexpected shape')

  const rows = body.data
    .filter((r) => r.published && KINDS[r.type])
    .map((r) => ({
      id: r.id,
      date: r.start_date,
      time: r.start_time,
      start: r.start_at,
      // One real row had an empty English name; fall back rather than show a blank line.
      name: (r.name_en || '').trim() || (r.name_fr || '').trim() || 'Tournament',
      kind: KINDS[r.type],
      buyIn: num(r.price),
      guarantee: num(r.guarantee_amount) || null,
      seats: num(r.guarantee_seats) || null,
      series: r.event_keyword || null,
      seriesName: r.event_name || null,
      event: r.event_number || null,
      target: (r.target_en || '').trim() || null,
    }))
    .sort((a, b) => (a.start < b.start ? -1 : 1))

  // An empty schedule seven weeks out is far more likely a broken feed than an
  // empty room; treat it as a failure so the last good copy is kept.
  if (!rows.length) throw new Error('tournaments: empty schedule')
  return rows
}

/** Series in the window, built from the tournaments that carry a series keyword. */
function buildSeries(tournaments, promotions) {
  const groups = new Map()
  for (const t of tournaments) {
    if (t.kind !== 'series' || !t.series) continue
    const g = groups.get(t.series) || {
      key: t.series,
      name: t.seriesName || t.series,
      start: t.date,
      end: t.date,
      events: new Set(),
      mainGuarantee: 0,
    }
    if (t.date < g.start) g.start = t.date
    if (t.date > g.end) g.end = t.date
    if (t.event) g.events.add(t.event)
    g.mainGuarantee = Math.max(g.mainGuarantee, t.guarantee || 0)
    groups.set(t.series, g)
  }
  return [...groups.values()]
    .map((g) => ({
      ...g,
      events: g.events.size,
      mainGuarantee: g.mainGuarantee || null,
      // The CMS promo for a series links to its page; match on the keyword when it lines up.
      url: promotions.find((p) => p.url.includes(g.key))?.url || `${SITE}/poker/tournament-calendar`,
    }))
    .sort((a, b) => (a.start < b.start ? -1 : 1))
}

async function fetchJackpots() {
  const out = []
  for (const j of JACKPOTS) {
    // Same {type, code, message, data} envelope as the tournaments endpoint.
    const body = (await getJSON(`${API}/jackpots/${j.key}`))?.data
    const amount = num(body?.amount)
    if (amount === null) throw new Error(`jackpot ${j.key}: no amount`)
    out.push({
      key: j.key,
      label: j.label,
      amount,
      qualifying: body.min_qualifying_hand || null,
      lastHit: body.last_hit_at ? body.last_hit_at.slice(0, 10) : null,
      tables: num(body.tables_count),
      // The main BBJ also publishes how a hit is split; the others don't.
      loserShare: num(body.winner_share),
      winnerShare: num(body.hand_winner_share),
      tableShare: num(body.table_share),
    })
  }
  return out
}

async function fetchPromotions(now) {
  const body = await getJSON(
    `${CMS}/promotions?locale=en&limit=200&sort=_order&depth=0&where[category][equals]=poker`,
  )
  if (!Array.isArray(body?.docs)) throw new Error('promotions: unexpected shape')
  const iso = now.toISOString()
  // The CMS also returns expired and scheduled promos; keep only what is live today.
  return body.docs
    .filter((p) => p._status !== 'draft')
    .filter((p) => (!p.publishAt || p.publishAt <= iso) && (!p.unpublishAt || p.unpublishAt > iso))
    .map((p) => ({
      key: p.key,
      title: (p.title || '').trim(),
      blurb: (p.content || '').trim(),
      url: p.url ? new URL(p.url, SITE).href : SITE,
      until: p.unpublishAt ? p.unpublishAt.slice(0, 10) : null,
    }))
}

/**
 * The active High Hand promotion, reduced to what fits on a phone: hours,
 * payout lines and the minimum hand. The CMS only has it as Markdown prose, so
 * this reads it line by line and keeps anything it recognises.
 */
async function fetchHighHand() {
  const body = await getJSON(`${CMS}/high-hand-promotions?locale=en&limit=50&depth=1`)
  const doc = (body?.docs || []).find((d) => d.promotionStatus === 'active')
  if (!doc) return null
  const strip = (s) => s.replace(/\*\*|#+\s*/g, '').trim()
  const blocks = doc.layout || []
  const text = blocks.map((b) => [b.text, b.content, b.rulesList].filter(Boolean).join('\n')).join('\n')
  const lines = text.split('\n').map(strip).filter(Boolean)
  const minHand = text.match(/minimum qualifying hand is\s*\**\s*([AKQJT2-9]{4,5})/i)?.[1] || null
  return {
    title: strip(blocks.find((b) => b.blockType === 'titleSection')?.title || doc.name || 'High Hand'),
    hours: lines.filter((l) => /^(day|night)\s*:/i.test(l)),
    // Payout amounts only from the "smallInfo" block: other blocks (Titan
    // Tuesday) mention dollar amounts too, and mixing them in would read as
    // the wrong schedule.
    payouts: (blocks.find((b) => b.sectionKey === 'smallInfo')?.content || '')
      .split('\n')
      .map(strip)
      .filter((l) => /^\$\d/.test(l)),
    minHand,
    url: `${SITE}/promotions/poker/${doc.slug || ''}`.replace(/\/$/, ''),
  }
}

// ---------------------------------------------------------------- main

async function main() {
  const now = new Date()
  const today = montrealDay(now)

  let prev = null
  try {
    prev = await getJSON(PREV_URL)
  } catch {
    console.log('No previous copy (first run, or the site is down) — continuing without a fallback.')
  }

  const out = { version: 1, fetchedAt: now.toISOString(), stale: {} }

  /** Run one section; on failure keep the previous copy and note its age. */
  async function section(name, run) {
    try {
      out[name] = await run()
      console.log(`ok   ${name}`)
    } catch (err) {
      console.log(`::warning::playground ${name} failed: ${err.message}`)
      out[name] = prev?.[name] ?? null
      if (out[name] !== null) out.stale[name] = prev.stale?.[name] || prev.fetchedAt
    }
  }

  await section('jackpots', fetchJackpots)
  await section('promotions', () => fetchPromotions(now))
  await section('highHand', fetchHighHand)
  await section('tournaments', () => fetchTournaments(today))

  // A kept copy of the schedule still drops anything already in the past.
  if (Array.isArray(out.tournaments)) out.tournaments = out.tournaments.filter((t) => t.date >= today)
  out.series = buildSeries(out.tournaments || [], out.promotions || [])
  // Series promos get their own cards from the schedule; don't list them twice.
  if (Array.isArray(out.promotions)) out.promotions = out.promotions.filter((p) => !p.url.includes('/poker/tournaments/'))

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(out))
  const t = out.tournaments?.length ?? 0
  console.log(`wrote ${OUT}: ${t} tournaments, ${out.series.length} series, ${out.promotions?.length ?? 0} promos, stale: ${Object.keys(out.stale).join(', ') || 'none'}`)
}

main().catch((err) => {
  // Only reached on a bug in this script, not on a Playground outage (sections catch those).
  console.error(err)
  process.exit(1)
})
