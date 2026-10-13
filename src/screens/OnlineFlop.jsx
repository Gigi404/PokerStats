import { useState } from 'react'
import Cards from '../components/Cards.jsx'
import { Segmented } from '../components/ui.jsx'
import { flopSpot, flopTally, flopVerdict, flopWhy } from '../lib/flopGrades.js'
import { BAND_ARROW, band, formatPct } from '../lib/online.js'

/*
  Flop habits, from PokerEdge's analysis/flop_play.py. Measured, not graded:
  c-bet, fold to c-bet and check-raise against rough published ranges and
  this pool; then the two that matter when the pot is nearly committed
  (SPR under 3) — folding to any bet and betting first — against the pool
  only, since no published range exists for them. Once there were enough,
  your answers to a low-SPR bet are also graded in chips
  (analysis/flop_grading.py → low_spr.graded): absent in older files.
*/

// Below this many spots a rate is shown faded and not compared with typical.
const MIN_SPOTS = 20

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const TONE = { low: 'text-accent', high: 'text-accent', ok: 'text-gain' }

const HABITS = [
  { key: 'cbet', label: 'C-bet', hint: 'raised preflop, first to bet the flop' },
  { key: 'fold_to_cbet', label: 'Fold to c-bet', hint: 'called preflop, the raiser bets' },
  { key: 'check_raise', label: 'Check-raise', hint: 'checked, someone bet behind' },
]
const LOW_SPR = [
  { key: 'fold_to_bet', label: 'Fold to a bet', hint: 'any flop bet, by anyone' },
  { key: 'bet_first', label: 'Bet first', hint: 'nobody has bet yet: c-bet or lead' },
]
// Heads-up in position a check ends the street, so it has no check-raise.
const SITUATIONS = [
  ['hu_ip', 'IP'],
  ['hu_oop', 'OOP'],
  ['multi', 'multi'],
]

/**
 * @param {{f: object}} props  summary.play.flop (absent in older files)
 */
export default function FlopHabits({ f }) {
  const [game, setGame] = useState('tournament')
  if (!f || !f.tournament) return null
  const g = f[game]
  return (
    <div className="card p-3.5">
      <div className={title}>Flop habits</div>
      <p className="mb-2 text-[11px] text-faint">Every flop you saw. Under each: typical · this pool.</p>
      <div className="mb-2">
        <Segmented
          size="sm"
          value={game}
          onChange={setGame}
          options={[
            { value: 'tournament', label: 'Tournaments' },
            { value: 'cash', label: 'Cash' },
          ]}
        />
      </div>
      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-24" />
        </colgroup>
        <tbody className="divide-y divide-white/5">
          {HABITS.map((h) => (
            <Row key={h.key} h={h} cell={g[h.key].all.all} by={g[h.key].situation} />
          ))}
        </tbody>
      </table>

      <div className={`${title} mt-4`}>Nearly all-in · SPR under 3</div>
      <p className="mb-1 text-[11px] text-faint">
        Stack-to-pot under 3: the pot is close to committed. No published range — read against this pool.
      </p>
      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-24" />
        </colgroup>
        <tbody className="divide-y divide-white/5">
          {LOW_SPR.map((h) => (
            <Row key={h.key} h={h} cell={g[h.key].spr.lt3} />
          ))}
        </tbody>
      </table>
      {f.low_spr?.graded ? (
        <LowSprGrades block={f.low_spr.graded[game]} />
      ) : null}
      <p className="mt-2 text-[11px] text-faint">
        Rough small-stakes ranges: outside is worth a look, not proof of a mistake. Under {MIN_SPOTS} spots is faded
        and not judged.
        {f.low_spr && !f.low_spr.graded && ` ${f.low_spr.spots} low-SPR bets faced so far (all games) — not graded yet.`}
      </p>
    </div>
  )
}

