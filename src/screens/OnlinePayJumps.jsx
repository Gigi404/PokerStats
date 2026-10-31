import Cards from '../components/Cards.jsx'
import { payHeadline, payLabel, stageLine } from '../lib/payJumps.js'

/*
  Pay jumps (2026-10-31), from PokerEdge's analysis/icm_notes.py (play.icm).
  Absent in older files. An ICM estimate beside the chip grade, never a grade:
  the tone stays neutral and nothing here moves a letter or a mistake count.
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'

/** @param {{i: object}} props  summary.play.icm */
export default function PayJumps({ i }) {
  if (!i?.decisions) return null
  return (
    <div className="card p-3.5">
      <div className={title}>Pay jumps</div>
      <p className="mb-2.5 text-[11px] text-faint">
        Near the money a lost chip can cost more than a won chip earns, so folding a hand can be right even when the chips say play.
        An estimate beside your grades. It doesn’t change them.
      </p>
      <div className="mb-3 rounded-xl bg-surface-2 p-2.5 text-[13px] text-muted">{payHeadline(i)}</div>

      {i.spots?.length > 0 && (
        <details>
          <summary className="text-[13px] font-medium">The spots</summary>
          <ul className="divide-y divide-white/5">
            {i.spots.map((s) => (
              <li key={s.hand_id} className="py-2">
                <div className="flex items-center gap-2">
                  <Cards cards={s.cards} small />
                  <span className="text-[11px] text-faint">{s.seat} · {s.stack_bb}bb · {s.date}</span>
                </div>
                <div className="mt-1 text-[13px]">{payLabel(s)}</div>
                <div className="text-[11px] text-faint">{stageLine(s.icm)}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-2 text-[11px] text-faint">
        From {i.tournaments} tournaments that reached the money. Prizes and players left are estimated, and other tables’ stacks are
        assumed average. Bounties aren’t counted here, and a bounty can pay for the risk. Both players on the account are mixed in.
      </p>
    </div>
  )
}
