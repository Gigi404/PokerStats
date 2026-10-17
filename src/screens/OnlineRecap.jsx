import Cards from '../components/Cards.jsx'
import { canReplay } from '../lib/replay.js'
import { formatSignedUSD, outcomeLabel } from '../lib/online.js'
import {
  exampleWhere,
  gradeSentence,
  gradeTone,
  lessonText,
  luckLine,
  minutesFrom,
  tierShares,
  TIER_TONE,
  turningText,
} from '../lib/recap.js'

/*
  The tournament recap (Phase 8, PokerEdge core/tourney_recap.py): what the
  review opens on. Top to bottom, as the owner chose from mockups on
  2026-10-17: the grade, what to work on, the tournament as a timeline, and
  "how it went" — the turning points, numbered to match the timeline. The
  dense detail (every decision, the stats, every key hand) sits one tap
  further down, in the review itself.

  Only shown for files that carry `review.recap`; older ones keep the old
  review.
*/

const title = 'mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const TONE_TEXT = { gain: 'text-gain', loss: 'text-loss', accent: 'text-accent', muted: 'text-muted' }
const TONE_FILL = { gain: 'var(--color-gain)', loss: 'var(--color-loss)', accent: 'var(--color-accent)', muted: 'var(--color-muted)' }

/**
 * @param {{review: object, entry: object, onReplay: (hand: object, heading: string) => void}} props
 *   review: one tournament of summary.recent_days; entry: its history row;
 *   onReplay: opens the replay of a key hand.
 */
export default function Recap({ review, entry, onReplay }) {
  const recap = review.recap
  return (
    <>
      <GradeCard recap={recap} entry={entry} luck={review.luck} />
      <WorkOn recap={recap} />
      <Timeline review={review} recap={recap} />
      <HowItWent review={review} recap={recap} onReplay={onReplay} />
    </>
  )
}

