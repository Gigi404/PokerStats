import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '../components/ui.jsx'
import { FORMAT_LABELS, formatSignedUSD, formatUSD, outcomeLabel } from '../lib/online.js'
import { formatDay } from '../lib/time.js'

/*
  The review half of the Online tab: the last few days played, day by day,
  and a full review of each tournament in them.

  Everything judged here comes from PokerEdge's summary (core/day_review.py),
  which states for every number: its sample (`spots`), the typical range (the
  verdict) and this player's usual day-to-day spread (the context). The app
  only displays those judgements — it has no poker rules of its own.
*/

const title = 'mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint'

function USD({ value, className = '' }) {
  const tone = value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-muted'
  return <span className={`num ${tone} ${className}`}>{formatSignedUSD(value)}</span>
}

const signed = (v, digits = 1) => {
  if (v === null || v === undefined) return '—'
  const r = Math.round(v * 10 ** digits) / 10 ** digits
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}`
}

// ---------------------------------------------------------------------------
// Recent: one card per play day
// ---------------------------------------------------------------------------

/**
 * @param {{days: object[], history: object[]}} props  summary.recent_days and
 *   summary.tournaments.history (for each tournament's header facts)
 */
export function Recent({ days, history }) {
  const [open, setOpen] = useState(null) // { review, entry }
  const byId = Object.fromEntries(history.map((t) => [t.id, t]))

  if (!days?.length) {
    return <p className="py-10 text-center text-sm text-faint">No tournaments played yet.</p>
  }

  return (
    <>
      <p className="px-1 text-xs text-faint">
        Your last {days.length} days of play. Each number is judged twice: against the typical range (are we playing
        right?) and against your own usual days (was today different?).
      </p>
      {days.map((d) => (
        <Day key={d.date} day={d} byId={byId} onOpen={(review) => setOpen({ review, entry: byId[review.id] })} />
      ))}
      {open && createPortal(<Review review={open.review} entry={open.entry} onClose={() => setOpen(null)} />, document.body)}
    </>
  )
}

function Day({ day, byId, onOpen }) {
  const [showChecks, setShowChecks] = useState(false)
  const t = day.totals
  const flagged = day.checks.filter((c) => c.verdict && c.verdict !== 'ok').length
  return (
    <section className="card overflow-hidden">
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-semibold">{formatDay(day.date)}</div>
          <USD value={t.net} className="text-lg font-semibold" />
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {t.tournaments} tournament{t.tournaments === 1 ? '' : 's'} · {formatUSD(t.buy_ins)} in
          {t.bounties > 0 && ` · ${formatUSD(t.bounties)} bounties`} · {day.stats.hands} hands
        </div>
        <StatStrip stats={day.stats} />
      </div>

      <button
        type="button"
        onClick={() => setShowChecks((v) => !v)}
        className="flex w-full items-center justify-between border-t border-white/5 px-4 py-3 text-left text-sm active:bg-surface-2"
        aria-expanded={showChecks}
      >
        <span className="font-semibold">How we played</span>
        <span className="text-xs text-muted">
          {flagged ? `${flagged} to look at` : 'nothing flagged'} {showChecks ? '▴' : '▾'}
        </span>
      </button>
      {showChecks && (
        <div className="border-t border-white/5 px-4 py-3">
          <Checks checks={day.checks} />
        </div>
      )}

      <div className="divide-y divide-white/5 border-t border-white/5">
        {day.tournaments.map((r) => {
          const e = byId[r.id]
          if (!e) return null
          return (
            <button key={r.id} type="button" onClick={() => onOpen(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{formatUSD(e.buy_in)}</span>
                  <Badge>{FORMAT_LABELS[e.format] || e.format}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {startLabel(e.start, day.date)} · {outcomeLabel(e)} · {r.key_hands.length} key hand{r.key_hands.length === 1 ? '' : 's'}
                </div>
              </div>
              {e.maybe_running ? <span className="text-xs text-faint">—</span> : <USD value={e.net} className="text-sm font-semibold" />}
              <span className="text-faint" aria-hidden="true">›</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Start time within a play day. A day runs 06:00–06:00, so a tournament started
 * at 01:30 belongs to the night before — say which calendar day it really was.
 */
function startLabel(start, dayDate) {
  const time = start.slice(11, 16)
  if (start.slice(0, 10) === dayDate) return time
  const weekday = new Date(`${start.slice(0, 10)}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'short' })
  return `${weekday} ${time}`
}

