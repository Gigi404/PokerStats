import { useState } from 'react'
import { Segmented } from '../components/ui.jsx'
import { AREAS, AS_OF, COVERED, GAINS, NOT_YET, confidenceTone } from '../lib/trust.js'
import { formatDay } from '../lib/time.js'

/*
  How sure are we (under More, 2026-10-29): how far to trust each part of the
  Online tab and how to raise it, then the poker theory covered and not yet.
  Static: the numbers are a dated judgement kept in lib/trust.js.
*/

const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'
const BAR = { gain: 'bg-gain', accent: 'bg-accent', loss: 'bg-loss' }
const TEXT = { gain: 'text-gain', accent: 'text-accent', loss: 'text-loss' }
const SIZE = { small: 'quick', medium: 'a session', big: 'big build' }

export default function Trust() {
  const [view, setView] = useState('trust')
  return (
    <div className="space-y-3">
      <Segmented
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: 'trust', label: 'How sure' },
          { value: 'theory', label: 'Theory covered' },
        ]}
      />
      {view === 'trust' ? <Confidence /> : <Theory />}
    </div>
  )
}

function Confidence() {
  const [open, setOpen] = useState(null)
  return (
    <>
      <p className="px-1 text-[12.5px] text-muted">
        How far to trust each part of the Online tab. The percentages are a judgement on the checks actually run, as of{' '}
        {formatDay(AS_OF)}. Tap a row for the evidence and how to raise it.
      </p>
      <div className="card divide-y divide-white/5 px-3.5">
        {AREAS.map((a) => {
          const tone = confidenceTone(a.confidence)
          const isOpen = open === a.label
          return (
            <button
              key={a.label}
              type="button"
              onClick={() => setOpen(isOpen ? null : a.label)}
              aria-expanded={isOpen}
              className="block w-full py-3 text-left"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[14.5px] font-semibold">
                  {a.label}
                  {a.sub && <span className="font-normal text-faint"> · {a.sub}</span>}
                </span>
                <span className={`num shrink-0 text-[15px] font-bold ${TEXT[tone]}`}>
                  {a.confidence}%{a.unit && <span className="ml-1 text-[11px] font-medium text-faint">{a.unit}</span>}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
                <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${Math.max(a.confidence, 2)}%` }} />
              </div>
              {isOpen && (
                <div className="mt-2 space-y-1 text-[12.5px] leading-relaxed">
                  <p className="text-muted">{a.evidence}</p>
                  {a.raise && (
                    <p>
                      <span className="font-semibold text-accent">Raise it: </span>
                      {a.raise}
                    </p>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="card p-3.5">
        <div className={title}>Biggest gains, in order</div>
        <ol className="space-y-2">
          {GAINS.map(([what, buys], i) => (
            <li key={what} className="flex gap-3">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[13px] font-bold text-accent">
                {i + 1}
              </span>
              <span className="min-w-0 text-[13.5px]">
                <span className="font-semibold">{what}</span>
                <span className="block text-[12.5px] text-muted">{buys}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}

function Theory() {
  return (
    <>
      <div className="card p-3.5">
        <div className={title}>Covered today</div>
        <ul className="space-y-1.5">
          {COVERED.map(([topic, how]) => (
            <li key={topic} className="flex gap-2 text-[13.5px]">
              <span className="text-gain" aria-hidden="true">✓</span>
              <span>
                {topic} <span className="text-faint">· {how}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-3.5">
        <div className={title}>Not covered yet</div>
        <ul className="space-y-2.5">
          {NOT_YET.map(([topic, why, size]) => (
            <li key={topic} className="text-[13.5px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{topic}</span>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{SIZE[size]}</span>
              </div>
              <p className="text-[12.5px] text-muted">{why}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