/** One habit: your rate (toned against typical), typical · pool, and the split by situation. */
function Row({ h, cell, by }) {
  const enough = cell.hero.n >= MIN_SPOTS
  const b = enough && cell.typical ? band(cell.hero.pct, cell.typical) : null
  return (
    <tr>
      <td className="py-2 pr-2 align-top">
        <div>{h.label}</div>
        <div className="text-[11px] text-faint">{h.hint}</div>
        {by && (
          <div className="text-[11px] text-muted">
            {SITUATIONS.filter(([k]) => by[k]?.hero.n).map(([k, label], i) => {
              const s = by[k]
              const sb = s.hero.n >= MIN_SPOTS && s.typical ? band(s.hero.pct, s.typical) : null
              return (
                <span key={k}>
                  {i > 0 && ' · '}
                  {label}{' '}
                  <span className={sb ? TONE[sb] : s.hero.n < MIN_SPOTS ? 'text-faint' : ''}>
                    {sb && BAND_ARROW[sb]}
                    {formatPct(s.hero.pct)}
                  </span>
                </span>
              )
            })}
          </div>
        )}
      </td>
      <td className="py-2 text-right align-top">
        <div className={b ? TONE[b] : enough ? '' : 'text-faint'}>
          {b && BAND_ARROW[b]}
          {formatPct(cell.hero.pct)}
          <span className="text-[10px] text-faint"> ·{cell.hero.n}</span>
        </div>
        <div className="text-[11px] text-faint">
          {cell.typical ? `${cell.typical[0]}–${cell.typical[1]}` : '—'} · {formatPct(cell.pool.pct)}
        </div>
      </td>
    </tr>
  )
}

const GTONE = { gain: 'text-gain', loss: 'text-loss', muted: 'text-muted' }

/**
 * Your answers to a low-SPR flop bet, graded in chips: the headline, the
 * split, and the costliest mistakes (tap one for why).
 */
function LowSprGrades({ block }) {
  const t = flopTally(block)
  if (!t) return null
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-2.5">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="num text-xl font-bold">{t.mistake}</span>{' '}
          <span className="text-sm text-muted">mistake{t.mistake === 1 ? '' : 's'} of {t.n} graded</span>
        </div>
        {t.cost > 0 && <span className="num text-xl font-bold text-loss">−{t.cost}bb</span>}
      </div>
      <div className="mt-0.5 text-[11px] text-faint">
        {t.correct} correct · {t.close} close. {t.missed} fold{t.missed === 1 ? '' : 's'} where continuing was better
        {t.missedBb > 0 && ` (−${t.missedBb}bb)`}, {t.bad} continue{t.bad === 1 ? '' : 's'} where folding was
        {t.badBb > 0 && ` (−${t.badBb}bb)`}.
        {t.ungraded > 0 && ` ${t.ungraded} multiway spots not graded.`}
      </div>
      {block.costliest?.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Costliest</div>
          {block.costliest.map((g) => (
            <GradeRow key={g.hand_id} g={g} />
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-faint">
        Against what this pool bets on that board, learned from the hands it showed. Estimates, not solver answers.
      </p>
    </div>
  )
}

/** One graded decision: your cards, the board, the spot and the cost. Tap for why. */
function GradeRow({ g }) {
  const [open, setOpen] = useState(false)
  const v = flopVerdict(g)
  const w = open ? flopWhy(g) : null
  return (
    <div className="border-t border-white/5 py-2 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-[13px]"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <Cards cards={g.cards} small />
            <span className="text-faint">on</span>
            <Cards cards={g.board} small />
          </span>
          <span className="truncate text-[11px] text-muted">{flopSpot(g)}</span>
        </span>
        <span className={`num shrink-0 ${GTONE[v.tone]}`}>
          {v.value} <span className="text-faint">{open ? '▴' : '▾'}</span>
        </span>
      </button>
      {w && (
        <div className="mt-2 rounded-xl bg-surface p-2.5 text-[12.5px] leading-relaxed text-muted">
          <div className={`mb-0.5 font-semibold ${GTONE[v.tone]}`}>
            {v.mark} {v.text}
          </div>
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
      )}
    </div>
  )
}
