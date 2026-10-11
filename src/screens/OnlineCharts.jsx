import { useEffect, useState } from 'react'
import { Segmented } from '../components/ui.jsx'
import { cellClass, combos, seatNames } from '../lib/charts.js'

/*
  Push/fold (Nash) charts — computed by PokerEdge (analysis/pushfold.py) from
  its equity table and checked as equilibria, copied here as a static file.
  Public math, nothing private, so it is bundled rather than encrypted, and it
  loads as its own chunk (precached, so it works offline).

  Each cell shows the deepest stack, in big blinds, at which that hand still
  shoves (or calls) — the classic chart format. Cells inside the range at the
  chosen stack are lit.
*/

const ANTE_OPTIONS = [
  { value: 0, label: 'No ante' },
  { value: 0.125, label: 'Ante 12.5%' },
  { value: 0.2, label: 'Ante 20%' },
]

const selectClass = 'rounded-lg border border-white/10 bg-surface-2 px-2 py-1.5 text-sm text-ink'

/** The chart for a spot: per class the deepest stack, and the range size at `stack`. */
function chartView(data, key, mode, callerSeat, stack) {
  if (!data) return null
  const chart = data.charts[key]
  if (!chart) return null
  const deepest = mode === 'shove' ? chart.push : chart.call[callerSeat]
  const order = Object.fromEntries(data.classes.map((c, i) => [c, i]))
  let inRange = 0
  for (const [i, c] of data.classes.entries()) if (deepest[i] >= stack) inRange += combos(c)
  return { deepest, order, pct: (100 * inRange) / 1326, max: data.stacks[data.stacks.length - 1] }
}

export default function Charts() {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState('shove')
  const [dealt, setDealt] = useState(8)
  const [seat, setSeat] = useState('BTN')
  const [caller, setCaller] = useState('BB')
  const [ante, setAnte] = useState(0.125)
  const [stack, setStack] = useState(10)

  useEffect(() => {
    import('../data/pushfold.json').then((m) => setData(m.default)).catch(() => setFailed(true))
  }, [])

  const seats = seatNames(dealt)
  const shover = seats.includes(seat) ? seat : seats[seats.length - 2] || seats[0]
  const callers = [...seats.slice(seats.indexOf(shover) + 1), 'BB']
  const callerSeat = callers.includes(caller) ? caller : 'BB'

  const view = chartView(data, `${dealt}|${shover}|${ante}`, mode, callerSeat, stack)

  if (failed) return <p className="py-10 text-center text-sm text-faint">Charts aren&apos;t available in this build.</p>
  if (!data || !view) return <p className="py-10 text-center text-sm text-faint">Opening charts…</p>

  const stacks = data.stacks
  const idx = Math.max(0, stacks.indexOf(stack))
  const label = (v) => (v <= 0 ? '' : v >= view.max ? `${view.max}+` : String(v))

  return (
    <div className="space-y-3">
      <Segmented
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'shove', label: 'Shove' },
          { value: 'call', label: 'Call a shove' },
        ]}
      />

      <div className="card space-y-2.5 p-3.5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select aria-label="Players dealt" className={selectClass} value={dealt}
            onChange={(e) => setDealt(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>{n === 2 ? 'Heads-up' : `${n}-handed`}</option>
            ))}
          </select>
          <select aria-label={mode === 'shove' ? 'Your seat' : 'Shove from'} className={selectClass}
            value={shover} onChange={(e) => setSeat(e.target.value)}>
            {seats.map((s) => (
              <option key={s} value={s}>{mode === 'shove' ? s : `Shove from ${s}`}</option>
            ))}
          </select>
          {mode === 'call' && (
            <select aria-label="You call from" className={selectClass} value={callerSeat}
              onChange={(e) => setCaller(e.target.value)}>
              {callers.map((s) => (
                <option key={s} value={s}>You in {s}</option>
              ))}
            </select>
          )}
          <select aria-label="Ante" className={selectClass} value={ante} onChange={(e) => setAnte(Number(e.target.value))}>
            {ANTE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <label className="block text-sm">
          <span className="flex justify-between">
            <span className="text-muted">Stack</span>
            <span className="num font-semibold">{stack}bb · {view.pct.toFixed(1)}% of hands</span>
          </span>
          <input type="range" min={0} max={stacks.length - 1} value={idx} aria-label="Stack in big blinds"
            onChange={(e) => setStack(stacks[Number(e.target.value)])} className="mt-1 w-full accent-[#d4af37]" />
        </label>

        <div className="grid gap-px overflow-hidden rounded-lg bg-white/5"
          style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
          {Array.from({ length: 169 }, (_, k) => {
            const r = Math.floor(k / 13)
            const c = k % 13
            const cls = cellClass(r, c)
            const v = view.deepest[view.order[cls]]
            const lit = v >= stack
            return (
              <div key={cls}
                className={`flex aspect-square flex-col items-center justify-center leading-none ${
                  lit ? 'bg-[#d4af37] text-[#0b1210]' : 'bg-surface-2 text-faint'}`}>
                <span className="text-[8.5px] font-semibold">{cls}</span>
                <span className="num mt-0.5 text-[8px] opacity-80">{label(v)}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] leading-relaxed text-faint">
          Each cell is the deepest stack (big blinds) where the hand still {mode === 'shove' ? 'shoves when folded to you' : 'calls the shove'}.
          Lit: in the range at {stack}bb. Nash equilibrium in chips, everyone at the same stack, the first caller only — no
          bubble or bounty adjustment.
        </p>
      </div>
    </div>
  )
}
