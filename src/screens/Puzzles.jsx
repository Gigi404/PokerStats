import { useEffect, useMemo, useState } from 'react'
import Cards from '../components/Cards.jsx'
import PokerTable from '../components/PokerTable.jsx'
import Theory from '../components/Theory.jsx'
import useOnline from '../hooks/useOnline.js'
import * as repo from '../lib/repo.js'
import { FORMAT_LABELS, formatUSD } from '../lib/online.js'
import { explain, FILTERS, focusFilter, nextPuzzle, question, record, remaining, today } from '../lib/puzzles.js'
import { frames, toCall, totalPot } from '../lib/table.js'
import { formatDay } from '../lib/time.js'
import { Unlock } from './Online.jsx'

/*
  Puzzles (Phase 8 step 4, mockup F chosen 2026-10-17): spots from your own
  tournaments, drawn from every tournament and not per tournament, your
  leaks first. Answer, then see what was right and why. A mistake comes back
  until you get it right (lib/puzzles.js schedules it).

  The puzzles arrive in the encrypted online file (play.puzzles), so this tab
  unlocks the same way Online does. Progress stays on this phone.
*/

const META_KEY = 'puzzles'

/** @param {{focus?: string[] | null}} props  focus: leaks sent here by a "Practise" button. */
export default function Puzzles({ focus = null }) {
  const online = useOnline()
  const [progress, setProgress] = useState(null)
  const [filter, setFilter] = useState(focus ? 'focus' : 'leaks')
  // The puzzle on screen, once chosen; while null, the next one is derived.
  const [currentId, setCurrentId] = useState(null)
  const [picked, setPicked] = useState(null)
  // The clock the schedule reads. It only moves in event handlers, so a
  // re-render never reshuffles the puzzle under your thumb.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    repo.getMeta(META_KEY).then((v) => setProgress(v || {})).catch(() => setProgress({}))
  }, [])

  const items = online.data?.play?.puzzles?.items
  const byId = useMemo(() => Object.fromEntries((online.data?.tournaments?.history || []).map((t) => [t.id, t])), [online.data])

  if (online.status === 'loading' || progress === null) {
    return <p className="py-16 text-center text-sm text-faint">Opening puzzles…</p>
  }
  if (online.status === 'locked') return <Unlock onUnlock={online.unlock} error={online.error} />
  if (online.status === 'error') {
    return <div className="card p-5 text-sm text-muted">Puzzles load with the online results, once the phone has signal.</div>
  }
  if (!items?.length) {
    return <div className="card p-5 text-sm text-muted">No puzzles yet: they arrive with the next results PokerEdge sends.</div>
  }

  const practice = focus ? focusFilter(focus) : null
  const chips = practice ? [practice, ...FILTERS] : FILTERS
  const active = filter === 'focus' ? practice : filter
  const current = items.find((p) => p.id === currentId) || nextPuzzle(items, progress, active, now)
  const t = today(progress, now)
  const left = remaining(filter === 'focus' ? items.filter(practice.test) : items, progress, now)

  const answer = async (value) => {
    const at = Date.now()
    setCurrentId(current.id) // keep it on screen while the answer shows
    setPicked(value)
    setNow(at)
    const next = record(progress, current.id, value === current.answer, at)
    setProgress(next)
    try {
      await repo.setMeta(META_KEY, next)
    } catch {
      // Progress is a convenience: a failed save only means a puzzle may come back early.
    }
  }
  const onNext = () => {
    const at = Date.now()
    setPicked(null)
    setNow(at)
    setCurrentId(nextPuzzle(items, progress, active, at, current.id)?.id ?? null)
  }

  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-muted">Spots from your own hands, tournaments and cash. A mistake comes back until you get it right.</p>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setPicked(null)
              setCurrentId(null)
              setNow(Date.now())
              setFilter(f.key)
            }}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${
              filter === f.key ? 'btn-gold' : 'bg-surface-2 text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="num flex justify-between px-1 text-xs text-muted">
        <span>
          Today: {t.answered} answered{t.answered ? ` · ${t.right} right` : ''}
        </span>
        <span>{left} to work on</span>
      </div>

      {current ? (
        <Puzzle key={current.id} p={current} t={byId[current.tournament_id]} picked={picked} onAnswer={answer} onNext={onNext} />
      ) : (
        <div className="card p-5 text-sm text-muted">No puzzles in this group yet.</div>
      )}
    </div>
  )
}

