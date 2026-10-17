import { useState } from 'react'
import { progressHeadline } from '../lib/progress.js'

/*
  Weekly progress, from PokerEdge's core/progress.py (play.progress): the bb
  your mistakes gave away per 100 graded decisions, week by week. It ignores
  luck — a good shove that lost costs nothing — so it moves when decisions
  improve and only then. Lower is better. Tournaments only, every grader
  together. Absent in older files.

  One series over time, so plain bars in one neutral colour; thin weeks
  (too few decisions to trust) are faded and the current week is outlined.
  Tap a bar for that week's detail — the hover layer of a phone.
*/

const SHOW = 8
const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const GROUP_LABELS = { short_stack: 'Short-stack all-ins', bb: 'Big blind vs a raise', postflop: 'Facing a bet after the flop' }

const weekLabel = (iso) => {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

/** @param {{p: object}} props  summary.play.progress */
export default function Progress({ p }) {
  const weeks = (p?.weeks || []).slice(-SHOW)
  const [sel, setSel] = useState(null)
  if (!weeks.length) return null
  const h = progressHeadline(weeks)
  const max = Math.max(...weeks.map((w) => w.per_100 || 0), 1)
  const picked = weeks.find((w) => w.week === sel) || null

  return (
    <div className="card p-3.5">
      <div className={title}>Progress · bb given away per 100 decisions</div>
      <p className="mb-2 text-[11px] text-faint">
        What your mistakes cost, per 100 graded decisions. Luck doesn&apos;t count, so lower means better decisions.
      </p>
      {h && (
        <div className="mb-3 flex items-baseline gap-2">
          <span className="num text-2xl font-semibold">{h.last.per_100}</span>
          <span className="text-xs text-muted">
            week of {weekLabel(h.last.week)}
            {h.last.current ? ' (so far)' : ''}
            {h.change !== null && (
              <>
                {' · '}
                <span className={h.change < 0 ? 'text-gain' : h.change > 0 ? 'text-loss' : ''}>
                  {h.change < 0 ? '↓' : h.change > 0 ? '↑' : '='} {Math.abs(h.change)}
                </span>{' '}
                vs your average of {h.avg} before
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex h-28 items-end gap-[2px]" role="list" aria-label="bb given away per 100 decisions, by week">
        {weeks.map((w) => (
          <button
            key={w.week}
            type="button"
            role="listitem"
            onClick={() => setSel(sel === w.week ? null : w.week)}
            aria-label={`Week of ${weekLabel(w.week)}: ${w.per_100} bb per 100 decisions, ${w.graded} graded${w.thin ? ', few decisions' : ''}`}
            className="flex h-full flex-1 flex-col items-center justify-end"
          >
            <span className="num mb-0.5 text-[10px] text-faint">{sel === w.week || w === h?.last ? w.per_100 : ''}</span>
            <span
              className={`w-full max-w-7 rounded-t-[4px] ${w.thin ? 'bg-muted/25' : 'bg-muted/70'} ${
                sel === w.week ? 'bg-accent' : ''
              } ${w.current ? 'outline outline-1 outline-offset-1 outline-accent/60' : ''}`}
              style={{ height: `${Math.max(3, ((w.per_100 || 0) / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-faint">
        {weeks.map((w) => (
          <span key={w.week} className="flex-1 text-center">
            {weekLabel(w.week).replace(' ', ' ')}
          </span>
        ))}
      </div>

      {picked && (
        <div className="mt-2.5 rounded-xl bg-surface-2 p-2.5 text-[12.5px]">
          <div className="font-semibold">
            Week of {weekLabel(picked.week)}
            {picked.current ? ' (this week, so far)' : ''}
          </div>
          <div className="num text-muted">
            {picked.graded} graded · {picked.mistakes} mistakes · {picked.cost_bb}bb · {picked.per_100} per 100
            {picked.thin ? ' · few decisions, read loosely' : ''}
          </div>
          <div className="mt-1.5 space-y-0.5">
            {Object.entries(picked.groups).map(([g, v]) => (
              <div key={g} className="num flex justify-between gap-3">
                <span className="text-muted">{GROUP_LABELS[g] || g}</span>
                <span>
                  {v.per_100} <span className="text-faint">· {v.graded}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-faint">
        Faded: under {p.min_graded} decisions that week. Tap a week for its detail. Every week is re-graded with the
        current model, so the weeks stay comparable.
      </p>
    </div>
  )
}
