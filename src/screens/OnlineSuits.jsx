import { useState } from 'react'
import { Segmented } from '../components/ui.jsx'
import { formatPct, formatSignedUSD } from '../lib/online.js'
import { gradeTone } from '../lib/recap.js'
import { DIMENSION_TABS, findingSentence, moneyReadable, quietSentence } from '../lib/suits.js'

/*
  Which tournaments suit you (Phase 8 step 7), from PokerEdge's core/suits.py
  (play.suits). Absent in older files.

  Leads with the verdict: the findings the beast found (cells that play apart
  from the rest on like-for-like spots, at 3 standard errors), or a plain
  "nothing stands out yet". Below it, one cut at a time: decision accuracy
  first, because it ignores luck; money beside it, faded until a cell holds
  enough tournaments to read, and absent for the per-decision cuts (stage,
  night), where a decision has no money of its own.
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const TONE = { gain: 'text-gain', accent: 'text-accent', loss: 'text-loss', muted: 'text-muted' }

/** @param {{s: object}} props  summary.play.suits */
export default function Suits({ s }) {
  const dims = s?.dimensions || []
  const [key, setKey] = useState(dims[0]?.key)
  if (!dims.length) return null
  const dim = dims.find((d) => d.key === key) || dims[0]
  const perTournament = dim.per === 'tournament'

  return (
    <div className="card p-3.5">
      <div className={title}>Which tournaments suit you</div>
      <p className="mb-2.5 text-[11px] text-faint">
        How well you decide in each kind of tournament and moment. Accuracy ignores luck, so it shows the pattern long before
        money does.
      </p>

      <div className="mb-3 space-y-1.5 rounded-xl bg-surface-2 p-2.5 text-[13px]">
        {s.findings.length ? (
          s.findings.map((f) => (
            <p key={`${f.dimension}:${f.key}`} className={f.diff > 0 ? 'text-gain' : 'text-loss'}>
              {findingSentence(f)}
            </p>
          ))
        ) : (
          <p className="text-muted">{quietSentence(s)}</p>
        )}
      </div>

      <Segmented
        size="sm"
        value={dim.key}
        onChange={setKey}
        options={dims.map((d) => ({ value: d.key, label: DIMENSION_TABS[d.key] || d.label }))}
      />

      {dim.rows.length ? (
        <table className="num mt-2.5 w-full table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-[4.25rem]" />
            {perTournament && <col className="w-[2.5rem]" />}
            {perTournament && <col className="w-[4.25rem]" />}
          </colgroup>
          <thead>
            <tr className="text-left text-xs text-faint">
              <th className="pb-1.5 font-medium">{dim.label}</th>
              <th className="pb-1.5 text-right font-medium">Accuracy</th>
              {perTournament && <th className="pb-1.5 text-right font-medium">Tns</th>}
              {perTournament && <th className="pb-1.5 text-right font-medium">ROI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {dim.rows.map((r) => (
              <tr key={r.key}>
                <td className="py-2 pr-2">
                  <div>{r.label}</div>
                  <div className="text-[11px] text-faint">
                    {r.decisions ? `${r.decisions.toLocaleString('en-CA')} decisions` : 'not graded'}
                    {perTournament && r.money?.net !== undefined && ` · ${formatSignedUSD(r.money.net)}`}
                  </div>
                </td>
                <td className="py-2 text-right">
                  {r.accuracy === null ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <>
                      <span className={r.grade ? '' : 'text-muted'}>{formatPct(r.accuracy)}</span>
                      {r.grade && <span className={`ml-1 text-xs font-semibold ${TONE[gradeTone(r.grade)]}`}>{r.grade}</span>}
                    </>
                  )}
                </td>
                {perTournament && <td className="py-2 text-right text-muted">{r.money?.n ?? '—'}</td>}
                {perTournament && (
                  <td
                    className={`py-2 text-right ${
                      !moneyReadable(r) ? 'text-faint' : r.money.roi >= 0 ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {r.money?.roi === null || r.money?.roi === undefined ? '—' : formatPct(r.money.roi, { signed: true })}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-2.5 text-[12.5px] text-muted">
          {dim.key === 'field'
            ? 'Field size comes only from tournament summaries, and none has been recorded yet. It fills in from the next import.'
            : 'Nothing to show yet.'}
        </p>
      )}

      <p className="mt-2 text-[11px] text-faint">
        {perTournament
          ? `ROI is faded under ${s.min_tournaments} tournaments — at these stakes one cash swings it. Satellites and Power Path are judged on seats won, never graded.`
          : 'Each decision counts by when it was made, so this cut has no money.'}
        {dim.unknown ? ` ${dim.unknown} ${perTournament ? 'tournaments' : 'decisions'} could not be placed.` : ''} Both players on
        the account are mixed in.
      </p>
    </div>
  )
}