/** VPIP · PFR · 3-bet · bb/100 in one compact row. */
function StatStrip({ stats }) {
  const items = [
    ['VPIP', stats.vpip === null ? '—' : `${stats.vpip}%`],
    ['PFR', stats.pfr === null ? '—' : `${stats.pfr}%`],
    ['3-bet', stats.three_bet === null ? '—' : `${stats.three_bet}%`],
    ['bb/100', signed(stats.bb_per_100)],
  ]
  return (
    <div className="num mt-3 grid grid-cols-4 gap-2 text-center">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl bg-surface-2 px-1 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">{k}</div>
          <div className="text-sm font-semibold">{v}</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const VERDICT = {
  ok: { text: 'on target', cls: 'text-gain border-gain/40' },
  low: { text: 'too low', cls: 'text-accent border-accent/40' },
  high: { text: 'too high', cls: 'text-accent border-accent/40' },
}
const USUAL = { below: 'below your usual', usual: 'your usual', above: 'above your usual' }

/** The leak checks for a day or a tournament, grouped as PokerEdge groups them. */
export function Checks({ checks }) {
  const groups = []
  for (const c of checks) {
    let g = groups.find((x) => x.name === c.group)
    if (!g) groups.push((g = { name: c.group, items: [] }))
    g.items.push(c)
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.name}>
          <div className={title}>{g.name}</div>
          <div className="space-y-2.5">
            {g.items.map((c) => (
              <Check key={c.key} c={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Check({ c }) {
  const [open, setOpen] = useState(false)
  const value = c.value === null ? '—' : c.unit === 'count' ? String(c.value) : `${Math.round(c.value)}%`
  const v = VERDICT[c.verdict]
  const hasExamples = c.examples.length > 0
  const target = c.range ? (c.unit === 'count' ? `target ${c.range[1]}` : `target ${c.range[0]}–${c.range[1]}%`) : null
  return (
    <div className="text-sm">
      <button
        type="button"
        disabled={!hasExamples}
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-start justify-between gap-3 text-left disabled:cursor-default"
        aria-expanded={hasExamples ? open : undefined}
      >
        <div className="min-w-0">
          <div>{c.label}</div>
          <div className="text-[11px] text-faint">
            {c.thin
              ? `only ${c.spots} chance${c.spots === 1 ? '' : 's'} — too few to judge`
              : [c.unit === 'count' ? `in ${c.spots} short-stack hands` : `${c.spots} chances`, target, c.spread && `you usually ${c.spread[0]}–${c.spread[1]}%`]
                  .filter(Boolean)
                  .join(' · ')}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num font-semibold">{value}</div>
          <div className="mt-0.5 flex flex-col items-end gap-0.5">
            {v && <span className={`rounded-full border px-1.5 text-[10px] font-semibold ${v.cls}`}>{v.text}</span>}
            {c.vs_usual && <span className="text-[10px] text-muted">{USUAL[c.vs_usual]}</span>}
          </div>
        </div>
      </button>
      {open && hasExamples && (
        <div className="mt-2 rounded-xl bg-surface-2 p-2.5">
          <div className="mb-1.5 text-[11px] text-faint">{c.examples_label}:</div>
          <div className="flex flex-wrap gap-1.5">
            {c.examples.map((e) => (
              <span key={e.hand_id} className="num inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs">
                <Cards cards={e.cards} small />
                <span className="text-faint">
                  {e.seat} · {e.stack_bb}bb
                </span>
              </span>
            ))}
            {c.more_examples > 0 && <span className="px-1 py-1 text-xs text-faint">+{c.more_examples} more</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// One tournament, full screen
// ---------------------------------------------------------------------------

export function Review({ review, entry, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // The page behind must not scroll under the review on iOS.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-bg" role="dialog" aria-modal="true" aria-label="Tournament review">
      <div className="pt-safe pb-safe mx-auto max-w-lg px-4 pb-10">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-bg/90 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">
              {formatUSD(entry.buy_in)} {FORMAT_LABELS[entry.format] || entry.format}
            </div>
            <div className="text-xs text-muted">
              {formatDay(entry.start.slice(0, 10))} · {entry.start.slice(11, 16)}–{entry.end.slice(11, 16)} · {outcomeLabel(entry)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div className="card-hero p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">Result</div>
              {entry.net === null || entry.maybe_running ? <span className="text-sm text-faint">not final</span> : <USD value={entry.net} className="text-2xl font-bold" />}
            </div>
            <div className="mt-1 text-sm text-muted">
              Buy-in {formatUSD(entry.buy_in)}
              {entry.prize > 0 && ` · prize ${formatUSD(entry.prize)}`}
              {entry.ticket && ` · ${entry.seat_for ? 'seat' : 'ticket'} ${formatUSD(entry.ticket.value)}`}
              {entry.bounties > 0 && ` · bounties ${formatUSD(entry.bounties)}`}
            </div>
            <StatStrip stats={review.stats} />
          </div>

          <div className="card p-3.5">
            <div className={title}>Your stack · big blinds</div>
            <StackChart values={review.stack_bb} />
          </div>

          <div className="card p-3.5">
            <div className={title}>How we played</div>
            <Checks checks={review.checks} />
          </div>

          <div>
            <div className={`${title} px-1`}>Key hands</div>
            {review.key_hands.length === 0 ? (
              <p className="card p-4 text-sm text-faint">No big pots, all-ins or knockouts in this one.</p>
            ) : (
              <div className="space-y-2">
                {review.key_hands.map((h) => (
                  <Hand key={h.hand_id} h={h} />
                ))}
              </div>
            )}
          </div>
          <p className="px-1 text-[11px] text-faint">
            Key hands show what happened, not whether it was right. Grading each decision comes with the equity
            engine.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Stack in big blinds over the tournament, one point per hand played. */
function StackChart({ values }) {
  if (!values || values.length < 2) return <p className="py-6 text-center text-sm text-faint">Too few hands to draw.</p>
  const W = 320
  const H = 120
  const pad = { l: 30, r: 6, t: 8, b: 16 }
  const max = Math.max(...values, 1)
  const x = (i) => pad.l + (i / (values.length - 1)) * (W - pad.l - pad.r)
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = `${line}L${x(values.length - 1).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`
  const ticks = [0, Math.round(max / 2), Math.round(max)]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Stack from ${values[0]} to ${values.at(-1)} big blinds over ${values.length - 1} hands`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" strokeDasharray={t ? '2 4' : undefined} />
          <text x={pad.l - 5} y={y(t) + 3.5} textAnchor="end" fontSize="9" fill="var(--color-faint)">
            {t}
          </text>
        </g>
      ))}
      <path d={area} fill="var(--color-accent)" fillOpacity="0.12" />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinejoin="round" />
      <text x={pad.l} y={H - 3} fontSize="9" fill="var(--color-faint)">
        start {values[0]}bb
      </text>
      <text x={W - pad.r} y={H - 3} textAnchor="end" fontSize="9" fill="var(--color-faint)">
        {values.length - 1} hands
      </text>
    </svg>
  )
}

const TAG_STYLE = {
  bust: 'bg-loss/15 text-loss',
  knockout: 'bg-gain/15 text-gain',
  'big win': 'bg-gain/15 text-gain',
  'big loss': 'bg-loss/15 text-loss',
  'all-in': 'bg-accent/15 text-accent',
}

function Hand({ h }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Cards cards={h.cards} />
            {h.tags.map((t) => (
              <span key={t} className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${TAG_STYLE[t] || 'bg-surface-2 text-muted'}`}>
                {t}
              </span>
            ))}
          </div>
          <div className="mt-1 text-[11px] text-faint">
            {h.time} · blinds {h.blinds} · {h.seat} · {h.stack_bb}bb
          </div>
        </div>
        <div className={`num shrink-0 text-sm font-semibold ${h.net_bb > 0 ? 'text-gain' : h.net_bb < 0 ? 'text-loss' : 'text-muted'}`}>
          {signed(h.net_bb)}bb
        </div>
      </div>

      <div className="mt-2.5 space-y-1 text-[13px]">
        {h.streets.map((s) => (
          <div key={s.street} className="flex gap-2">
            <span className="w-11 shrink-0 text-[11px] uppercase tracking-wide text-faint">{s.street === 'preflop' ? 'Pre' : s.street}</span>
            <span className="min-w-0 text-muted">{s.actions.join(' · ')}</span>
          </div>
        ))}
      </div>

      {(h.board.length > 0 || h.shown.length > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/5 pt-2.5 text-[11px] text-faint">
          {h.board.length > 0 && (
            <span className="inline-flex items-center gap-1">
              Board <Cards cards={h.board.join(' ')} small />
            </span>
          )}
          {h.shown.map((s) => (
            <span key={s.seat + s.cards} className="inline-flex items-center gap-1">
              {s.seat} showed <Cards cards={s.cards} small />
            </span>
          ))}
          <span className="num">Pot {h.pot_bb}bb</span>
        </div>
      )}
    </div>
  )
}

const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' }

/** "Jd Jh" → two little cards; hearts and diamonds in red. */
function Cards({ cards, small = false }) {
  const list = String(cards || '').split(/[\s,]+/).filter(Boolean)
  if (!list.length) return <span className="text-faint">??</span>
  return (
    <span className="inline-flex gap-0.5">
      {list.map((c, i) => {
        const rank = c.slice(0, -1).replace('T', '10')
        const suit = c.slice(-1).toLowerCase()
        const red = suit === 'h' || suit === 'd'
        return (
          <span
            key={c + i}
            className={`num inline-flex items-center justify-center rounded border border-black/10 bg-[#f4f1e8] font-bold leading-none ${
              small ? 'h-5 min-w-[1.25rem] px-0.5 text-[10px]' : 'h-7 min-w-[1.75rem] px-1 text-[13px]'
            } ${red ? 'text-[#c0392b]' : 'text-[#111]'}`}
          >
            {rank}
            {SUIT[suit] || suit}
          </span>
        )
      })}
    </span>
  )
}
