import { Tile } from '../components/ui.jsx'
import { formatSignedUSD, formatUSD } from '../lib/online.js'
import { formatDay } from '../lib/time.js'

/**
 * Goal — where the online bankroll stands on the way to US$1,000, and when to
 * take money out.
 *
 * Everything is computed by PokerEdge (core/bankroll.py) and arrives in the
 * summary's `bankroll` block; this screen only lays it out. The balance is
 * typed in on the laptop from the PokerStars cashier now and then; between two
 * of those it is an estimate (last confirmed + results since), and the screen
 * says so.
 */
export default function Goal({ bankroll: b }) {
  if (!b) {
    return (
      <div className="card p-5 text-sm text-muted">
        No balance has been entered yet. It shows up here after the next update from the laptop.
      </div>
    )
  }

  const confirmedDay = formatDay(b.confirmed.at.slice(0, 10))
  const moved = b.since.results + b.since.flows

  return (
    <>
      <div className="card-hero p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">Bankroll · estimated</div>
        <div className="num mt-1 text-[40px] leading-tight font-bold tracking-tight">{formatUSD(b.estimate)}</div>
        <div className="mt-1 text-sm text-muted">
          {formatUSD(b.confirmed.amount)} confirmed {confirmedDay}
          {b.since.tournaments > 0 || moved !== 0 ? (
            <>
              {' · '}
              <span className={moved > 0 ? 'text-gain' : moved < 0 ? 'text-loss' : ''}>{formatSignedUSD(moved)}</span>{' '}
              since ({b.since.tournaments} tournament{b.since.tournaments === 1 ? '' : 's'})
            </>
          ) : null}
        </div>
        <GoalBar value={b.estimate} goal={b.goal} />
      </div>

      <Next b={b} />

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Play now" sub={`shots ${b.buy_ins.shots}`}>
          {b.buy_ins.regular}
        </Tile>
        <Tile label="Taken out" sub={b.withdrawn.list.length ? `${b.withdrawn.list.length} withdrawal${b.withdrawn.list.length === 1 ? '' : 's'}` : 'nothing yet'}>
          {Math.round(b.withdrawn.cad)} CAD
          {b.withdrawn.usd > 0 && <span className="text-base text-muted"> + {formatUSD(b.withdrawn.usd)}</span>}
        </Tile>
      </div>

      <Ladder b={b} />

      <p className="px-1 text-xs text-faint">
        The balance is read off the PokerStars cashier now and then. In between, each tournament&apos;s result is
        added to it, so the figure drifts a little until the next check. Shots are the occasional bigger tournament,
        about one in four or five. Below a milestone you dropped under, play that level&apos;s buy-ins.
      </p>
    </>
  )
}

/** Thin progress bar toward the US$1,000 bankroll. */
function GoalBar({ value, goal }) {
  const pct = Math.max(0, Math.min(100, (100 * value) / goal))
  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="num mt-1 flex justify-between text-xs text-faint">
        <span>{Math.round(pct)}% of the goal</span>
        <span>{formatUSD(goal)} bankroll</span>
      </div>
    </div>
  )
}

/** The one thing to aim for right now: the next milestone (or the cruise rule). */
function Next({ b }) {
  const n = b.next
  const togo = Math.max(0, n.target - b.estimate)
  const span = n.target - n.from
  const pct = span > 0 ? Math.max(0, Math.min(100, (100 * (b.estimate - n.from)) / span)) : 100

  let title
  let detail
  if (n.kind === 'milestone') {
    title = n.reached ? `Milestone reached: ${formatUSD(n.target)}` : `Next milestone: ${formatUSD(n.target)}`
    detail = n.reached
      ? `Time to take out ${n.withdraw_cad} CAD (about ${formatUSD(n.withdraw_usd)}). That leaves about ${formatUSD(n.leaves)} to keep climbing.`
      : `Then take out ${n.withdraw_cad} CAD (about ${formatUSD(n.withdraw_usd)}) and keep about ${formatUSD(n.leaves)} playing.`
  } else if (n.kind === 'goal') {
    title = `Last stretch: ${formatUSD(n.target)}`
    detail = 'The withdrawal steps are done. Next stop is the full bankroll.'
  } else {
    title = n.reached ? 'Above the ceiling: time for a withdrawal' : `Bankroll reached: ${formatUSD(b.goal)}`
    detail = n.reached
      ? `Take out about ${formatUSD(n.withdraw_usd)} to bring it back to ${formatUSD(b.goal)}.`
      : `From here, whenever it passes ${formatUSD(b.cruise_ceiling)}, take it back down to ${formatUSD(b.goal)}.`
  }

  return (
    <div className={`card p-4 ${n.reached ? 'ring-1 ring-accent/60' : ''}`}>
      <div className={`font-semibold ${n.reached ? 'text-accent' : ''}`}>{title}</div>
      <p className="mt-1 text-sm text-muted">{detail}</p>
      {!n.reached && n.kind !== 'cruise' && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <div className="num mt-1 flex justify-between text-xs text-faint">
            <span>{formatUSD(n.from)}</span>
            <span>{formatUSD(togo)} to go</span>
          </div>
        </>
      )}
    </div>
  )
}

/** Every step of the plan, ticked off as withdrawals are taken. */
function Ladder({ b }) {
  const nextIndex = b.ladder.findIndex((s) => !s.done)
  return (
    <div className="card p-3.5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">The plan</div>
      <table className="num w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-faint">
            <th className="pb-1.5 font-medium">Reach</th>
            <th className="pb-1.5 text-right font-medium">Take out</th>
            <th className="pb-1.5 text-right font-medium">Keep</th>
            <th className="w-6 pb-1.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {b.ladder.map((s, i) => (
            <tr key={s.target} className={s.done ? 'text-faint' : i === nextIndex ? 'text-ink' : 'text-muted'}>
              <td className={`py-2 ${i === nextIndex ? 'font-semibold' : ''}`}>{formatUSD(s.target)}</td>
              <td className="py-2 text-right">{s.withdraw_cad} CAD</td>
              <td className="py-2 text-right">~{formatUSD(s.leaves)}</td>
              <td className="py-2 text-right">{s.done ? '✓' : i === nextIndex ? <span className="text-accent">●</span> : ''}</td>
            </tr>
          ))}
          <tr className={nextIndex === -1 ? 'text-ink' : 'text-muted'}>
            <td className="py-2 font-semibold text-accent">{formatUSD(b.goal)}</td>
            <td className="py-2 text-right" colSpan={2}>
              the bankroll
            </td>
            <td />
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">
        Once there, whenever it passes {formatUSD(b.cruise_ceiling)}, take it back down to {formatUSD(b.goal)}.
      </p>
    </div>
  )
}
