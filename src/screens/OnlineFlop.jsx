import { useState } from 'react'
import { Segmented } from '../components/ui.jsx'
import { BAND_ARROW, band, formatPct } from '../lib/online.js'

/*
  Flop habits, from PokerEdge's analysis/flop_play.py. Measured, not graded:
  c-bet, fold to c-bet and check-raise against rough published ranges and
  this pool; then the two that matter when the pot is nearly committed
  (SPR under 3) — folding to any bet and betting first — against the pool
  only, since no published range exists for them. The low-SPR spots will be
  graded once built; `low_spr.spots` says how many there are to grade.
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
      <p className="mt-2 text-[11px] text-faint">
        Rough small-stakes ranges: outside is worth a look, not proof of a mistake. Under {MIN_SPOTS} spots is faded
        and not judged.
        {f.low_spr && ` ${f.low_spr.spots} low-SPR bets faced so far (all games) — not graded yet.`}
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
