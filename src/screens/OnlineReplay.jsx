import { useEffect, useMemo, useState } from 'react'
import Cards from '../components/Cards.jsx'
import { replaySteps } from '../lib/replay.js'

/*
  The hand replay (Phase 8 step 3, mockup E chosen 2026-10-17): a key hand
  walked street by street — the board filling in, the pot, the action so far
  with the current street lit, and the grade on the street where the decision
  was made. The last step is the result: who showed what, and how the cards
  ran against the all-in odds.

  Lean on purpose: only key hands (turning points and graded hands) carry the
  action; every hand would make the phone file balloon.

  Opened over the tournament review, so it sits one layer above it (z-40).
*/

const TONE = { gain: 'text-gain', loss: 'text-loss', accent: 'text-accent', muted: 'text-muted' }

/**
 * @param {{hand: object, heading?: string, onClose: () => void}} props
 *   hand: a key hand from review.key_hands
 */
export default function Replay({ hand, heading, onClose }) {
  const steps = useMemo(() => replaySteps(hand), [hand])
  const [i, setI] = useState(0)
  const step = steps[Math.min(i, steps.length - 1)]
  const last = i >= steps.length - 1

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, steps.length])

  if (!step) return null
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label="Hand replay">
      <div className="pt-safe mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-4">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{heading || 'Hand replay'}</div>
            <div className="num text-xs text-muted">
              {hand.time} · {hand.seat} · {hand.stack_bb}bb · blinds {hand.blinds}
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
          <div
            className="flex h-44 flex-col items-center justify-center gap-2.5 rounded-[110px] border border-line"
            style={{ background: 'radial-gradient(ellipse at center, #1f4a36 0%, #153526 70%)' }}
          >
            <div className="num text-[11px] uppercase tracking-[0.12em] text-muted">
              {step.name}
              {step.pot !== null && ` · pot ${step.pot}bb`}
            </div>
            <div className="flex min-h-9 items-center">
              {step.board.length ? <Cards cards={step.board.join(' ')} /> : <span className="text-xs text-faint">no board yet</span>}
            </div>
            {step.result?.shown.map((s) => (
              <div key={s.seat + s.cards} className="flex items-center gap-1.5 text-xs text-muted">
                {s.seat} shows <Cards cards={s.cards} small />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 px-1">
            <Cards cards={hand.cards} />
            <span className="text-xs text-muted">Your hand</span>
          </div>

          <div className="card space-y-1.5 p-3.5">
            {step.lines.map((l, k) => (
              <div key={k} className={`flex gap-2.5 text-[14px] ${l.current ? 'text-ink' : 'text-faint'}`}>
                <span className="w-12 shrink-0 pt-0.5 text-[10px] uppercase tracking-wide text-faint">{l.street === 'preflop' ? 'Pre' : l.street}</span>
                <span>{l.text}</span>
              </div>
            ))}
            {step.notes.map((n, k) => (
              <div key={k} className="mt-1.5 rounded-xl bg-surface-2 p-2.5 text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <span>
                    <span className="mr-1.5">{n.mark}</span>
                    {n.text}
                  </span>
                  {n.value && <span className={`num shrink-0 font-semibold ${TONE[n.tone] || ''}`}>{n.value}</span>}
                </div>
                {n.why && <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{n.why}</p>}
              </div>
            ))}
            {step.result && (
              <div className="mt-1.5 rounded-xl bg-surface-2 p-2.5 text-[13px]">
                <div className={`num font-semibold ${step.result.net > 0 ? 'text-gain' : step.result.net < 0 ? 'text-loss' : 'text-muted'}`}>
                  {step.result.net > 0 ? 'Won' : step.result.net < 0 ? 'Lost' : 'Even'} {Math.abs(step.result.net)}bb
                  {step.result.bust ? ' · out of the tournament' : ''}
                </div>
                {step.result.luck && <div className="mt-0.5 text-muted">{step.result.luck}</div>}
                {step.result.verdict && <div className="mt-0.5 text-ink">{step.result.verdict}</div>}
              </div>
            )}
          </div>
        </div>

        <div className="pb-safe grid grid-cols-2 gap-2.5 py-3">
          <button
            type="button"
            onClick={() => setI((v) => Math.max(v - 1, 0))}
            disabled={i === 0}
            className="min-h-12 rounded-2xl border border-line bg-surface-2 font-semibold disabled:opacity-40"
          >
            ‹ Back
          </button>
          <button type="button" onClick={() => setI(last ? 0 : i + 1)} className="btn-gold min-h-12 rounded-2xl font-semibold">
            {last ? 'Start over' : `${steps[i + 1].name} ›`}
          </button>
        </div>
      </div>
    </div>
  )
}
