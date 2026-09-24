import { useEffect, useRef, useState } from 'react'
import { formatSigned } from '../lib/money.js'
import { formatDay } from '../lib/time.js'

const HEIGHT = 190
const PAD = { top: 12, right: 12, bottom: 22, left: 52 }

/**
 * Running profit after each session — the "how am I doing over time" line.
 *
 * Hand-drawn SVG, no chart library: one series, one axis, a zero line. The x
 * axis is session NUMBER, not the calendar, so a two-week break does not
 * stretch the line flat and every session gets the same width to tap.
 *
 * One series, so no legend — the card's title names it. Touch or hover anywhere
 * on the plot to read the nearest session (drag to scrub).
 *
 * @param {{points: {session, result:number, total:number}[]}} props  from stats.cumulative()
 */
export default function ProfitChart({ points }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(320)
  const [active, setActive] = useState(null)

  const empty = points.length < 2

  // Follow the card's width so the chart is sharp at any phone size. Re-run when
  // the chart first appears — while empty there is no element to measure.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [empty])

  if (empty) {
    return <p className="py-8 text-center text-sm text-faint">The chart appears after two finished sessions.</p>
  }

  // Include the starting zero so the line begins at "before the first session".
  const totals = [0, ...points.map((p) => p.total)]
  const { ticks, lo, hi } = niceTicks(Math.min(...totals), Math.max(...totals))
  const plotW = width - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (i) => PAD.left + (i / (totals.length - 1)) * plotW
  const y = (cents) => PAD.top + (1 - (cents - lo) / (hi - lo)) * plotH

  const path = totals.map((t, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(t).toFixed(1)}`).join('')

  /** Pointer x → nearest session index (1-based into totals; 0 is the origin). */
  const pick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const rel = (event.clientX - rect.left - PAD.left) / plotW
    const i = Math.round(rel * (totals.length - 1))
    setActive(Math.min(points.length, Math.max(1, i)))
  }

  const hit = active ? points[active - 1] : null
  const ax = active ? x(active) : 0
  // Keep the tooltip inside the card: flip it to the left of the crosshair past halfway.
  const tipLeft = ax > width / 2

  return (
    <div ref={wrapRef} className="relative select-none">
      <svg
        width={width}
        height={HEIGHT}
        className="block touch-pan-y"
        role="img"
        aria-label={`Cumulative profit over ${points.length} sessions, ending at ${formatSigned(points.at(-1).total)}`}
        onPointerDown={pick}
        onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons ? pick(e) : null)}
        onPointerLeave={(e) => (e.pointerType === 'mouse' ? setActive(null) : null)}
      >
        {/* Recessive grid + axis labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth={t === 0 ? 1.5 : 1}
              strokeDasharray={t === 0 ? undefined : '2 4'}
            />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="num" fontSize="11" fill="var(--color-faint)">
              {shortMoney(t)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={HEIGHT - 5} fontSize="11" fill="var(--color-faint)">
          {formatDay(points[0].session.date, true)}
        </text>
        <text x={width - PAD.right} y={HEIGHT - 5} textAnchor="end" fontSize="11" fill="var(--color-faint)">
          {formatDay(points.at(-1).session.date, true)}
        </text>

        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Endpoint marker, and the crosshair when reading a point */}
        {!hit && <circle cx={x(totals.length - 1)} cy={y(totals.at(-1))} r="4" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />}
        {hit && (
          <g>
            <line x1={ax} x2={ax} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--color-muted)" strokeWidth="1" />
            <circle cx={ax} cy={y(hit.total)} r="5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hit && (
        <div
          className="pointer-events-none absolute top-1 w-44 rounded-xl border border-line bg-surface-2 p-2.5 text-xs shadow-lg"
          style={tipLeft ? { left: Math.max(0, ax - 184) } : { left: ax + 8 }}
        >
          <div className="font-semibold">{formatDay(hit.session.date, true)}</div>
          <div className="truncate text-muted">{hit.session.venue || hit.session.game || 'Session'}</div>
          <div className="num mt-1.5 flex justify-between">
            <span className="text-faint">Session</span>
            <span className={hit.result >= 0 ? 'text-gain' : 'text-loss'}>{formatSigned(hit.result)}</span>
          </div>
          <div className="num flex justify-between">
            <span className="text-faint">Running total</span>
            <span className="font-semibold">{formatSigned(hit.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Three to five round tick values covering [min, max], always including 0 so
 * the break-even line is on every chart.
 */
function niceTicks(min, max) {
  if (min === max) {
    min -= 10000
    max += 10000
  }
  const span = max - min
  const rough = span / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks = []
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t))
  if (!ticks.includes(0)) ticks.push(0)
  return { ticks, lo, hi }
}

/** Cents → compact axis label: "$1.2k", "−$300". */
function shortMoney(cents) {
  const dollars = cents / 100
  const sign = dollars < 0 ? '−' : ''
  const abs = Math.abs(dollars)
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`
  return `${sign}$${Math.round(abs)}`
}
