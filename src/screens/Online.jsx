import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ProfitChart from '../components/ProfitChart.jsx'
import { Badge, Segmented, Tile, inputClass } from '../components/ui.jsx'
import useOnline from '../hooks/useOnline.js'
import {
  FORMAT_LABELS,
  band,
  formatPct,
  formatSignedUSD,
  formatUSD,
  monthLabel,
  outcomeLabel,
  tournamentCurve,
} from '../lib/online.js'
import { ageLabel } from '../lib/playground.js'
import Goal from './OnlineGoal.jsx'
import { ShortStack } from './OnlineGrades.jsx'
import { Recent, Review } from './OnlineReview.jsx'
import { formatDay } from '../lib/time.js'

const usdCents = (cents) => formatSignedUSD(cents / 100)

/** A signed USD amount, green up / red down; the sign is in the text too. */
function USD({ value, className = '' }) {
  const tone = value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-muted'
  return <span className={`num ${tone} ${className}`}>{formatSignedUSD(value)}</span>
}

/**
 * Online — the shared PokerStars account's results, sent automatically by
 * PokerEdge after each session. Read-only: nothing here is a session, nothing
 * is typed in, and the amounts are USD, kept apart from the CAD live results.
 */
export default function Online() {
  const online = useOnline()
  // Recent first: it is the "how did we play" view, the reason the tab exists.
  // Files published before the review existed have no recent_days — those
  // open on Overview instead.
  const [view, setView] = useState('recent')

  if (online.status === 'loading') {
    return <p className="py-16 text-center text-sm text-faint">Opening online results…</p>
  }
  if (online.status === 'locked') return <Unlock onUnlock={online.unlock} error={online.error} />
  if (online.status === 'error') {
    return (
      <div className="card p-5 text-sm">
        <div className="font-semibold">Online results aren&apos;t available right now</div>
        <p className="mt-1 text-muted">
          {online.error?.message?.includes('newer version')
            ? online.error.message
            : 'They load once the phone has signal, and are kept for offline after that.'}
        </p>
      </div>
    )
  }

  const { data } = online
  const hasRecent = Array.isArray(data.recent_days)
  const current = view === 'recent' && !hasRecent ? 'overview' : view
  return (
    <div className="space-y-4">
      <Segmented
        size="sm"
        value={current}
        onChange={setView}
        options={[
          ...(hasRecent ? [{ value: 'recent', label: 'Recent' }] : []),
          { value: 'overview', label: 'Overview' },
          { value: 'tournaments', label: 'History' },
          { value: 'game', label: 'My game' },
          // Files published before the bankroll existed have no `bankroll` key.
          ...('bankroll' in data ? [{ value: 'goal', label: 'Goal' }] : []),
        ]}
      />

      {current === 'recent' ? (
        <Recent days={data.recent_days} history={data.tournaments.history} />
      ) : current === 'overview' ? (
        <Overview data={data} />
      ) : current === 'goal' ? (
        <Goal bankroll={data.bankroll} />
      ) : current === 'tournaments' ? (
        <History data={data} />
      ) : (
        <MyGame data={data} />
      )}

      <p className="px-1 text-center text-xs text-faint">
        PokerStars · {data.meta.hero} · sent {ageLabel(online.publishedAt)}
        <br />
        Hands up to {formatDay(String(data.meta.data_through || '').slice(0, 10))} · amounts in US dollars
        <br />
        <button type="button" className="mt-2 text-faint underline" onClick={online.forget}>
          Lock on this phone
        </button>
      </p>
    </div>
  )
}

