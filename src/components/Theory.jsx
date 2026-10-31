import { useState } from 'react'
import { theory } from '../lib/theory.js'

/*
  "The idea behind it" (Phase 8 step 6): the principle a leak breaks, folded
  away under a one-line button so the recap and the puzzle answer stay as
  light as they were. Renders nothing for a leak without a card.
*/

/** @param {{lesson: string, decision?: object}} props */
export default function Theory({ lesson, decision }) {
  const [open, setOpen] = useState(false)
  const t = theory(lesson, decision)
  if (!t) return null
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="text-[12.5px] font-semibold text-accent"
      >
        {open ? 'Hide the idea' : 'The idea behind it ›'}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5 rounded-xl bg-surface-2 p-2.5 text-[13px] leading-relaxed">
          <p>{t.idea}</p>
          <ul className="list-disc space-y-1 pl-4 text-muted">
            {t.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {t.worked && <p className="text-muted">{t.worked}</p>}
          {t.notes.length > 0 && (
            <div className="border-t border-white/5 pt-1.5">
              <div className="text-[11px] font-semibold text-faint">A coach’s view, not tested on your hands</div>
              <ul className="list-disc space-y-1 pl-4 text-[12.5px] text-muted">
                {t.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
