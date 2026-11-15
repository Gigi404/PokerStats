import { useEffect, useMemo, useRef, useState } from 'react'
import Cards from '../components/Cards.jsx'
import PokerTable from '../components/PokerTable.jsx'
import Theory from '../components/Theory.jsx'
import useOnline from '../hooks/useOnline.js'
import * as repo from '../lib/repo.js'
import { FORMAT_LABELS, formatUSD } from '../lib/online.js'
import { Fold, Segmented } from '../components/ui.jsx'
import { both, emptyGame, GAME_KEY, GAMES, level, levelName, mastery, score, TIME_BANK_S, todayScore } from '../lib/game.js'
import { explain, FILTERS, focusFilter, nextPuzzle, question, record, remaining } from '../lib/puzzles.js'
import { sounds } from '../lib/sound.js'
import { frames, toCall } from '../lib/table.js'
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

/**
 * The time, read only in event handlers and timers. A named helper because
 * the React lint cannot tell those apart from render when the handler is
 * also passed into an effect (the time bank calls onAnswer from a timer).
 */
const clock = () => Date.now()

/**
 * @param {{focus?: string[] | null, focusGame?: string}} props
 *   focus: leaks sent here by a "Practise" button; focusGame: the game they
 *   came from ('tournament', 'cash' or 'all').
 */
export default function Puzzles({ focus = null, focusGame = 'all' }) {
  const online = useOnline()
  const [progress, setProgress] = useState(null)
  // Points, streak, level and settings (lib/game.js), saved beside the schedule.
  const [game, setGame] = useState(null)
  const [filter, setFilter] = useState(focus ? 'focus' : 'leaks')
  const [gameKey, setGameKey] = useState(focus ? focusGame : 'all')
  // The puzzle on screen, once chosen; while null, the next one is derived.
  const [currentId, setCurrentId] = useState(null)
  const [picked, setPicked] = useState(null)
  // What the last answer earned, for the "+130" and the level-up banner.
  const [result, setResult] = useState(null)
  // The clock the schedule reads. It only moves in event handlers, so a
  // re-render never reshuffles the puzzle under your thumb.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    repo.getMeta(META_KEY).then((v) => setProgress(v || {})).catch(() => setProgress({}))
    repo.getMeta(GAME_KEY).then((v) => setGame({ ...emptyGame(), ...(v || {}) })).catch(() => setGame(emptyGame()))
  }, [])

  const items = online.data?.play?.puzzles?.items
  const byId = useMemo(() => Object.fromEntries((online.data?.tournaments?.history || []).map((t) => [t.id, t])), [online.data])
  const sfx = useMemo(() => sounds(game?.sound !== false), [game?.sound])

  if (online.status === 'loading' || progress === null || game === null) {
    return <p className="py-16 text-center text-sm text-faint">Opening puzzles…</p>
  }
  if (online.status === 'locked') return <Unlock onUnlock={online.unlock} error={online.error} />
  if (online.status === 'error') {
    return <div className="card p-5 text-sm text-muted">Puzzles load with the online results, once the phone has signal.</div>
  }
  if (!items?.length) {
    return <div className="card p-5 text-sm text-muted">No puzzles yet: they arrive with the next results PokerEdge sends.</div>
  }

  const hasCash = items.some((p) => p.game === 'cash')
  const practice = focus ? focusFilter(focus) : null
  // Spot chips that have puzzles in the chosen game (no "Calling a shove" in cash).
  const spotChips = (practice ? [practice, ...FILTERS] : FILTERS).filter((f) => items.some(both(gameKey, f).test))
  const spot = spotChips.find((f) => f.key === filter) || spotChips[0] || FILTERS[0]
  const active = both(gameKey, spot)
  const current = items.find((p) => p.id === currentId) || nextPuzzle(items, progress, active, now)
  const left = remaining(items.filter(active.test), progress, now)

  const save = (key, value) =>
    repo.setMeta(key, value).catch(() => {
      // Progress is a convenience: a failed save only means a puzzle may come back early.
    })
  const changeGame = (next) => {
    setGame(next)
    save(GAME_KEY, next)
  }

  /** value: the play chosen; secondsLeft: the time bank left (null when off, 0 when it ran out). */
  const answer = (value, secondsLeft = null) => {
    const at = clock()
    const right = value === current.answer
    setCurrentId(current.id) // keep it on screen while the answer shows
    setPicked(value)
    setNow(at)
    const next = record(progress, current.id, right, at)
    setProgress(next)
    save(META_KEY, next)
    const r = score(game, right, at, secondsLeft)
    changeGame(r.game)
    setResult({ ...r, right, timedOut: secondsLeft === 0 })
    if (r.levelUp) sfx.levelUp()
    else if (right) sfx.right()
    else sfx.wrong()
  }
  const onNext = () => {
    const at = clock()
    setPicked(null)
    setResult(null)
    setNow(at)
    setCurrentId(nextPuzzle(items, progress, active, at, current.id)?.id ?? null)
  }
  const reset = () => {
    setPicked(null)
    setResult(null)
    setCurrentId(null)
    setNow(Date.now())
  }

  return (
    <div className="space-y-2.5">
      <ScoreBar game={game} now={now} result={result} left={left} onToggle={(k) => changeGame({ ...game, [k]: !game[k] })} />

      {hasCash && (
        <Segmented
          size="sm"
          value={gameKey}
          onChange={(k) => {
            reset()
            setGameKey(k)
          }}
          options={GAMES.map((g) => ({ value: g.key, label: g.label }))}
        />
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {spotChips.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              reset()
              setFilter(f.key)
            }}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${
              spot.key === f.key ? 'btn-gold' : 'bg-surface-2 text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {current ? (
        <Puzzle
          key={current.id}
          p={current}
          t={byId[current.tournament_id]}
          picked={picked}
          result={result}
          onAnswer={answer}
          onNext={onNext}
          sfx={sfx}
          timeBank={game.timeBank}
        />
      ) : (
        <div className="card p-5 text-sm text-muted">No puzzles in this group yet.</div>
      )}

      <Mastery items={items.filter(GAMES.find((g) => g.key === gameKey).test)} progress={progress} />
    </div>
  )
}

