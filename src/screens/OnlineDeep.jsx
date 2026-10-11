import Cards from '../components/Cards.jsx'
import { band, formatPct } from '../lib/online.js'

/*
  3-betting deep (over 40bb), from PokerEdge's analysis/deep_threebet.py.
  Counted against a typical range and against this pool, never graded: a deep
  3-bet is decided after the flop as much as before it, and nothing prices
  that yet. The hands list is context — all-in equity against the opener's
  usual range, which is one input to a 3-bet, not the answer.
*/

// Below this many spots a rate is shown but not compared with typical.
const MIN_SPOTS = 20

const title = 'mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const BAND_STYLE = { low: 'text-accent', high: 'text-accent', ok: 'text-gain' }
const SIDE = { ip: 'in position', SB: 'small blind', BB: 'big blind' }
const OPENER = { early: 'early', middle: 'middle', BTN: 'button', SB: 'small blind' }
const OPENER_TITLE = { early: 'Early', middle: 'Middle', BTN: 'Button', SB: 'Small blind' }
const ACTION = { call: 'called', fold: 'folded' }

/**
 * @param {{d: object}} props  summary.play.deep_threebet (absent in older files)
 */
export default function DeepThreeBet({ d }) {
  if (!d || !d.hero?.n) return null
  const rows = d.rows.filter((r) => r.hero.n > 0)
  return (
    <div className="card p-3.5">
      <div className={title}>3-betting deep · over {d.min_bb}bb</div>
      <p className="text-sm text-muted">
        You re-raise <span className="num font-semibold text-ink">{formatPct(d.hero.pct)}</span> of the opens you face
        ({d.hero.n}). This pool: <span className="num text-ink">{formatPct(d.pool.pct)}</span>.
      </p>

      <table className="num mt-2 w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-[4.25rem]" />
          <col className="w-12" />
          <col className="w-14" />
        </colgroup>
        <thead>
          <tr className="text-xs text-faint">
            <th className="pb-1.5 text-left font-medium">Open from · you</th>
            <th className="pb-1.5 text-right font-medium">You</th>
            <th className="pb-1.5 text-right font-medium">Pool</th>
            <th className="pb-1.5 text-right font-medium">Typical</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => {
            const enough = r.hero.n >= MIN_SPOTS
            const b = enough ? band(r.hero.pct, r.typical) : null
            return (
              <tr key={r.opener + r.side}>
                <td className="py-2 pr-1">
                  <div>{OPENER_TITLE[r.opener]}</div>
                  <div className="text-[11px] text-faint">
                    you {SIDE[r.side]} · {r.hero.n}
                  </div>
                </td>
                <td className={`py-2 text-right align-top ${enough ? '' : 'text-faint'}`}>
                  <div>{formatPct(r.hero.pct)}</div>
                  {b && <div className={`text-[11px] ${BAND_STYLE[b]}`}>{b}</div>}
                  {!enough && <div className="text-[11px]">few</div>}
                </td>
                <td className="py-2 text-right align-top text-muted">{formatPct(r.pool.pct)}</td>
                <td className="py-2 text-right align-top text-muted">
                  {r.typical[0]}–{r.typical[1]}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-faint">
        One open, nobody called yet, regular tables. A re-raise counts all-in or not. Rows under {MIN_SPOTS} spots
        are shown without a verdict.
      </p>

      {d.hands?.length > 0 && (
        <>
          <div className={`${title} mt-4`}>Strongest hands you didn’t 3-bet</div>
          <div className="divide-y divide-white/5">
            {d.hands.map((h) => (
              <div key={h.hand_id} className="flex items-center gap-3 py-2">
                <Cards cards={h.cards} small />
                <div className="min-w-0 flex-1 text-sm">
                  <div>
                    {ACTION[h.action] || h.action} <span className="text-muted">vs {OPENER[h.opener]} open</span>
                  </div>
                  <div className="num text-[11px] text-faint">
                    you {SIDE[h.seat]} · {Math.round(h.stack_bb)}bb · {shortDate(h.date)}
                  </div>
                </div>
                <div className="num shrink-0 text-right">
                  <div className="text-sm">{h.equity_pct}%</div>
                  <div className="text-[11px] text-faint">vs {h.open_range_pct}% open</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-faint">
            All-in equity against what this opener usually opens. Context, not a verdict: position and how the hand
            plays after the flop count as much.
          </p>
        </>
      )}
    </div>
  )
}

function shortDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
