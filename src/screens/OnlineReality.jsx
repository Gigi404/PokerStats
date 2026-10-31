import { bbCallsLine, bbHeadline, realisationHeadline, realisationVerdict } from '../lib/reality.js'

/*
  Do the grades hold up (2026-10-31), from PokerEdge's analysis/reality.py
  (play.reality). Absent in older files. Two graders checked against the chips
  your hands really made. A check on the app, not on your play.
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const STREET = { flop: 'Flop', turn: 'Turn' }
const SIDE = { ip: 'in position', oop: 'out of position' }

/** @param {{r: object}} props  summary.play.reality */
export default function Reality({ r }) {
  if (!r) return null
  const calls = bbCallsLine(r.bb)
  return (
    <div className="card p-3.5">
      <div className={title}>Do the grades hold up</div>
      <p className="mb-2.5 text-[11px] text-faint">
        The app’s grades rest on estimates. These two are checked here against the chips your hands really made.
      </p>

      <div className="text-sm font-semibold">Calling after the flop</div>
      <p className="mb-1 text-[13px] text-muted">{realisationHeadline(r.realisation)}</p>
      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-[3.5rem]" />
          <col className="w-[6rem]" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-faint">
            <th className="pb-1 font-medium">Share of your equity collected</th>
            <th className="pb-1 text-right font-medium">Real</th>
            <th className="pb-1 text-right font-medium">Likely range</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {r.realisation.map((x) => (
            <tr key={x.street + x.side}>
              <td className="py-1.5 pr-2">
                <div>{STREET[x.street]}, {SIDE[x.side]}</div>
                <div className="text-[11px] text-faint">
                  {x.n} calls · assumed {Math.round(x.guess_low * 100)}–100% · {realisationVerdict(x)}
                </div>
              </td>
              <td className="py-1.5 text-right">{x.n ? `${Math.round(x.measured * 100)}%` : '—'}</td>
              <td className="py-1.5 text-right text-muted">
                {x.n ? `${Math.round(x.low * 100)}–${Math.round(x.high * 100)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 text-sm font-semibold">Big blind calls</div>
      <p className="text-[13px] text-muted">{bbHeadline(r.bb)}</p>
      {calls && <p className="mt-1 text-[13px] text-muted">{calls}</p>}
      <p className="mt-2 text-[11px] text-faint">
        Above zero means calling beat folding. Only calls can be checked: a fold’s result is never seen, and players choose which hands
        they call with. The ranges are wide, and both players on the account are mixed in.
      </p>
    </div>
  )
}
