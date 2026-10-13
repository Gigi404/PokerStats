import { useState } from 'react'
import { Segmented } from '../components/ui.jsx'
import { cellClass, combos } from '../lib/charts.js'

/*
  Re-jam charts, from PokerEdge's analysis/rejam.py (play.rejam): someone
  opens with this pool's real opening range for their seat and stack; you,
  behind, jam or fold; they call or fold. Both all-in decisions solved to
  equilibrium, so a hand can be a mix ("jam 60%"). Exact for its inputs: no
  postflop model, because it all ends before the flop. Calling the open is
  not one of the options here. Absent in older files.
*/

const OPENER = { early: 'Early', middle: 'Middle', BTN: 'Button', SB: 'Small blind' }
const JAMMER = { ip: 'In position', SB: 'Small blind', BB: 'Big blind' }
const selectClass = 'rounded-lg border border-white/10 bg-surface-2 px-2 py-1.5 text-sm text-ink'

/** Gold at the frequency: solid at 100%, faint for a mix, grey at 0. */
function cellStyle(pct) {
  if (!pct) return { className: 'bg-surface-2 text-faint' }
  if (pct >= 100) return { className: 'bg-[#d4af37] text-[#0b1210]' }
  return { className: 'text-ink', style: { background: `rgba(212, 175, 55, ${0.15 + (0.6 * pct) / 100})` } }
}

/** @param {{r: object}} props  summary.play.rejam */
export default function Rejam({ r }) {
  const [opener, setOpener] = useState('BTN')
  const [jammer, setJammer] = useState('BB')
  const [stack, setStack] = useState(25)
  const [side, setSide] = useState('jam')
  if (!r || !r.charts) return <p className="py-10 text-center text-sm text-faint">Re-jam charts need a newer summary.</p>
  const j = opener === 'SB' ? 'BB' : jammer
  const chart = r.charts[`${opener}|${j}|${stack}`]
  const order = Object.fromEntries(r.classes.map((c, i) => [c, i]))
  const values = chart ? chart[side] : null
  let mass = 0
  if (values) for (const [i, c] of r.classes.entries()) mass += (combos(c) * values[i]) / 100
  const pct = values ? (100 * mass) / 1326 : 0

  return (
    <div className="card space-y-2.5 p-3.5">
      <Segmented
        size="sm"
        value={side}
        onChange={setSide}
        options={[
          { value: 'jam', label: 'You jam' },
          { value: 'call', label: 'They call' },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select aria-label="Opener" className={selectClass} value={opener} onChange={(e) => setOpener(e.target.value)}>
          {r.openers.map((o) => (
            <option key={o} value={o}>{OPENER[o]} opens</option>
          ))}
        </select>
        <select aria-label="You jam from" className={selectClass} value={j} disabled={opener === 'SB'}
          onChange={(e) => setJammer(e.target.value)}>
          {r.jammers.map((x) => (
            <option key={x} value={x}>You: {JAMMER[x]}</option>
          ))}
        </select>
        <select aria-label="Stack" className={selectClass} value={stack} onChange={(e) => setStack(Number(e.target.value))}>
          {r.stacks.map((s) => (
            <option key={s} value={s}>{s}bb</option>
          ))}
        </select>
      </div>
      {chart && (
        <>
          <div className="text-[11px] text-muted">
            {OPENER[opener]} opens {chart.open_pct}% · {side === 'jam' ? `you jam ${pct.toFixed(1)}% of hands` : `they call ${pct.toFixed(1)}% of all hands`}
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg bg-white/5" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {Array.from({ length: 169 }, (_, k) => {
              const cls = cellClass(Math.floor(k / 13), k % 13)
              const v = values[order[cls]]
              const st = cellStyle(v)
              return (
                <div key={cls} className={`flex aspect-square flex-col items-center justify-center leading-none ${st.className}`} style={st.style}>
                  <span className="text-[8.5px] font-semibold">{cls}</span>
                  {v > 0 && v < 100 && <span className="num mt-0.5 text-[8px] opacity-80">{v}</span>}
                </div>
              )
            })}
          </div>
        </>
      )}
      <p className="text-[11px] leading-relaxed text-faint">
        {side === 'jam'
          ? 'Jam or fold over a min-raise. Solid: always jam. Faint with a number: jam that % of the time. '
          : "The opener's call of your jam, from their opening range only. "}
        Their open is what this player pool really opens there; only the jam and the call are solved. Equilibrium in
        chips, {r.ante * 100}% antes, {r.dealt}-handed, players behind assumed to fold.
      </p>
    </div>
  )
}
