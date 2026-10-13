import { useState } from 'react'
import Cards from '../components/Cards.jsx'
import { Segmented } from '../components/ui.jsx'
import { OPENER_LABEL, bbSpot, bbVerdict, bbWhy, defenceBand } from '../lib/bbDefence.js'
import { cellClass } from '../lib/charts.js'
import { BAND_ARROW, formatPct } from '../lib/online.js'

/*
  Big blind defence, from PokerEdge's analysis/bb_defence.py: how often you
  defend (call or 3-bet) against one raise, beside this pool and the chart's
  clear-defend share; your folds and calls graded in chips; and the chart —
  which hands defend against each opener at 25bb, a min-raise, antes —
  derived from the equity engine, never typed in. Absent in older files.
*/

const MIN_SPOTS = 20
const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const GTONE = { gain: 'text-gain', loss: 'text-loss', muted: 'text-muted' }
const CELL = {
  defend: 'bg-[#d4af37] text-[#0b1210]',
  close: 'bg-[#d4af37]/30 text-ink',
  fold: 'bg-surface-2 text-faint',
}

/** @param {{d: object}} props  summary.play.bb_defence */
export default function BBDefence({ d }) {
  const [opener, setOpener] = useState('BTN')
  if (!d || !d.rates) return null
  const chart = d.charts?.find((c) => c.opener === opener)
  const g = d.graded
  return (
    <div className="card p-3.5">
      <div className={title}>Big blind defence</div>
      <p className="mb-2 text-[11px] text-faint">
        One raise, nobody called, you in the big blind. Defending = calling or 3-betting. Under each: this pool.
      </p>
      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-20" />
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="text-[11px] text-faint">
            <th className="pb-1 text-left font-normal">Opener</th>
            <th className="pb-1 text-right font-normal">You</th>
            <th className="pb-1 text-right font-normal">Chart</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {d.rates.map((r) => {
            const b = defenceBand(r, MIN_SPOTS)
            return (
              <tr key={r.opener}>
                <td className="py-1.5">{OPENER_LABEL[r.opener] || r.opener}</td>
                <td className="py-1.5 text-right">
                  <div className={b === 'low' ? 'text-accent' : r.hero.n < MIN_SPOTS ? 'text-faint' : ''}>
                    {b && BAND_ARROW[b]}
                    {formatPct(r.hero.pct)}
                    <span className="text-[10px] text-faint"> ·{r.hero.n}</span>
                  </div>
                  <div className="text-[11px] text-faint">{formatPct(r.pool.pct)}</div>
                </td>
                <td className="py-1.5 text-right text-muted">{r.chart_defend ? `${r.chart_defend[0]}%+` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-faint">
        Chart: the share of hands that clearly defend at 25bb against a min-raise with antes — the rest are close, so the
        right rate is at least this.
      </p>

      {g && g.n > 0 && (
        <div className="mt-3 rounded-xl bg-surface-2 p-2.5">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="num text-xl font-bold">{g.mistake}</span>{' '}
              <span className="text-sm text-muted">mistake{g.mistake === 1 ? '' : 's'} of {g.n} graded</span>
            </div>
            {g.cost_bb > 0 && <span className="num text-xl font-bold text-loss">−{g.cost_bb}bb</span>}
          </div>
          <div className="mt-0.5 text-[11px] text-faint">
            {g.correct} correct · {g.close} close. {g.missed} fold{g.missed === 1 ? '' : 's'} where defending was better,{' '}
            {g.bad_call} call{g.bad_call === 1 ? '' : 's'} where folding was. 3-bets are counted, not graded.
          </div>
          {g.costliest?.length > 0 && (
            <div className="mt-2">
              {g.costliest.map((x) => (
                <BBGradeRow key={x.hand_id} g={x} />
              ))}
            </div>
          )}
        </div>
      )}

      {chart && (
        <div className="mt-3">
          <div className={title}>Defence chart</div>
          <div className="mb-2">
            <Segmented
              size="sm"
              value={opener}
              onChange={setOpener}
              options={d.charts.map((c) => ({ value: c.opener, label: OPENER_LABEL[c.opener] || c.opener }))}
            />
          </div>
          <div className="mb-1.5 text-[11px] text-muted">
            {OPENER_LABEL[opener]} opens {chart.open_pct}% · you need {chart.need}% · defend {chart.defend_pct}% · close{' '}
            {chart.close_pct}%
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg bg-white/5" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {Array.from({ length: 169 }, (_, k) => {
              const cls = cellClass(Math.floor(k / 13), k % 13)
              const v = chart.cells[cls] || 'fold'
              return (
                <div key={cls} className={`flex aspect-square items-center justify-center leading-none ${CELL[v]}`}>
                  <span className="text-[8.5px] font-semibold">{cls}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
            Gold: defend. Faint gold: close — either is fine. Grey: fold. {chart.stack}bb, a {chart.raise_to}bb open,{' '}
            {chart.antes}bb of antes; against what this pool opens, discounted for playing out of position. An estimate,
            not a solver chart.
          </p>
        </div>
      )}
    </div>
  )
}

/** One graded big blind decision: cards, the open, the cost. Tap for why. */
export function BBGradeRow({ g }) {
  const [open, setOpen] = useState(false)
  const v = bbVerdict(g)
  const w = open ? bbWhy(g) : null
  return (
    <div className="border-t border-white/5 py-2 first:border-t-0">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-[13px]">
        <span className="flex min-w-0 items-center gap-1.5">
          <Cards cards={g.cards} small />
          <span className="truncate text-[11px] text-muted">{bbSpot(g)}</span>
        </span>
        <span className={`num shrink-0 ${GTONE[v.tone]}`}>
          {v.value} <span className="text-faint">{open ? '▴' : '▾'}</span>
        </span>
      </button>
      {w && (
        <div className="mt-2 rounded-xl bg-surface p-2.5 text-[12.5px] leading-relaxed text-muted">
          <div className={`mb-0.5 font-semibold ${GTONE[v.tone]}`}>{v.mark} {v.text}</div>
          {w.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
          <div className="mt-1 font-medium text-ink">{w.conclusion}</div>
          {w.notes.map((n) => (
            <div key={n} className="mt-1 text-[11px] text-faint">{n}</div>
          ))}
        </div>
      )}
    </div>
  )
}
