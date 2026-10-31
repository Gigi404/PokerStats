import { positionHeadline, sideValue } from '../lib/position.js'

/*
  Position after the flop (Phase 9 item 8), from PokerEdge's analysis/position.py
  (play.position). Absent in older files. Results on heads-up flops, you beside
  the pool. A measure, never a grade.
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const GAMES = [['tournament', 'Tournaments'], ['cash', 'Cash']]

/** @param {{p: object}} props  summary.play.position */
export default function Position({ p }) {
  if (!p?.games) return null
  const min = p.min_read
  const { ip, oop } = p.graded || {}
  return (
    <div className="card p-3.5">
      <div className={title}>Position after the flop</div>
      <p className="mb-2.5 text-[11px] text-faint">
        What you make per hand on heads-up flops, playing last or first, from the flop on. Results, not a grade.
      </p>
      {GAMES.map(([key, label]) => {
        const g = p.games[key]
        if (!g) return null
        return (
          <div key={key} className="mb-3 last:mb-0">
            <div className="mb-1 text-sm font-semibold">{label}</div>
            <table className="num w-full table-fixed text-sm">
              <thead>
                <tr className="text-left text-xs text-faint">
                  <th className="pb-1 font-medium" />
                  <th className="pb-1 text-right font-medium">In position</th>
                  <th className="pb-1 text-right font-medium">Out of position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[['You', g.hero], ['Pool', g.pool]].map(([who, s]) => (
                  <tr key={who}>
                    <td className="py-1.5">{who}</td>
                    <td className="py-1.5 text-right text-muted">{sideValue(s.ip, min)}</td>
                    <td className="py-1.5 text-right text-muted">{sideValue(s.oop, min)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[12.5px] text-muted">{positionHeadline(g, min)}</p>
          </div>
        )
      })}
      {ip?.n > 0 && oop?.n > 0 && (
        <p className="mt-2 text-[12px] text-muted">
          Facing a bet you made {ip.mistakes} mistakes in {ip.n} spots in position, and {oop.mistakes} in {oop.n} out of position.
        </p>
      )}
      <p className="mt-2 text-[11px] text-faint">Both players on the account are mixed in.</p>
    </div>
  )
}
