import Cards from '../components/Cards.jsx'
import { rangeLine, riverHeadline, sizeLabel, spotLabel } from '../lib/riverChoice.js'

/*
  River choices (2026-10-30), from PokerEdge's analysis/river_bet_grading.py
  (play.river_choice). Absent in older files. A verdict first, then the totals
  by game, the costliest spots, and the bluffs to consider, which are tracked
  but never mistakes. Outside the letter grade (owner, 2026-10-30).
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const TONE = { gain: 'text-gain', loss: 'text-loss', muted: 'text-muted' }
const GAMES = [['tournament', 'Tournaments'], ['cash', 'Cash']]

/** One spot: the hand, the board, what happened and what each range holds. */
function Spot({ g, amount }) {
  return (
    <li className="py-2">
      <div className="flex items-center gap-3">
        <Cards cards={g.cards} small />
        <Cards cards={g.board} small />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[13px]">
        <span>{spotLabel(g)}</span>
        <span className="num shrink-0 font-semibold">{amount}bb</span>
      </div>
      <div className="text-[11px] text-faint">
        {g.game === 'cash' ? 'Cash' : 'Tournament'} · pot {g.pot_bb}bb · best size {sizeLabel(g)}
        {g.priced === 'estimated' ? ' · estimate, you acted first' : ''}
      </div>
      <div className="text-[11px] text-faint">{rangeLine(g)}</div>
    </li>
  )
}

/** @param {{r: object}} props  summary.play.river_choice */
export default function RiverChoice({ r }) {
  if (!r?.games) return null
  const h = riverHeadline(r)
  return (
    <div className="card p-3.5">
      <div className={title}>River choices</div>
      <p className="mb-2.5 text-[11px] text-faint">
        When nobody has bet the river, was betting or checking better? Priced on how this pool folds and calls. Not part of your grade.
      </p>
      <div className={`mb-3 rounded-xl bg-surface-2 p-2.5 text-[13px] ${TONE[h.tone]}`}>{h.text}</div>

      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-[4.5rem]" />
          <col className="w-[4.5rem]" />
          <col className="w-[4.5rem]" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-faint">
            <th className="pb-1.5 font-medium" />
            <th className="pb-1.5 text-right font-medium">Missed value</th>
            <th className="pb-1.5 text-right font-medium">Bad bets</th>
            <th className="pb-1.5 text-right font-medium">To consider</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {GAMES.map(([key, label]) => {
            const g = r.games[key]
            if (!g?.n) return null
            return (
              <tr key={key}>
                <td className="py-2 pr-2">
                  <div>{label}</div>
                  <div className="text-[11px] text-faint">{g.n.toLocaleString('en-CA')} choices</div>
                </td>
                <td className="py-2 text-right text-muted">{g.missed_value}</td>
                <td className="py-2 text-right text-muted">{g.bad_bet}</td>
                <td className="py-2 text-right text-muted">{g.consider}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {r.spots?.length > 0 && (
        <details className="mt-3">
          <summary className="text-[13px] font-medium">Costliest spots</summary>
          <ul className="divide-y divide-white/5">
            {r.spots.map((g) => <Spot key={g.hand_id} g={g} amount={g.cost_bb} />)}
          </ul>
        </details>
      )}
      {r.consider?.length > 0 && (
        <details className="mt-3">
          <summary className="text-[13px] font-medium">Bluffs to consider</summary>
          <p className="mt-1 text-[11px] text-faint">
            Not mistakes. Weak hands where a bet might have won the pot. The number is what it could have made if the pool folds as
            usual, which can’t be proven for a bet you never made.
          </p>
          <ul className="divide-y divide-white/5">
            {r.consider.map((g) => <Spot key={g.hand_id} g={g} amount={g.chance_bb} />)}
          </ul>
        </details>
      )}
      <p className="mt-2 text-[11px] text-faint">
        Predictions run a little above real results, so read the bb as upper estimates. Both players on the account are mixed in.
      </p>
    </div>
  )
}
