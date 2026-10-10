import { useState } from 'react'
import Cards from '../components/Cards.jsx'
import { Segmented } from '../components/ui.jsx'
import { listDecisions, situation, tally, verdictLine, whyLines } from '../lib/grades.js'

/*
  Short-stack grades from PokerEdge's equity engine (core/short_stack.py):
  every preflop all-in decision at 25bb or less — shove, re-shove or call vs
  fold — judged in chips against what this player pool usually shoves and
  calls with. Three places show them:

    GradeLine   under a key hand that was graded (tap for why)
    Decisions   the review's list of every graded decision in a tournament
    ShortStack  the big picture on My game

  The judging is done on the beast; this file only lays it out. Wording is in
  lib/grades.js.
*/

const title = 'mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const TONE = { gain: 'text-gain', loss: 'text-loss', muted: 'text-muted' }

/** The "why" panel: what happens if you go all-in, and the conclusion. */
function Why({ d, heading = false }) {
  const w = whyLines(d)
  return (
    <div className="mt-2 rounded-xl bg-surface-2 p-2.5 text-[12.5px] leading-relaxed text-muted">
      {heading && (
        <div className="mb-0.5 font-semibold text-ink">
          {d.seat} · {d.stack_bb}bb · {situation(d)}
        </div>
      )}
      {w.lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
      <div className="mt-1 font-medium text-ink">{w.conclusion}</div>
      {w.notes.map((n) => (
        <div key={n} className="mt-1 text-[11px] text-faint">
          {n}
        </div>
      ))}
    </div>
  )
}

/** A key hand's grade: one line, tap for why. */
export function GradeLine({ d }) {
  const [open, setOpen] = useState(false)
  const v = verdictLine(d)
  return (
    <div className="mt-2.5 border-t border-white/5 pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left text-[13px] font-semibold"
      >
        <span className={TONE[v.tone]}>
          {v.mark} {v.text}
        </span>
        <span className={`num shrink-0 ${TONE[v.tone]}`}>
          {v.value} <span className="text-faint">{open ? '▴' : '▾'}</span>
        </span>
      </button>
      {open && <Why d={d} />}
    </div>
  )
}

/** One decision in a list: cards, where and what, and its value. Tap for why. */
function Row({ d, showMark, suffix }) {
  const [open, setOpen] = useState(false)
  const v = verdictLine(d)
  return (
    <div className="border-t border-white/5 py-2 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-[13px]"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {showMark && <span className="w-4 shrink-0 text-center text-xs">{v.mark}</span>}
          <Cards cards={d.cards} small />
          <span className="truncate text-muted">
            {d.seat} · {d.stack_bb}bb · {situation(d)}
            {suffix && ` · ${suffix}`}
          </span>
        </span>
        <span className={`num shrink-0 ${TONE[v.tone]}`}>{v.value}</span>
      </button>
      {open && <Why d={d} />}
    </div>
  )
}

const MISTAKES_SHOWN = 6

/**
 * Every graded decision in one tournament, with a toggle: mistakes only
 * (costliest first) or everything in the order played.
 *
 * @param {{decisions: object[]}} props  review.decisions from the summary
 */
export function Decisions({ decisions }) {
  const [mode, setMode] = useState('mistakes')
  const [all, setAll] = useState(false)
  const t = tally(decisions)
  if (!t.n) return null
  const list = listDecisions(decisions, mode)
  const shown = mode === 'mistakes' && !all ? list.slice(0, MISTAKES_SHOWN) : list
  return (
    <div className="card p-3.5">
      <div className={title}>Short-stack decisions</div>
      <div className="flex items-baseline justify-between">
        <div>
          <span className="num text-2xl font-bold">{t.mistake}</span>{' '}
          <span className="text-sm text-muted">
            mistake{t.mistake === 1 ? '' : 's'} of {t.n}
          </span>
        </div>
        {t.cost > 0 && <span className="num text-2xl font-bold text-loss">−{t.cost}bb</span>}
      </div>
      <div className="mt-1 text-[11px] text-faint">{summaryLine(t)}</div>

      <div className="mt-3">
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'mistakes', label: 'Mistakes' },
            { value: 'order', label: 'In order' },
          ]}
        />
      </div>

      <div className="mt-2">
        {shown.length === 0 ? (
          <p className="py-3 text-center text-sm text-faint">No mistakes in this one.</p>
        ) : (
          shown.map((d) => <Row key={d.hand_id + d.spot} d={d} showMark={mode === 'order'} />)
        )}
      </div>
      {mode === 'mistakes' && (
        <div className="mt-1 flex flex-wrap gap-2">
          {list.length > MISTAKES_SHOWN && (
            <button type="button" onClick={() => setAll(!all)} className="rounded-full bg-surface-2 px-3 py-1 text-[11px] text-muted">
              {all ? 'Show fewer' : `+ ${list.length - MISTAKES_SHOWN} more mistakes`}
            </button>
          )}
          {t.correct + t.close > 0 && (
            <button type="button" onClick={() => setMode('order')} className="rounded-full bg-surface-2 px-3 py-1 text-[11px] text-muted">
              {t.correct} correct · {t.close} close — see all
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function summaryLine(t) {
  if (!t.mistake) return 'Every all-in decision here was right or close.'
  const acted = t.mistake - t.folds
  if (!acted) {
    const which = t.folds === 1 ? 'The mistake was a fold' : `All ${t.folds} were folds`
    return `${which} where going all-in was better. None of your shoves or calls was a mistake.`
  }
  return `${t.folds} fold${t.folds === 1 ? '' : 's'} where going all-in was better, ${acted} all-in${acted === 1 ? '' : 's'} where folding was.`
}

const SPOT_ROWS = [
  ['shove', 'Shove, folded to you'],
  ['reshove', 'Re-shove over a raise'],
  ['call', 'Call a shove'],
]

/** Seats with this few graded shove spots are left out of the seat bars. */
const MIN_SEAT_SPOTS = 20

/**
 * The My game card: every graded decision so far.
 *
 * @param {{s: object}} props  summary.play.short_stack
 */
export function ShortStack({ s }) {
  if (!s || !s.graded) return null
  const seats = s.by_seat.filter((r) => r.graded >= MIN_SEAT_SPOTS)
  return (
    <div className="card p-3.5">
      <div className={title}>Short-stack decisions · 25bb or less</div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="num text-2xl font-bold">{s.acted.correct}</span>
          <span className="text-sm text-muted"> of {s.acted.n}</span>
          <div className="text-[11px] text-faint">of your shoves and calls were right</div>
        </div>
        <div className="text-right">
          <span className="num text-2xl font-bold text-loss">−{Math.round(s.cost_bb).toLocaleString('en-CA')}bb</span>
          <div className="text-[11px] text-faint">given up in mistakes</div>
        </div>
      </div>

      <table className="num mt-3 w-full text-sm">
        <thead>
          <tr className="text-xs text-faint">
            <th className="pb-1.5 text-left font-medium">Spot</th>
            <th className="pb-1.5 text-right font-medium">Graded</th>
            <th className="pb-1.5 text-right font-medium">Missed</th>
            <th className="pb-1.5 text-right font-medium">bb lost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {SPOT_ROWS.map(([k, label]) => (
            <tr key={k}>
              <td className="py-2">{label}</td>
              <td className="py-2 text-right text-muted">{s.spots[k].graded}</td>
              <td className="py-2 text-right text-loss">{s.spots[k].missed}</td>
              <td className="py-2 text-right text-loss">{Math.round(s.spots[k].cost_bb)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-faint">Missed: folded when going all-in was worth more.</p>

      {seats.length > 0 && (
        <>
          <div className={`${title} mt-4`}>Missed shoves by seat</div>
          <div className="space-y-1.5">
            {seats.map((r) => (
              <div key={r.seat} className="num flex items-center gap-3 text-sm">
                <span className="w-9 shrink-0">{r.seat}</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-surface-2">
                  <span className="block h-full bg-loss" style={{ width: `${(100 * r.missed) / r.graded}%` }} />
                </span>
                <span className="w-24 shrink-0 text-right text-muted">
                  {r.missed} of {r.graded}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={`${title} mt-4`}>Mistakes by stack</div>
      <table className="num w-full text-sm">
        <thead>
          <tr className="text-xs text-faint">
            <th className="pb-1.5 text-left font-medium">Stack</th>
            <th className="pb-1.5 text-right font-medium">Shove</th>
            <th className="pb-1.5 text-right font-medium">Re-shove</th>
            <th className="pb-1.5 text-right font-medium">Call</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {s.by_stack.map((r) => (
            <tr key={r.key}>
              <td className="py-2">{r.label}</td>
              {['shove', 'reshove', 'call'].map((k) => (
                <td key={k} className={`py-2 text-right ${r[k] ? 'text-loss' : 'text-faint'}`}>
                  {r[k] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {s.costliest.length > 0 && (
        <>
          <div className={`${title} mt-4`}>Costliest mistakes</div>
          {s.costliest.map((d) => (
            <Row key={d.hand_id + d.spot} d={d} suffix={shortDate(d.date)} />
          ))}
        </>
      )}

      <p className="mt-3 text-[11px] text-faint">
        {s.graded.toLocaleString('en-CA')} decisions since {shortDate(s.from)}. Estimates against what this player pool
        usually shoves and calls with, not exact. Bubbles and satellite pay jumps are not modelled yet.
      </p>
    </div>
  )
}

function shortDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
