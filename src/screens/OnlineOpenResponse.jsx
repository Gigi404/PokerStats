import { useState } from 'react'
import { Segmented } from '../components/ui.jsx'
import { formatPct } from '../lib/online.js'

/*
  "When you open": how the table answered your first-in raises, by size,
  from PokerEdge's analysis/open_response.py (play.open_response). How often
  everyone folded, someone called, or someone 3-bet; what the big blind did;
  and where the hands callers showed down sit as "top X%" of all starting
  hands. Counted, not graded. Absent in older files.
*/

const MIN_OPENS = 20       // fewer opens than this: shown faded
const MIN_SHOWN = 8        // fewer shown hands than this: no range line
const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'

const ROWS = [
  ['Everyone folds', (b) => b.all_fold],
  ['Called', (b) => b.called],
  ['3-bet', (b) => b.threebet],
  ['BB calls', (b) => b.bb.call],
  ['BB 3-bets', (b) => b.bb['3-bet']],
]

/** @param {{r: object}} props  summary.play.open_response */
export default function OpenResponse({ r }) {
  const [game, setGame] = useState('tournament')
  if (!r || !r.tournament) return null
  const blocks = r[game]
  const sizes = r.sizes.filter((s) => blocks[s.key]?.n)
  return (
    <div className="card p-3.5">
      <div className={title}>When you open</div>
      <p className="mb-2 text-[11px] text-faint">
        How the table answered your first-in raises, by size{game === 'tournament' ? ' (15–60bb stacks)' : ''}.
      </p>
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
        <thead>
          <tr className="text-[11px] text-faint">
            <th className="pb-1 text-left font-normal">Open to</th>
            {sizes.map((s) => (
              <th key={s.key} className="pb-1 text-right font-normal">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {ROWS.map(([label, get]) => (
            <tr key={label}>
              <td className="py-1.5 text-muted">{label}</td>
              {sizes.map((s) => (
                <td key={s.key} className={`py-1.5 text-right ${blocks[s.key].n < MIN_OPENS ? 'text-faint' : ''}`}>
                  {formatPct(get(blocks[s.key]))}
                </td>
              ))}
            </tr>
          ))}
          <tr className="text-[11px] text-faint">
            <td className="py-1.5">Opens</td>
            {sizes.map((s) => (
              <td key={s.key} className="py-1.5 text-right">
                {blocks[s.key].n}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className={`${title} mt-3`}>What callers showed</div>
      <div className="space-y-1.5 text-[13px]">
        {sizes.map((s) => {
          const sh = blocks[s.key].shown
          if (!sh || sh.n < MIN_SHOWN) {
            return (
              <div key={s.key} className="text-faint">
                {s.label}: {sh?.n || 0} shown — too few to read.
              </div>
            )
          }
          return (
            <div key={s.key}>
              <span className="font-semibold">{s.label}:</span> half between the top {sh.q25}% and top {sh.q75}% of hands
              <span className="text-faint"> · {sh.examples.join(' ')}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-faint">
        Shown hands only reach showdown, so the real calling range is likely wider. Under {MIN_OPENS} opens is faded.
      </p>
    </div>
  )
}