/** One puzzle: dealt on its table when PokerEdge sent one (`p.t`), else the card it always was. */
function Puzzle(props) {
  return props.p.t ? <TablePuzzle {...props} /> : <CardPuzzle {...props} />
}

/** "US$5.50 Turbo · Nov 14", or "Cash · Nov 14": where the spot comes from. */
function source(p, t) {
  if (p.game === 'cash') return `Cash · ${formatDay(p.date)}`
  return `${t ? `${formatUSD(t.buy_in)} ${FORMAT_LABELS[t.format] || t.format} · ` : ''}${formatDay(p.date)}`
}

// Each action is shown this long before the next; the blinds a little less.
const STEP_MS = 650
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The table puzzle (2026-11-15): the hand is dealt out action by action up
 * to your decision, then the client-style buttons appear. After the answer
 * the table shows the rest of the board and any hand shown at showdown.
 */
function TablePuzzle({ p, t, picked, onAnswer, onNext }) {
  const q = question(p)
  const all = useMemo(() => frames(p.t), [p.t])
  const last = all.length - 1
  // Reduced motion skips straight to the question.
  const [step, setStep] = useState(() => (reducedMotion() ? last : 0))
  const e = picked ? explain(p, picked) : null

  useEffect(() => {
    if (step >= last) return undefined
    const id = setTimeout(() => setStep((s) => Math.min(s + 1, last)), step === 0 ? STEP_MS * 0.8 : STEP_MS)
    return () => clearTimeout(id)
  }, [step, last])

  const frame = all[step]
  const ready = step >= last
  const call = toCall(all[last], p.t.h)
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{q.kind}</span>
        <span className="truncate text-xs text-faint">{source(p, t)}</span>
      </div>

      <div className={`rounded-3xl ${e ? (e.right ? 'glow-right' : 'shake') : ''}`}>
        <PokerTable t={p.t} frame={frame} heroCards={p.g.cards} reveal={!!e} />
      </div>

      {!e && !ready && (
        <button type="button" onClick={() => setStep(last)} className="mx-auto block rounded-full bg-surface-2 px-4 py-1.5 text-[13px] font-semibold text-muted">
          Skip to my turn ›
        </button>
      )}

      {!e && ready && (
        <div className="fade-up space-y-2">
          <p className="num text-center text-[13px] text-muted">
            Your turn{call > 0 ? ` · ${call}bb to call` : ''} · pot {totalPot(all[last])}bb
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {q.options.map((o, k) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onAnswer(o.value)}
                className={`min-h-14 rounded-2xl text-[16px] font-bold shadow-[0_3px_0_rgba(0,0,0,0.35)] ${
                  k ? 'btn-gold' : 'border border-loss/40 bg-[#3a1518] text-[#ffb4b6]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {e && <Answer p={p} e={e} onNext={onNext} />}
    </div>
  )
}

/** The puzzle as a card, for files without tables. */
function CardPuzzle({ p, t, picked, onAnswer, onNext }) {
  const q = question(p)
  const e = picked ? explain(p, picked) : null
  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">{q.kind}</span>
        <span className="truncate text-xs text-faint">{source(p, t)}</span>
      </div>
      <p className="text-[15px] leading-relaxed">{q.text}</p>
      {q.board && (
        <div className="flex items-center gap-2 text-xs text-muted">
          Board <Cards cards={q.board} />
        </div>
      )}
      <div className="flex justify-center py-1">
        <span className="scale-150 py-2">
          <Cards cards={p.g.cards} />
        </span>
      </div>

      {!e ? (
        <div className="grid grid-cols-2 gap-2.5">
          {q.options.map((o, k) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onAnswer(o.value)}
              className={`min-h-12 rounded-2xl font-semibold ${k ? 'btn-gold' : 'border border-line bg-surface-2'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <Answer p={p} e={e} onNext={onNext} />
      )}
    </div>
  )
}

/** What was right and why, in the grade lists' own words. */
function Answer({ p, e, onNext }) {
  return (
    <div className="fade-up space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-lg font-bold ${e.right ? 'text-gain' : 'text-accent'}`}>{e.headline}</span>
        <span className="num shrink-0 text-sm text-muted">{e.value}</span>
      </div>
      <div className="space-y-1 text-[13.5px] leading-relaxed text-muted">
        {e.why.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="text-[13px] text-faint">{e.table}</p>
      <Theory key={p.id} lesson={p.lesson} decision={p.g} />
      <button type="button" onClick={onNext} className="min-h-12 w-full rounded-2xl border border-line font-semibold text-accent">
        Next puzzle ›
      </button>
    </div>
  )
}