function GradeCard({ recap, entry, luck }) {
  const g = recap.grade
  const tone = gradeTone(g.grade)
  const luckL = luckLine(luck)
  return (
    <div className="card-hero space-y-3 p-4">
      <div className="flex items-center gap-4">
        <div
          className={`num flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[3px] text-[34px] font-extrabold ${
            TONE_TEXT[tone]
          } ${{ gain: 'border-gain', loss: 'border-loss', accent: 'border-accent', muted: 'border-line' }[tone]}`}
          aria-label={g.grade ? `Grade ${g.grade}` : 'Not graded'}
        >
          {g.grade || '—'}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold">
            {outcomeLabel(entry)}
            {entry.net !== null && !entry.maybe_running && (
              <span className={`num ml-2 ${entry.net > 0 ? 'text-gain' : entry.net < 0 ? 'text-loss' : 'text-muted'}`}>
                {formatSignedUSD(entry.net)}
              </span>
            )}
          </div>
          <div className="num text-xs text-muted">
            {g.accuracy === null ? 'No graded decisions' : `Accuracy ${g.accuracy}% · ${g.decisions} decision${g.decisions === 1 ? '' : 's'}`}
          </div>
          <div className="text-[11px] text-faint">Graded on decisions, not the result</div>
        </div>
      </div>

      <p className="text-[15px] leading-snug">{gradeSentence(recap)}</p>

      {g.decisions > 0 && (
        <div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {tierShares(g).map((x) => (
              <div key={x.key} className={x.cls} style={{ width: `${x.pct}%` }} />
            ))}
          </div>
          <div className="num mt-1.5 flex flex-wrap justify-between gap-x-3 text-[11px] text-muted">
            <span>{g.right} right</span>
            <span>{g.inaccuracies} inaccurac{g.inaccuracies === 1 ? 'y' : 'ies'}</span>
            <span className="text-accent">{g.mistakes} mistake{g.mistakes === 1 ? '' : 's'}</span>
            <span className="text-loss">{g.blunders} blunder{g.blunders === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}

      {luckL && <div className={`text-[12.5px] ${TONE_TEXT[luckL.tone]}`}>{luckL.text}</div>}
    </div>
  )
}

function WorkOn({ recap }) {
  if (!recap.work_on.length && !recap.keep) return null
  return (
    <div>
      <div className={`${title} px-1`}>Work on</div>
      <div className="card divide-y divide-white/5 px-3.5">
        {recap.work_on.map((w, i) => {
          const t = lessonText(w)
          return (
            <div key={w.lesson} className="flex gap-3 py-3">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[13px] font-bold text-accent">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{t.title}</div>
                <div className="num text-[13px] text-muted">{t.detail}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-faint">
                  Like <Cards cards={w.example.cards} small /> {exampleWhere(w.example)}
                </div>
              </div>
            </div>
          )
        })}
        {recap.keep && (
          <div className="flex gap-3 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gain/15 text-[13px] font-bold text-gain">✓</span>
            <div>
              <div className="text-[15px] font-semibold">
                Keep it: {{ short_stack: 'short-stack all-ins', bb: 'the big blind', postflop: 'after the flop' }[recap.keep.group]}
              </div>
              <div className="num text-[13px] text-muted">
                {recap.keep.right} of {recap.keep.decisions} right
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/**
 * The tournament on a real time axis: the stack, blind levels as stripes,
 * numbered turning points and every mistake as a tick under the axis.
 */
function Timeline({ review, recap }) {
  const stack = review.stack_bb || []
  const times = review.times || []
  if (stack.length < 3 || times.length !== stack.length - 1) return null

  const W = 340
  const H = 190
  const pad = { l: 24, r: 10, t: 18, b: 40 }
  const mins = minutesFrom(times)
  const total = Math.max(mins.at(-1) + 1, 1)
  const at = (i) => (i < mins.length ? mins[i] : total) // minute of hand i; after the last: the end
  const x = (m) => pad.l + (m / total) * (W - pad.l - pad.r)
  const max = Math.max(...stack, 1) * 1.08
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
  const base = H - pad.b

  const line = stack.map((v, i) => `${i ? 'L' : 'M'}${x(at(i)).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const levels = (review.levels || []).map((l, j, all) => ({
    ...l,
    x0: x(at(l.i)),
    x1: x(j + 1 < all.length ? at(all[j + 1].i) : total),
  }))
  // A level's "sb/bb" label is drawn only where it fits and clears the last
  // label drawn (8px digits are ~4.6px wide), so late, short levels don't pile up.
  let labelEnd = -Infinity
  for (const l of levels) {
    const w = `${l.sb}/${l.bb}`.length * 4.6
    l.label = l.x0 >= labelEnd + 4 && l.x0 + w <= W - pad.r
    if (l.label) labelEnd = l.x0 + w
  }
  const stretch = recap.turning_points.find((p) => p.kind === 'stretch')

  // Mistake ticks, stacked when they share a 4px column.
  const columns = {}
  const ticks = recap.mistakes.map((m) => {
    const col = Math.round(x(at(m.i)) / 4)
    const row = (columns[col] = (columns[col] ?? -1) + 1)
    return { ...m, cx: col * 4, cy: base + 4 + row * 6 }
  })

  const markers = recap.turning_points.map((p, k) => {
    const i = p.kind === 'stretch' ? p.i : p.i + 1
    return { n: k + 1, cx: x(at(i)), cy: Math.max(pad.t + 2, y(stack[Math.min(i, stack.length - 1)]) - 11), tone: markerTone(p) }
  })

  return (
    <div className="card p-3">
      <div className={title}>The tournament, minute by minute</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={timelineLabel(review, recap, times)}>
        {levels.map((l, j) => (
          <g key={l.i}>
            {j % 2 === 0 && <rect x={l.x0} y={pad.t} width={Math.max(l.x1 - l.x0, 0)} height={base - pad.t} fill="white" fillOpacity="0.035" />}
            {l.label && (
              <text x={l.x0 + 2} y={pad.t - 6} fontSize="8" fill="var(--color-faint)">
                {l.sb}/{l.bb}
              </text>
            )}
          </g>
        ))}
        {stretch && (
          <rect
            x={x(at(stretch.i))}
            y={pad.t}
            width={Math.max(x(at(stretch.i_end + 1)) - x(at(stretch.i)), 2)}
            height={base - pad.t}
            fill="var(--color-accent)"
            fillOpacity="0.09"
          />
        )}
        <line x1={pad.l} x2={W - pad.r} y1={base} y2={base} stroke="var(--color-line)" />
        {[10, Math.round(max / 1.08)].filter((v) => v < max).map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeDasharray="2 4" />
            <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" fontSize="8" fill="var(--color-faint)">
              {v}
            </text>
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--color-ink)" strokeWidth="1.7" strokeLinejoin="round" />
        {ticks.map((t) => (
          <rect key={t.hand_id + t.cy} x={t.cx - 1.5} y={t.cy} width="3" height="5" rx="0.5" fill={TONE_FILL[TIER_TONE[t.tier]]} />
        ))}
        {markers.map((m) => (
          <g key={m.n}>
            <circle cx={m.cx} cy={m.cy} r="7.5" fill={TONE_FILL[m.tone]} />
            <text x={m.cx} y={m.cy + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--color-bg)">
              {m.n}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 3} fontSize="8.5" fill="var(--color-faint)">
          {times[0]} start
        </text>
        <text x={W - pad.r} y={H - 3} textAnchor="end" fontSize="8.5" fill="var(--color-faint)">
          {times.at(-1)} end · {Math.round(total)} min
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-muted">
        <span>
          <span className="text-muted">▮</span> inaccuracy
        </span>
        <span>
          <span className="text-accent">▮</span> mistake
        </span>
        <span>
          <span className="text-loss">▮</span> blunder
        </span>
        <span>stripes: blind levels</span>
        {stretch && <span className="text-accent">shaded: where mistakes bunched up</span>}
      </div>
    </div>
  )
}

function markerTone(p) {
  if (p.kind === 'stretch') return 'accent'
  if (p.bust) return 'muted'
  return p.net_bb > 0 ? 'gain' : p.net_bb < 0 ? 'loss' : 'muted'
}

function timelineLabel(review, recap, times) {
  const s = review.stack_bb
  return `Stack from ${s[0]} big blinds at ${times[0]} to ${s.at(-1)} at ${times.at(-1)}, ${recap.mistakes.length} mistakes marked, ${recap.turning_points.length} turning points`
}

// ---------------------------------------------------------------------------
// How it went
// ---------------------------------------------------------------------------

function HowItWent({ review, recap, onReplay }) {
  if (!recap.turning_points.length) return null
  const keyHands = Object.fromEntries((review.key_hands || []).map((h) => [String(h.hand_id), h]))
  return (
    <div>
      <div className={`${title} px-1`}>How it went · tap a hand to replay it</div>
      <div className="card divide-y divide-white/5 px-3.5">
        {recap.turning_points.map((p, k) => {
          const id = p.kind === 'stretch' ? p.worst_hand_id : p.hand_id
          const kh = keyHands[String(id)]
          const playable = canReplay(kh)
          const t = turningText(p, kh)
          const key = `${p.kind}-${p.i}`
          return (
            <div key={key} className="py-3">
              <button
                type="button"
                onClick={() => onReplay(kh, `Turning point ${k + 1}`)}
                disabled={!playable}
                className="flex w-full items-start gap-3 text-left disabled:cursor-default"
              >
                <span
                  className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-bg"
                  style={{ background: TONE_FILL[markerTone(p)] }}
                >
                  {k + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                    {kh && <Cards cards={kh.cards} small />}
                    <span className="num">{t.headline}</span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{t.detail}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className={`num text-[13px] font-semibold ${TONE_TEXT[t.tone]}`}>{t.value}</span>
                  {playable && <span className="mt-0.5 text-[11px] text-accent">Replay ›</span>}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