/** First open on a phone: ask for the passphrase once. */
function Unlock({ onUnlock, error }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!value) return
    setBusy(true)
    await onUnlock(value)
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="card-hero space-y-3 p-5">
      <div>
        <div className="text-lg font-semibold">Unlock online results</div>
        <p className="mt-1 text-sm text-muted">
          PokerStars results arrive here by themselves after each session. Enter the passphrase once. It stays on this
          phone and you won&apos;t be asked again.
        </p>
      </div>
      <input
        id="online-passphrase"
        type="password"
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={inputClass}
        placeholder="Passphrase"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Passphrase"
      />
      {error && <p className="text-sm text-loss">{error.message}</p>}
      <button type="submit" disabled={busy || !value} className="btn-gold w-full rounded-xl py-3 font-semibold disabled:opacity-50">
        {busy ? 'Unlocking…' : 'Unlock'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function Overview({ data }) {
  const t = data.tournaments.totals
  const points = useMemo(() => tournamentCurve(data.tournaments.history), [data])
  const formats = [...data.tournaments.by_format].sort((a, b) => b.net - a.net)

  return (
    <>
      <div className="card-hero p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">Tournaments · net</div>
        <USD value={t.net} className="mt-1 block text-[40px] leading-tight font-bold tracking-tight" />
        <div className="mt-1 text-sm text-muted">
          {t.n} tournaments · {formatUSD(t.buy_ins)} in · {formatUSD(t.prizes + t.bounties)} won
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile label="ROI">
          <span className={t.roi >= 0 ? 'text-gain' : 'text-loss'}>{formatPct(t.roi, { signed: true })}</span>
        </Tile>
        <Tile label="Paid a prize" sub={`${t.cashes} of ${t.n}`}>
          {formatPct((100 * t.cashes) / t.n)}
        </Tile>
        <Tile label="Bounties" sub={`${t.knockouts} knockouts`}>
          {formatUSD(t.bounties)}
        </Tile>
        <Tile label="Hands" sub={`${data.meta.hands.cash.toLocaleString('en-CA')} cash`}>
          {data.meta.hands.tournament.toLocaleString('en-CA')}
        </Tile>
      </div>

      <div className="card p-3.5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Running total</div>
        <ProfitChart points={points} formatAmount={usdCents} itemLabel="Tournament" emptyText="The chart appears after two tournaments." />
      </div>

      <Table
        title="By format"
        rows={formats.map((f) => ({ key: f.format, label: f.label, n: f.n, rate: formatPct(f.roi, { signed: true }), net: f.net }))}
        rateLabel="ROI"
      />
      <Table
        title="By month"
        rows={[...data.tournaments.by_month].reverse().map((m) => ({ key: m.month, label: monthLabel(m.month), n: m.n, rate: formatPct(m.roi, { signed: true }), net: m.net }))}
        rateLabel="ROI"
      />

      {data.cash.hands > 0 && (
        <div className="card p-3.5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Cash games</div>
          <div className="num flex items-baseline justify-between">
            <USD value={data.cash.net} className="text-xl font-semibold" />
            <span className="text-sm text-muted">{signed(data.cash.bb_per_100)} bb/100</span>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {data.cash.hands.toLocaleString('en-CA')} hands · last played {formatDay(String(data.cash.last_played).slice(0, 10), true)}
          </div>
        </div>
      )}

      <p className="px-1 text-xs text-faint">
        Prizes include bounties, tickets and satellite seats at face value. A tournament whose last hand was never
        saved counts as a bust.
      </p>
    </>
  )
}

/** Name · count · rate · net table, the same shape as the Stats tab's breakdowns. */
function Table({ title, rows, rateLabel }) {
  if (!rows.length) return null
  return (
    <div className="card p-3.5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">{title}</div>
      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-9" />
          <col className="w-16" />
          <col className="w-28" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-faint">
            <th className="pb-1.5 font-medium" />
            <th className="pb-1.5 text-right font-medium">#</th>
            <th className="pb-1.5 text-right font-medium">{rateLabel}</th>
            <th className="pb-1.5 text-right font-medium">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="truncate py-2 pr-2">{r.label}</td>
              <td className="py-2 text-right text-muted">{r.n}</td>
              <td className="py-2 text-right text-muted">{r.rate}</td>
              <td className="py-2 pl-2 text-right">
                <USD value={r.net} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tournament history
// ---------------------------------------------------------------------------

function History({ data }) {
  const [format, setFormat] = useState('')
  const [open, setOpen] = useState(null)
  const [review, setReview] = useState(null)
  const all = data.tournaments.history
  // Tournaments from the last days played carry a full review.
  const reviews = useMemo(
    () => Object.fromEntries((data.recent_days || []).flatMap((d) => d.tournaments.map((r) => [r.id, r]))),
    [data],
  )
  const byId = useMemo(() => Object.fromEntries(all.map((t) => [t.id, t])), [all])
  const formats = useMemo(() => [...new Set(all.map((t) => t.format))], [all])
  const rows = useMemo(() => all.filter((t) => !format || t.format === format).slice().reverse(), [all, format])

  return (
    <>
      <select
        id="online-format"
        className="w-full rounded-xl border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink"
        value={format}
        onChange={(e) => setFormat(e.target.value)}
        aria-label="Format"
      >
        <option value="">All formats ({all.length})</option>
        {formats.map((f) => (
          <option key={f} value={f}>
            {FORMAT_LABELS[f] || f} ({all.filter((t) => t.format === f).length})
          </option>
        ))}
      </select>

      <div className="card divide-y divide-white/5">
        {rows.map((t) => (
          <button key={t.id} type="button" onClick={() => setOpen(t)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{formatUSD(t.buy_in)}</span>
                <Badge>{FORMAT_LABELS[t.format] || t.format}</Badge>
                {t.seat_for && <Badge tone="accent">Seat won</Badge>}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {formatDay(t.start.slice(0, 10))} · {outcomeLabel(t)}
                {t.bounties > 0 && ` · ${formatUSD(t.bounties)} bounties`}
              </div>
            </div>
            {t.maybe_running ? <span className="text-xs text-faint">—</span> : <USD value={t.net} className="text-sm font-semibold" />}
          </button>
        ))}
      </div>

      {/* Portalled to <body>: the tab's <main> animates with a transform, which
          would trap a fixed-position sheet inside it (the session sheet avoids
          this by living in App, outside <main>). */}
      {open &&
        createPortal(
          <Detail
            t={open}
            byId={byId}
            onOpen={setOpen}
            onClose={() => setOpen(null)}
            onReview={reviews[open.id] ? () => { setReview(reviews[open.id]); setOpen(null) } : null}
          />,
          document.body,
        )}
      {review && createPortal(<Review review={review} entry={byId[review.id]} onClose={() => setReview(null)} />, document.body)}
    </>
  )
}

/** One tournament, as a bottom sheet. */
function Detail({ t, byId, onOpen, onClose, onReview }) {
  // Escape closes it on a computer; on the phone, tap outside or Close.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const sourceNote = {
    hand_history: 'Read from the hand history.',
    summary: 'Confirmed by a PokerStars tournament summary.',
    assumed_bust: 'The hand where this ended was never saved, so it counts as a bust.',
    manual: 'Entered by hand in PokerEdge.',
  }[t.source]
  const link = (id, text) =>
    byId[id] ? (
      <button type="button" className="text-accent underline" onClick={() => onOpen(byId[id])}>
        {text}
      </button>
    ) : (
      text
    )

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/50" onClick={onClose}>
      <div className="sheet-in pb-safe mx-auto w-full max-w-lg rounded-t-3xl border-t border-white/10 bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">
              {formatUSD(t.buy_in)} {FORMAT_LABELS[t.format] || t.format}
            </div>
            <div className="text-sm text-muted">
              {formatDay(t.start.slice(0, 10), true)} · {t.start.slice(11, 16)}–{t.end.slice(11, 16)} · {t.hands} hands
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">
            Close
          </button>
        </div>

        <dl className="num mt-4 space-y-1.5 text-sm">
          <Row label="Finish">{outcomeLabel(t)}</Row>
          <Row label="Buy-in">−{formatUSD(t.buy_in)}</Row>
          {t.prize > 0 && <Row label="Prize">{formatUSD(t.prize)}</Row>}
          {t.ticket && <Row label={t.seat_for ? 'Seat won' : 'Ticket won'}>{formatUSD(t.ticket.value)}</Row>}
          {t.bounties > 0 && <Row label="Bounties">{formatUSD(t.bounties)}</Row>}
          <div className="flex justify-between border-t border-white/5 pt-2 font-semibold">
            <dt>Net</dt>
            <dd>{t.net === null ? '—' : <USD value={t.net} />}</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-1 text-xs text-muted">
          {t.ticket && !t.seat_for && <p>{t.ticket.name}</p>}
          {t.seat_for && <p>Won a seat into {link(t.seat_for, `tournament #${t.seat_for}`)}.</p>}
          {t.seat_from && <p>Entered with a seat won in {link(t.seat_from, `satellite #${t.seat_from}`)}.</p>}
          {t.maybe_running && <p>This may still have been running when the results were sent.</p>}
          {sourceNote && <p>{sourceNote}</p>}
          <p className="text-faint">Tournament #{t.id}</p>
        </div>

        {onReview && (
          <button type="button" onClick={onReview} className="btn-gold mt-4 w-full rounded-xl py-3 font-semibold">
            Open full review
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// My game
// ---------------------------------------------------------------------------

const STAT_ROWS = [
  ['vpip', 'VPIP', 'Hands played voluntarily'],
  ['pfr', 'PFR', 'Hands raised before the flop'],
  ['three_bet', '3-bet', 'Re-raise when facing a raise'],
  ['wtsd', 'Went to showdown', 'Of flops played'],
  ['wsd', 'Won at showdown', 'Of showdowns'],
]
const BAND_STYLE = { low: 'text-accent', high: 'text-accent', ok: 'text-gain' }
const BAND_WORD = { low: 'low', high: 'high', ok: 'ok' }

function MyGame({ data }) {
  const { play, benchmarks } = data
  // Summaries since 2026-10-08 split tournament stats by table size: the
  // typical ranges describe full tables, so only those are judged, and
  // short-handed play (naturally looser) is shown beside them without a
  // verdict. Older summaries have one combined column.
  const split = play.tournament_full !== undefined
  const fullMin = play.full_table_min ?? 7
  const cols = split
    ? [
        { head: 'Full', sub: `${fullMin}+ players`, stats: play.tournament_full, ranges: benchmarks.tournament },
        { head: 'Short', sub: `2–${fullMin - 1}`, stats: play.tournament_short, ranges: null },
        { head: 'Cash', sub: '', stats: play.cash, ranges: benchmarks.cash },
      ]
    : [
        { head: 'Tourn.', sub: '', stats: play.tournament, ranges: benchmarks.tournament },
        { head: 'Cash', sub: '', stats: play.cash, ranges: benchmarks.cash },
      ]
  const colWidth = split ? 'w-[4.5rem]' : 'w-24'
  return (
    <>
      <div className="card p-3.5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Your stats vs typical</div>
        <table className="num w-full table-fixed text-sm">
          <colgroup>
            <col />
            {cols.map((c) => <col key={c.head} className={colWidth} />)}
          </colgroup>
          <thead>
            <tr className="text-left text-xs text-faint">
              <th className="pb-1.5 font-medium" />
              {cols.map((c) => (
                <th key={c.head} className="pb-1.5 text-right font-medium">
                  <div>{c.head}</div>
                  {c.sub && <div className="text-[10px] font-normal">{c.sub}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {STAT_ROWS.map(([k, label, hint]) => (
              <tr key={k}>
                <td className="py-2 pr-2">
                  <div>{label}</div>
                  <div className="text-[11px] text-faint">{hint}</div>
                </td>
                {cols.map((c) => (
                  <StatCell key={c.head} value={c.stats?.[k] ?? null} range={c.ranges?.[k]} />
                ))}
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-2">
                <div>Win rate</div>
                <div className="text-[11px] text-faint">bb per 100 hands (tournaments in chips)</div>
              </td>
              {cols.map((c) => {
                const v = c.stats?.bb_per_100 ?? null
                return (
                  <td key={c.head} className={`py-2 text-right ${v === null ? '' : v >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {v === null ? '—' : signed(v)}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-faint">
          Typical ranges are rough guides for small stakes. Outside the range is worth a look, not proof of a mistake.
          {split && ' They describe full tables, so short-handed play is shown without a verdict — playing looser there is normal.'}
        </p>
      </div>

      <OpenBySeat open={play.open_by_seat} ranges={benchmarks.open_by_seat} />

      <div className="card p-3.5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">By stack size · tournaments</div>
        <table className="num w-full table-fixed text-sm">
          <thead>
            <tr className="text-left text-xs text-faint">
              <th className="pb-1.5 font-medium">Stack</th>
              <th className="pb-1.5 text-right font-medium">Hands</th>
              <th className="pb-1.5 text-right font-medium">bb/100</th>
              <th className="pb-1.5 text-right font-medium">Re-shove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {play.by_depth.map((d) => (
              <tr key={d.key}>
                <td className="py-2">{d.label}</td>
                <td className="py-2 text-right text-muted">{d.hands.toLocaleString('en-CA')}</td>
                <td className={`py-2 text-right ${d.bb_per_100 >= 0 ? 'text-gain' : 'text-loss'}`}>{signed(d.bb_per_100)}</td>
                <td className="py-2 text-right text-muted">{formatPct(d.reshove.pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-faint">Re-shove: 3-bet or all-in when someone raised first, outside the big blind.</p>
      </div>

      <ShortStack s={play.short_stack} />

      <Trends trends={play.trends} ranges={benchmarks.open_by_seat} />
      <Tickets tickets={data.tournaments.tickets} />
    </>
  )
}

function signed(v) {
  if (v === null || v === undefined) return '—'
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 10) / 10)}`
}

function StatCell({ value, range }) {
  const b = band(value, range)
  return (
    <td className="py-2 text-right align-top">
      <div>{value === null || value === undefined ? '—' : `${value}%`}</div>
      {b && (
        <div className={`text-[11px] ${BAND_STYLE[b]}`}>
          {BAND_WORD[b]} · {range[0]}–{range[1]}
        </div>
      )}
    </td>
  )
}

/** Opening % per seat as a dot on a 0–55% track, the typical range shaded. */
function OpenBySeat({ open, ranges }) {
  const MAX = 55
  const x = (v) => `${(Math.min(v, MAX) / MAX) * 100}%`
  return (
    <div className="card p-3.5">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Opening raise by seat</div>
      <p className="mb-3 text-[11px] text-faint">First in, regular tables. Shaded: typical range.</p>
      <div className="space-y-3">
        {Object.entries(open).map(([seat, o]) => {
          const r = ranges[seat]
          const b = band(o.pct, r)
          return (
            <div key={seat} className="flex items-center gap-3">
              <div className="w-9 text-xs font-semibold text-muted">{seat}</div>
              <div className="relative h-5 flex-1">
                <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
                {r && <div className="absolute top-0.5 bottom-0.5 rounded bg-white/10" style={{ left: x(r[0]), width: `calc(${x(r[1])} - ${x(r[0])})` }} />}
                {o.pct !== null && (
                  <div
                    className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${b === 'ok' ? 'bg-gain' : 'bg-accent'}`}
                    style={{ left: x(o.pct) }}
                  />
                )}
              </div>
              <div className="num w-11 text-right text-sm">{formatPct(o.pct)}</div>
            </div>
          )
        })}
      </div>
      <div className="num mt-1 flex justify-between pl-12 pr-14 text-[10px] text-faint">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
      </div>
    </div>
  )
}

/** The leaks being worked on, month by month. Thin months are faded. */
function Trends({ trends, ranges }) {
  const rows = trends.slice(-6).reverse()
  const cell = (o, range) => {
    if (!o || o.pct === null) return <td className="py-2 text-right text-faint">—</td>
    const thin = o.spots < 20
    const b = band(o.pct, range)
    return (
      <td className={`py-2 text-right ${thin ? 'text-faint' : b === 'ok' ? 'text-gain' : ''}`} title={`${o.spots} spots`}>
        {formatPct(o.pct)}
      </td>
    )
  }
  return (
    <div className="card p-3.5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Leaks to fix · by month</div>
      <table className="num w-full table-fixed text-sm">
        <thead>
          <tr className="text-left text-xs text-faint">
            <th className="pb-1.5 font-medium" />
            <th className="pb-1.5 text-right font-medium">BTN open</th>
            <th className="pb-1.5 text-right font-medium">SB open</th>
            <th className="pb-1.5 text-right font-medium">Re-shove</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((m) => (
            <tr key={m.month}>
              <td className="py-2">{monthLabel(m.month)}</td>
              {cell(m.btn_open, ranges.BTN)}
              {cell(m.sb_open, ranges.SB)}
              {cell(m.reshove_10_20, null)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-faint">
        Goals: button {ranges.BTN[0]}–{ranges.BTN[1]}%, small blind {ranges.SB[0]}–{ranges.SB[1]}%. Re-shove is at 10–20 big blinds. Months
        with fewer than 20 chances are faded.
      </p>
    </div>
  )
}

function Tickets({ tickets }) {
  if (!tickets.length) return null
  const STATUS = { used: 'Used', unused: 'Not used yet', unknown: 'Check in PokerStars' }
  return (
    <div className="card p-3.5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Tickets and seats won</div>
      <div className="divide-y divide-white/5">
        {[...tickets].reverse().map((t) => (
          <div key={t.won_in} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div className="min-w-0">
              <div className="truncate">{t.name.startsWith('Entry to tournament') ? `Seat · ${formatUSD(t.value)} event` : t.name}</div>
              <div className="text-xs text-faint">{formatDay(t.date, true)}</div>
            </div>
            <span className={`shrink-0 text-xs ${t.status === 'unused' ? 'text-accent' : 'text-faint'}`}>{STATUS[t.status]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
