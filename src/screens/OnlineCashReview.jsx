import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ProfitChart from '../components/ProfitChart.jsx'
import { PractiseContext } from '../hooks/usePractise.js'
import { formatSignedUSD } from '../lib/online.js'
import { handCurve, stakesLabel } from '../lib/cash.js'
import { canReplay } from '../lib/replay.js'
import { formatDay } from '../lib/time.js'
import { GradeCard, WorkOn } from './OnlineRecap.jsx'
import Replay from './OnlineReplay.jsx'
import { Disclosure, Hand, MoreGrades, StatStrip } from './OnlineReview.jsx'

/*
  A cash session's review (2026-11-15, step 3 of the cash work), from
  PokerEdge core/cash_sessions.py `review`. It reuses the tournament review's
  pieces: the grade card, "Work on", key hands with their replay, and every
  graded decision folded below.

  Cash grades cover less than tournament grades: the big blind against one
  raise and the answer to a bet on the flop, turn and river. Opens, 3-bets
  and the all-in decisions are graded for tournaments only, so the screen
  says what the letter is made of.

  No timeline: across several tables a stack line means nothing, so the
  session shows its running net in dollars, hand by hand.
*/

const title = 'mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint'

/** @param {{s: object, onClose: () => void}} props  s: one row of summary.cash.sessions, with `review` */
export default function CashReview({ s, onClose }) {
  const review = s.review
  const [replay, setReplay] = useState(null) // { hand, heading }
  const points = useMemo(() => handCurve(review.curve, s.date), [review, s.date])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !replay && onClose()
    window.addEventListener('keydown', onKey)
    // The page behind must not scroll under the review on iOS.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, replay])

  const graded = review.bb_decisions.length + review.postflop_decisions.length
  const headline = (
    <div className="text-lg font-semibold">
      {s.hands} hands
      <span className={`num ml-2 ${s.net > 0 ? 'text-gain' : s.net < 0 ? 'text-loss' : 'text-muted'}`}>{formatSignedUSD(s.net)}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-bg" role="dialog" aria-modal="true" aria-label="Cash session review">
      {replay && createPortal(<Replay hand={replay.hand} heading={replay.heading} onClose={() => setReplay(null)} />, document.body)}
      <div className="pt-safe pb-safe mx-auto max-w-lg px-4 pb-10">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-bg/90 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">Cash · {stakesLabel(s.stakes)}</div>
            <div className="text-xs text-muted">
              {formatDay(s.date)} · {s.start}–{s.end}
              {s.tables > 1 && ` · ${s.tables} tables`}
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">
            Close
          </button>
        </div>

        <div className="space-y-4">
          <GradeCard recap={review.recap} luck={review.luck} headline={headline} />
          <p className="-mt-2 px-1 text-[11px] text-faint">
            In cash, the grade covers your big blind against one raise and your answers to a bet after the flop. Opens,
            3-bets and all-ins before the flop are not graded in cash yet.
          </p>
          {/* No "Practise these" yet: the puzzle bank holds tournament spots
              only, so it would send a cash leak to tournament puzzles. */}
          <PractiseContext.Provider value={null}>
            <WorkOn recap={review.recap} />
          </PractiseContext.Provider>

          <div className="card p-3.5">
            <div className={title}>How the session went</div>
            <ProfitChart points={points} formatAmount={(c) => formatSignedUSD(c / 100)} itemLabel="Hand" emptyText="Too few hands for a chart." />
          </div>

          <div>
            <div className={`${title} px-1`}>Key hands</div>
            {review.key_hands.length === 0 ? (
              <p className="card p-4 text-sm text-faint">No big pots or all-ins in this one.</p>
            ) : (
              <div className="space-y-2">
                {review.key_hands.map((h) => (
                  <Hand
                    key={h.hand_id}
                    h={h}
                    onReplay={canReplay(h) ? () => setReplay({ hand: h, heading: `Key hand · ${h.time}` }) : null}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="card divide-y divide-white/5">
            <Disclosure label="Every graded decision" count={graded}>
              <MoreGrades review={review} />
            </Disclosure>
            <Disclosure label="Stats" count={null}>
              <div className="card-hero p-4">
                <div className="text-sm text-muted">{review.stats.hands} hands</div>
                <StatStrip stats={review.stats} />
              </div>
            </Disclosure>
          </div>

          <p className="px-1 text-[11px] text-faint">
            The grade is your decision accuracy: right or close scores 100, a mistake costing under 8% of your stack 70,
            under 20% 40, more 0, averaged over the decisions that mattered. Luck counts only all-ins that reached a
            showdown. Judged against what this player pool does; estimates, not exact.
          </p>
        </div>
      </div>
    </div>
  )
}
