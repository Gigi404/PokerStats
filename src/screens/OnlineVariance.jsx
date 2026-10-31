import { buyInText, rangeText, sampleText, varianceHeadline } from '../lib/variance.js'

/*
  How much is luck (2026-10-31), from PokerEdge's core/variance.py
  (play.variance). Absent in older files. A verdict first, the ROI with and
  without the best tournament, how many tournaments it would take to know, and
  how fragile the balance is at each buy-in.
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const TONE = { gain: 'text-gain', muted: 'text-muted' }

/** @param {{v: object}} props  summary.play.variance */
export default function Variance({ v }) {
  if (!v) return null
  const h = varianceHeadline(v)
  return (
    <div className="card p-3.5">
      <div className={title}>How much is luck</div>
      <p className="mb-2.5 text-[11px] text-faint">
        Your {v.n.toLocaleString('en-CA')} paid tournaments, reshuffled thousands of times to see what your results could really mean.
      </p>
      <div className={`mb-3 rounded-xl bg-surface-2 p-2.5 text-[13px] ${TONE[h.tone]}`}>{h.text}</div>

      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-[3.75rem]" />
          <col className="w-[7.5rem]" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-faint">
            <th className="pb-1.5 font-medium" />
            <th className="pb-1.5 text-right font-medium">ROI</th>
            <th className="pb-1.5 text-right font-medium">Likely range</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {[['All tournaments', v.all], ['Without your best', v.without_best]].map(([label, s]) => (
            <tr key={label}>
              <td className="py-2 pr-2">
                <div>{label}</div>
                <div className="text-[11px] text-faint">{sampleText(v, s)}</div>
              </td>
              <td className="py-2 text-right">{Math.round(s.roi)}%</td>
              <td className="py-2 text-right text-muted">{rangeText(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-faint">
        The tournament count is how many it takes to know your ROI to within {v.target_roi} points. Your best result was $
        {v.best.net.toFixed(2)}, {v.best.share}% of your profit.
      </p>

      {v.ruin?.length > 0 && (
        <>
          <div className="mt-3 text-sm font-semibold">How fragile is ${v.balance.toFixed(2)}?</div>
          <p className="mb-1 text-[11px] text-faint">
            The chance of not being able to buy in within the next {v.horizon} tournaments, if nothing is added or taken out.
          </p>
          <table className="num w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-xs text-faint">
                <th className="pb-1 font-medium">Every buy-in at</th>
                <th className="pb-1 text-right font-medium">With your best</th>
                <th className="pb-1 text-right font-medium">Without it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {v.ruin.map((r) => (
                <tr key={r.buy_in}>
                  <td className="py-1.5">{buyInText(r.buy_in)}</td>
                  <td className="py-1.5 text-right text-muted">{Math.round(r.with_best)}%</td>
                  <td className="py-1.5 text-right text-muted">{Math.round(r.without_best)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p className="mt-2 text-[11px] text-faint">
        All of this assumes the future looks like your past, and both players on the account are mixed in. An estimate, not a promise.
      </p>
    </div>
  )
}
