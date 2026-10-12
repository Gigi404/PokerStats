import { BAND_ARROW, band, formatPct } from '../lib/online.js'

/*
  Opening by seat and stack, from PokerEdge's analysis/open_ranges.py.
  First-in raise % (a min-raise or a shove), regular tables, in three stack
  bands. Under 15bb the typical band is the push/fold chart's shoving range
  at your own stacks, so it is a floor; above, rough published ranges.
  Counted, not graded — the 15–25bb folds that shoving beat are graded
  separately (missed steals, on the short-stack card).
*/

// Below this many spots a cell is shown but not compared with typical.
const MIN_SPOTS = 20

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const TONE = { low: 'text-accent', high: 'text-accent', ok: 'text-gain' }

/**
 * @param {{o: object}} props  summary.play.open_ranges (absent in older files)
 */
export default function OpenRanges({ o }) {
  if (!o || !o.hero?.n) return null
  return (
    <div className="card p-3.5">
      <div className={title}>Opening by stack</div>
      <p className="mb-2 text-[11px] text-faint">
        First in, regular tables: how often you raise (min-raise or shove). Under each: typical · this pool.
      </p>
      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col className="w-11" />
          {o.bands.map((b) => <col key={b.key} />)}
        </colgroup>
        <thead>
          <tr className="text-xs text-faint">
            <th className="pb-1.5 text-left font-medium">Seat</th>
            {o.bands.map((b) => (
              <th key={b.key} className="pb-1.5 text-right font-medium">
                {b.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {o.rows.map((r) => (
            <tr key={r.seat}>
              <td className="py-2 align-top text-xs font-semibold text-muted">{r.seat}</td>
              {o.bands.map((b) => (
                <Cell key={b.key} c={r.cells[b.key]} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-faint">
        Under 15bb, typical is the push/fold chart’s shoving range at your stacks — a floor, since a min-raise range is
        no tighter. Deeper, rough published ranges. Cells under {MIN_SPOTS} spots are faded and not judged.
      </p>
    </div>
  )
}

function Cell({ c }) {
  if (!c || !c.hero.n) {
    return <td className="py-2 text-right align-top text-faint">—</td>
  }
  const enough = c.hero.n >= MIN_SPOTS
  const b = enough && c.typical ? band(c.hero.pct, c.typical) : null
  return (
    <td className="py-2 text-right align-top">
      <div className={b ? TONE[b] : enough ? '' : 'text-faint'}>
        {b && BAND_ARROW[b]}
        {formatPct(c.hero.pct)}
        <span className="text-[10px] text-faint"> ·{c.hero.n}</span>
      </div>
      <div className="text-[11px] text-faint">
        {c.typical ? `${c.typical[0]}–${c.typical[1]}` : '—'} · {formatPct(c.pool.pct)}
      </div>
    </td>
  )
}
