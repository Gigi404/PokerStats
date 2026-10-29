import { formatPct } from '../lib/online.js'
import { blunderNote, cutTone, signed, tiltHeadline } from '../lib/tilt.js'

/*
  Tilt check (2026-10-29), from PokerEdge's core/tilt.py (play.tilt). Absent
  in older files. A verdict first, then each blow: how often it happened,
  the decisions in the half hour after it, their accuracy, and the gap to
  your usual on the same kind of spots (the number that decides).
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const TONE = { gain: 'text-gain', loss: 'text-loss', muted: 'text-muted' }

/** @param {{t: object}} props  summary.play.tilt */
export default function Tilt({ t }) {
  if (!t?.cuts?.length) return null
  const h = tiltHeadline(t)
  const note = blunderNote(t)
  return (
    <div className="card p-3.5">
      <div className={title}>Tilt check</div>
      <p className="mb-2.5 text-[11px] text-faint">
        Do your decisions get worse in the {t.window_min} minutes after a blow, at any table? Compared on the same kind of
        spots, so a shorter stack after a lost pot isn’t mistaken for tilt.
      </p>
      <div className={`mb-3 rounded-xl bg-surface-2 p-2.5 text-[13px] ${TONE[h.tone]}`}>{h.text}</div>

      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-[4.25rem]" />
          <col className="w-[4.5rem]" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-faint">
            <th className="pb-1.5 font-medium">After…</th>
            <th className="pb-1.5 text-right font-medium">Accuracy</th>
            <th className="pb-1.5 text-right font-medium">Same spots</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {t.cuts.map((c) => (
            <tr key={c.key}>
              <td className="py-2 pr-2">
                <div>{c.label.replace(/^After /, '').replace(/^./, (x) => x.toUpperCase())}</div>
                <div className="text-[11px] text-faint">
                  {c.events.toLocaleString('en-CA')} times · {c.decisions.toLocaleString('en-CA')} decisions after
                </div>
              </td>
              <td className="py-2 text-right text-muted">{formatPct(c.accuracy)}</td>
              <td className={`py-2 text-right font-semibold ${TONE[cutTone(c)]}`}>{signed(c.diff)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {note && <p className="mt-2 text-[12px] text-muted">{note}</p>}
      <p className="mt-2 text-[11px] text-faint">
        Same spots: accuracy points against your usual on the same kind of spot and stack; below zero is worse after the blow.
        Coloured only past {t.finding_se} standard errors; green there is borderline, not a strength. Both players on the account
        are mixed in.
      </p>
    </div>
  )
}
