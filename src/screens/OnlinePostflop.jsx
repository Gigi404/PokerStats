import { useState } from 'react'
import { Segmented } from '../components/ui.jsx'
import { FlopGradeRow } from './OnlineFlop.jsx'
import { textureLine } from '../lib/position.js'

/*
  Postflop decisions, from PokerEdge's core/postflop.py (play.postflop): your
  answer to the first bet on the flop (every depth), turn and river, graded
  in chips against what this pool bets there — learned from the hands it
  showed. The river is exact (no card to come); the flop and turn are priced
  all-in when you were committed, otherwise on pot odds across how much
  equity you get to use. Tap a street for its costliest mistakes, then a
  hand for why. Absent in older files.
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const LABEL = { flop: 'Flop', turn: 'Turn', river: 'River' }

/** @param {{p: object}} props  summary.play.postflop */
export default function Postflop({ p }) {
  const [game, setGame] = useState('tournament')
  const [open, setOpen] = useState(null)
  const texture = textureLine(p.flop_texture?.[game])
  if (!p || !p.streets) return null
  const streets = p.streets.filter((s) => p[s])
  return (
    <div className="card p-3.5">
      <div className={title}>Facing a bet after the flop</div>
      <p className="mb-2 text-[11px] text-faint">
        The first bet on each street, by someone else: did you fold, call or raise right? Tap a street.
      </p>
      <div className="mb-2">
        <Segmented
          size="sm"
          value={game}
          onChange={(v) => {
            setGame(v)
            setOpen(null)
          }}
          options={[
            { value: 'tournament', label: 'Tournaments' },
            { value: 'cash', label: 'Cash' },
          ]}
        />
      </div>
      <div className="divide-y divide-white/5">
        {streets.map((s) => {
          const b = p[s][game]
          if (!b || !b.n) {
            return (
              <div key={s} className="py-2 text-sm text-faint">
                {LABEL[s]} — nothing graded
              </div>
            )
          }
          const isOpen = open === s
          return (
            <div key={s} className="py-2">
              <button type="button" onClick={() => setOpen(isOpen ? null : s)} aria-expanded={isOpen}
                className="flex w-full items-baseline justify-between gap-2 text-left">
                <span className="text-sm font-semibold">{LABEL[s]}</span>
                <span className="num text-sm">
                  {b.mistake} of {b.n} mistakes
                  {b.cost_bb > 0 && <span className="text-loss"> · −{b.cost_bb}bb</span>}{' '}
                  <span className="text-faint">{isOpen ? '▴' : '▾'}</span>
                </span>
              </button>
              <div className="num mt-0.5 text-[11px] text-faint">
                {b.correct} correct · {b.close} close · {b.missed} fold{b.missed === 1 ? '' : 's'} that should have continued
                {b.missed_bb > 0 && ` (−${b.missed_bb}bb)`} · {b.bad_continue} continue{b.bad_continue === 1 ? '' : 's'} that should have folded
              </div>
              {isOpen && (
                <div className="mt-1.5 rounded-xl bg-surface-2 p-2">
                  {b.costliest.length === 0 ? (
                    <p className="py-2 text-center text-[12px] text-faint">No mistakes on this street.</p>
                  ) : (
                    b.costliest.map((g) => <FlopGradeRow key={g.hand_id + s} g={g} />)
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-faint">
        Multiway pots (someone called before you) are not graded. Estimates against this pool, not solver answers.
        {texture && ` Flop mistakes by board: ${texture}.`}
      </p>
    </div>
  )
}