/**
 * The game's head-up display: level and XP, the streak, today's points, and
 * the two switches (sound, time bank). After a level-up or a new best
 * streak it says so for that answer.
 */
function ScoreBar({ game, now, result, left, onToggle }) {
  const lv = level(game.xp)
  const day = todayScore(game, now)
  return (
    <div className="card-hero space-y-1.5 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="num flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-[#1a1405] text-lg font-extrabold text-accent">
          {lv.level}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] font-bold">{levelName(lv.level)}</span>
            <span className="num shrink-0 text-[11px] text-faint">
              {lv.into.toLocaleString('en-CA')} / {lv.need.toLocaleString('en-CA')} XP
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${lv.pct}%` }} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onToggle('sound')}
            aria-label={game.sound ? 'Sound off' : 'Sound on'}
            className="h-9 w-9 rounded-full bg-surface-2 text-[15px]"
          >
            {game.sound ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            onClick={() => onToggle('timeBank')}
            aria-label={game.timeBank ? 'Time bank off' : 'Time bank on'}
            className={`h-9 w-9 rounded-full text-[15px] ${game.timeBank ? 'btn-gold' : 'bg-surface-2 opacity-60'}`}
          >
            ⏱
          </button>
        </div>
      </div>
      <div className="num flex justify-between text-[12px] text-muted">
        <span className={game.streak >= 3 ? 'font-semibold text-accent' : ''}>
          🔥 {game.streak} in a row{game.best > 1 ? ` · best ${game.best}` : ''}
        </span>
        <span>
          Today {day.points.toLocaleString('en-CA')} pts · {day.right}/{day.answered} · {left} left
          {game.timeBank ? ` · ⏱ ${TIME_BANK_S}s` : ''}
        </span>
      </div>
      {result?.levelUp && (
        <div className="fade-up rounded-xl bg-accent/15 px-3 py-1.5 text-center text-[13px] font-bold text-accent">
          Level up! Level {lv.level} · {levelName(lv.level)}
        </div>
      )}
      {!result?.levelUp && result?.newBest && (
        <div className="fade-up rounded-xl bg-gain/15 px-3 py-1.5 text-center text-[13px] font-bold text-gain">
          New best streak: {game.streak} in a row
        </div>
      )}
    </div>
  )
}

/** Mastery bars per kind of spot, folded: how much of each you have nailed. */
function Mastery({ items, progress }) {
  const rows = mastery(items, progress, FILTERS.filter((f) => f.key !== 'leaks'))
  if (!rows.length) return null
  return (
    <Fold title="Your mastery" hint="A spot counts once you get it right twice, a day or more apart.">
      <div className="card space-y-2.5 p-3.5">
        {rows.map((m) => (
          <div key={m.key}>
            <div className="num flex justify-between text-[13px]">
              <span>{m.label}</span>
              <span className="text-muted">
                {m.mastered}/{m.total}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${m.pct >= 80 ? 'bg-gain' : 'bg-accent'}`} style={{ width: `${m.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Fold>
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
function TablePuzzle({ p, t, picked, result, onAnswer, onNext, sfx, timeBank }) {
  const q = question(p)
  const all = useMemo(() => frames(p.t), [p.t])
  const last = all.length - 1
  // Reduced motion skips straight to the question.
  const [step, setStep] = useState(() => (reducedMotion() ? last : 0))
  // Time bank: when the decision's clock runs out (ms), set the moment the
  // question appears; null while the hand is still being dealt or when off.
  const [endsAt, setEndsAt] = useState(() => (timeBank && reducedMotion() ? Date.now() + TIME_BANK_S * 1000 : null))
  const [left, setLeft] = useState(TIME_BANK_S)
  const e = picked ? explain(p, picked) : null

  /** Show the question: the last frame, and the clock starts. */
  const toQuestion = () => {
    setStep(last)
    if (timeBank) setEndsAt((v) => v ?? Date.now() + TIME_BANK_S * 1000)
  }

  // Deal the hand out, one action at a time, with a chip click for each.
  useEffect(() => {
    if (step >= last) return undefined
    const id = setTimeout(
      () => {
        if (all[step + 1]?.actor !== null && step + 1 < last) sfx.chip()
        if (step + 1 >= last) toQuestion()
        else setStep(step + 1)
      },
      step === 0 ? STEP_MS * 0.8 : STEP_MS,
    )
    return () => clearTimeout(id)
    // toQuestion only reads props and setters that never change here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, last])

  // The time bank: ticks in the last five seconds; at zero, the hand is folded.
  useEffect(() => {
    if (!endsAt || picked) return undefined
    let lastWhole = TIME_BANK_S
    const id = setInterval(() => {
      const s = Math.max(0, (endsAt - Date.now()) / 1000)
      setLeft(s)
      const whole = Math.ceil(s)
      if (whole < lastWhole && whole <= 5 && whole > 0) sfx.tick()
      lastWhole = whole
      if (s <= 0) {
        clearInterval(id)
        onAnswer('fold', 0)
      }
    }, 100)
    return () => clearInterval(id)
  }, [endsAt, picked, onAnswer, sfx])

  const frame = all[step]
  const ready = step >= last
  const call = toCall(all[last], p.t.h)

  // Your turn: bring the buttons into view (no state, just the scroll).
  const actionsRef = useRef(null)
  useEffect(() => {
    if (ready && !picked) actionsRef.current?.scrollIntoView({ block: 'end', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [ready, picked])
  const answer = (value) => onAnswer(value, endsAt ? Math.max(0, (endsAt - clock()) / 1000) : null)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{q.kind}</span>
        <span className="truncate text-xs text-faint">{source(p, t)}</span>
      </div>

      <div className={`relative rounded-3xl ${e ? (e.right ? 'glow-right' : 'shake') : ''}`}>
        <PokerTable t={p.t} frame={frame} heroCards={p.g.cards} reveal={!!e} />
        {/* What the answer earned, popping over the felt. */}
        {result && (
          <div
            className={`pop-in num pointer-events-none absolute left-1/2 top-[64%] rounded-2xl px-4 py-1.5 text-[22px] font-extrabold shadow-lg ${
              result.right ? 'bg-gain text-[#06210f]' : 'bg-[#3a1518] text-[#ffb4b6]'
            }`}
          >
            {result.right ? `+${result.gained}` : result.timedOut ? 'Time!' : 'Miss'}
          </div>
        )}
      </div>

      {!e && !ready && (
        <button type="button" onClick={toQuestion} className="mx-auto block rounded-full bg-surface-2 px-4 py-1.5 text-[13px] font-semibold text-muted">
          Skip to my turn ›
        </button>
      )}

      {!e && ready && (
        // Scrolled into view when it appears (above the tab bar), so on a
        // short phone the buttons are never hidden under it.
        <div ref={actionsRef} className="fade-up space-y-2" style={{ scrollMarginBottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}>
          {endsAt && (
            <div className="flex items-center gap-2" aria-label={`${Math.ceil(left)} seconds left`}>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${left <= 5 ? 'bg-loss' : 'bg-accent'}`}
                  style={{ width: `${(100 * left) / TIME_BANK_S}%`, transition: 'width 100ms linear' }}
                />
              </div>
              <span className={`num w-6 text-right text-[12px] font-bold ${left <= 5 ? 'text-loss' : 'text-muted'}`}>{Math.ceil(left)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {q.options.map((o, k) => (
              <button
                key={o.value}
                type="button"
                onClick={() => answer(o.value)}
                className={`min-h-14 rounded-2xl text-[16px] font-bold leading-tight shadow-[0_3px_0_rgba(0,0,0,0.35)] ${
                  k ? 'btn-gold' : 'border border-loss/40 bg-[#3a1518] text-[#ffb4b6]'
                }`}
              >
                {o.label}
                {/* The price of playing on, like a client's Call button. */}
                {k > 0 && call > 0 && <span className="num block text-[11px] font-semibold opacity-75">{call}bb to call</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {e && <Answer p={p} e={e} onNext={onNext} timedOut={result?.timedOut} />}
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
function Answer({ p, e, onNext, timedOut = false }) {
  return (
    <div className="fade-up space-y-2.5">
      {timedOut && <p className="text-[13px] font-semibold text-loss">Time ran out, so the hand was folded.</p>}
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
