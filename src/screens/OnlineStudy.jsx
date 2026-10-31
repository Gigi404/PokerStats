import { HABITS, POOL, STUDY_AS_OF } from '../lib/study.js'

/*
  From the coaching videos (Phase 9 item 10), from PokerEdge's
  docs/VIDEO_STUDY.md. Static and dated, like the trust page: what was tested
  on this pool, and what was measured on your own hands.
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'

function List({ head, items }) {
  return (
    <details className="mt-2 first-of-type:mt-0">
      <summary className="text-[13px] font-medium">{head}</summary>
      <ul className="divide-y divide-white/5">
        {items.map((x) => (
          <li key={x.text} className="py-2">
            <div className="text-[13px]">{x.text}</div>
            <div className="text-[11px] text-faint">{x.evidence}</div>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default function Study() {
  return (
    <div className="card p-3.5">
      <div className={title}>Work on: from the videos</div>
      <p className="mb-2.5 text-[11px] text-faint">
        Coaching advice checked against real hands, as of {STUDY_AS_OF}. Shown hands lean toward hands that reached showdown, and both
        players on the account are mixed in.
      </p>
      <List head="This pool" items={POOL} />
      <List head="Your habits" items={HABITS} />
    </div>
  )
}
