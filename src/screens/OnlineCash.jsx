import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ProfitChart from '../components/ProfitChart.jsx'
import { Badge, Segmented, Tile } from '../components/ui.jsx'
import { STAT_ROWS, formatSignedUSD, monthLabel, signed } from '../lib/online.js'
import { cashCurve, cashMonth, minutesLabel, rateLabel, stakesLabel } from '../lib/cash.js'
import { formatDay } from '../lib/time.js'
import BBDefence from './OnlineBBDefence.jsx'
import FlopHabits from './OnlineFlop.jsx'
import Postflop from './OnlinePostflop.jsx'
import RiverChoice from './OnlineRiverChoice.jsx'
import CashReview from './OnlineCashReview.jsx'
import { gradeTone } from '../lib/recap.js'
import { Row, StatCell, Table, USD } from './Online.jsx'

/*
  Cash — the Online tab's second half (owner, 2026-11-15: "cash games need
  to be there, separated from tournaments"). Everything here is real-money
  cash only, from PokerEdge's `cash` block (core/cash_sessions.py) and the
  cash halves of the play cards. A session is hero's hands with no gap over
  30 minutes, every table at once.

  Files published before 2026-11-15 carry no `cash.sessions`: the totals and
  My game still show, and the session views say they arrive with the next file.
*/

const title = 'mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const GRADE_TEXT = { gain: 'text-gain', loss: 'text-loss', accent: 'text-accent', muted: 'text-muted' }

/** @param {{data: object}} props  the decrypted online summary */
export default function Cash({ data }) {
  const [view, setView] = useState('recent')
  const [open, setOpen] = useState(null)
  // The session whose full review is open (a row of cash.sessions with `review`).
  const [review, setReview] = useState(null)
  const sessions = data.cash.sessions

  return (
    <>
      <Segmented
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: 'recent', label: 'Recent' },
          { value: 'sessions', label: 'Sessions' },
          { value: 'stakes', label: 'Stakes' },
          { value: 'game', label: 'My game' },
          { value: 'charts', label: 'Charts' },
        ]}
      />

      {view === 'game' ? (
        <CashGame data={data} />
      ) : !sessions ? (
        <div className="card p-5 text-sm text-muted">Cash sessions arrive with the next results PokerEdge sends.</div>
      ) : view === 'recent' ? (
        <Recent cash={data.cash} onOpen={setOpen} onReview={setReview} />
      ) : view === 'sessions' ? (
        <SessionList sessions={sessions} onOpen={setOpen} />
      ) : view === 'stakes' ? (
        <Stakes cash={data.cash} />
      ) : (
        <Charts sessions={sessions} />
      )}

      {/* Portalled: <main> animates with a transform (see History in Online.jsx). */}
      {open &&
        createPortal(
          <SessionSheet
            s={open}
            onClose={() => setOpen(null)}
            onReview={open.review ? () => { setReview(open); setOpen(null) } : null}
          />,
          document.body,
        )}
      {review && createPortal(<CashReview s={review} onClose={() => setReview(null)} />, document.body)}
    </>
  )
}

/** The last session up top, this month beside it, then the last few. */
function Recent({ cash, onOpen, onReview }) {
  const last = cash.sessions[0]
  if (!last) return <div className="card p-5 text-sm text-muted">No cash sessions yet.</div>
  const month = cashMonth(cash)
  return (
    <>
      {/* The last session opens straight on its review when it has one. */}
      <button type="button" onClick={() => (last.review ? onReview(last) : onOpen(last))} className="card-hero block w-full p-5 text-left">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">
          Last session · {formatDay(last.date)}
        </div>
        <USD value={last.net} className="mt-1 block text-[40px] leading-tight font-bold tracking-tight" />
        <div className="num mt-1 text-sm text-muted">
          {stakesLabel(last.stakes)} · {last.hands} hands · {minutesLabel(last.minutes)}
          {last.tables > 1 && ` · ${last.tables} tables`}
        </div>
        <div className="num mt-0.5 text-sm text-muted">{rateLabel(last)}</div>
      </button>

      {month && (
        <div className="grid grid-cols-2 gap-2">
          <Tile label={`${monthLabel(month.month)} · net`} sub={`${month.sessions} session${month.sessions === 1 ? '' : 's'}`}>
            <USD value={month.net} />
          </Tile>
          <Tile label="Win rate" sub={`${month.hands.toLocaleString('en-CA')} hands`}>
            <span className={month.bb_per_100 >= 0 ? 'text-gain' : 'text-loss'}>{signed(month.bb_per_100)} bb/100</span>
          </Tile>
        </div>
      )}

      <div>
        <div className={`${title} px-1`}>Latest sessions</div>
        <Rows sessions={cash.sessions.slice(0, 6)} onOpen={onOpen} />
      </div>
    </>
  )
}

/** Every session, newest first, under its month. */
function SessionList({ sessions, onOpen }) {
  const months = useMemo(() => {
    const out = []
    for (const s of sessions) {
      const key = s.date.slice(0, 7)
      if (out[out.length - 1]?.key !== key) out.push({ key, rows: [] })
      out[out.length - 1].rows.push(s)
    }
    return out
  }, [sessions])
  return months.map((m) => (
    <div key={m.key}>
      <div className="mb-2 flex justify-between px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
        <span>{monthLabel(m.key)}</span>
        <USD value={m.rows.reduce((n, s) => n + s.net, 0)} className="normal-case tracking-normal" />
      </div>
      <Rows sessions={m.rows} onOpen={onOpen} />
    </div>
  ))
}

function Rows({ sessions, onOpen }) {
  return (
    <div className="card divide-y divide-white/5">
      {sessions.map((s) => (
        <button key={s.id} type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{formatDay(s.date)}</span>
              <Badge>{stakesLabel(s.stakes)}</Badge>
            </div>
            <div className="num mt-0.5 text-xs text-muted">
              {s.start}–{s.end} · {s.hands} hands · {rateLabel(s)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <USD value={s.net} className="text-sm font-semibold" />
            {s.review?.recap.grade.grade && (
              <div className={`num text-[11px] font-bold ${GRADE_TEXT[gradeTone(s.review.recap.grade.grade)]}`}>{s.review.recap.grade.grade}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

/** One session, as a bottom sheet. */
function SessionSheet({ s, onClose, onReview }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/50" onClick={onClose}>
      <div className="sheet-in pb-safe mx-auto w-full max-w-lg rounded-t-3xl border-t border-white/10 bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Cash · {stakesLabel(s.stakes)}</div>
            <div className="text-sm text-muted">
              {formatDay(s.date, true)} · {s.start}–{s.end}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">
            Close
          </button>
        </div>
        <dl className="num mt-4 space-y-1.5 text-sm">
          <Row label="Hands">{s.hands}</Row>
          <Row label="Time">{minutesLabel(s.minutes)}</Row>
          <Row label="Tables">{s.tables}</Row>
          {s.by_stakes?.length ? (
            // Several stakes: each on its own, since their big blinds are
            // worth different money and one combined rate would mislead.
            s.by_stakes.map((b) => (
              <Row key={b.stakes} label={`$${b.stakes} · ${b.hands} hands`}>
                <span className="text-muted">{signed(b.bb_per_100)} bb/100 · </span>
                <USD value={b.net} />
              </Row>
            ))
          ) : (
            <>
              <Row label="Big blinds">{signed(s.bb_won)}</Row>
              <Row label="Win rate">{signed(s.bb_per_100)} bb/100</Row>
            </>
          )}
          <div className="flex justify-between border-t border-white/5 pt-2 font-semibold">
            <dt>Net</dt>
            <dd>
              <USD value={s.net} />
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-faint">
          A session is every hand with no break over 30 minutes, all tables together.
        </p>
        {onReview && (
          <button type="button" onClick={onReview} className="btn-gold mt-4 w-full rounded-xl py-3 font-semibold">
            Open full review
          </button>
        )}
      </div>
    </div>
  )
}

/** Results by stake level and by month. */
function Stakes({ cash }) {
  return (
    <>
      <div className="card-hero p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">Cash · net</div>
        <USD value={cash.net} className="mt-1 block text-[40px] leading-tight font-bold tracking-tight" />
        <div className="num mt-1 text-sm text-muted">
          {cash.hands.toLocaleString('en-CA')} hands · {signed(cash.bb_per_100)} bb/100 · {cash.sessions.length} sessions
        </div>
      </div>
      <Table
        title="By stakes"
        rateLabel="bb/100"
        rows={cash.by_stakes.map((b) => ({ key: b.stakes, label: `$${b.stakes}`, n: b.hands, rate: signed(b.bb_per_100), net: b.net }))}
      />
      <p className="-mt-2 px-1 text-[11px] text-faint"># is hands. bb/100 needs a few thousand hands before it means much.</p>
      <Table
        title="By month"
        rateLabel="bb/100"
        rows={[...cash.by_month].reverse().map((m) => ({ key: m.month, label: monthLabel(m.month), n: m.sessions, rate: signed(m.bb_per_100), net: m.net }))}
      />
      <p className="-mt-2 px-1 text-[11px] text-faint"># is sessions.</p>
    </>
  )
}

/** Running total in dollars, session by session. */
function Charts({ sessions }) {
  const points = useMemo(() => cashCurve(sessions), [sessions])
  return (
    <div className="card p-3.5">
      <div className={title}>Running total</div>
      <ProfitChart points={points} formatAmount={(c) => formatSignedUSD(c / 100)} itemLabel="Session" emptyText="The chart appears after two sessions." />
    </div>
  )
}

/** Cash stats against the typical cash ranges, then the cash halves of the play cards. */
function CashGame({ data }) {
  const { play, benchmarks } = data
  const stats = play.cash
  return (
    <>
      <div className="card p-3.5">
        <div className={title}>Your cash stats vs typical</div>
        <table className="num w-full table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-28" />
          </colgroup>
          <tbody className="divide-y divide-white/5">
            {STAT_ROWS.map(([k, label, hint]) => (
              <tr key={k}>
                <td className="py-2 pr-2">
                  <div>{label}</div>
                  <div className="text-[11px] text-faint">{hint}</div>
                </td>
                <StatCell value={stats?.[k] ?? null} range={benchmarks.cash?.[k]} />
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-2">
                <div>Win rate</div>
                <div className="text-[11px] text-faint">bb per 100 hands</div>
              </td>
              <td className={`py-2 text-right ${(stats?.bb_per_100 ?? 0) >= 0 ? 'text-gain' : 'text-loss'}`}>{signed(stats?.bb_per_100)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-faint">
          Typical ranges are rough guides for small-stakes cash. Outside the range is worth a look, not proof of a mistake.
        </p>
      </div>
      <BBDefence d={play.bb_defence} game="cash" />
      <FlopHabits f={play.flop} game="cash" />
      <Postflop p={play.postflop} game="cash" />
      <RiverChoice r={play.river_choice} game="cash" />
    </>
  )
}
