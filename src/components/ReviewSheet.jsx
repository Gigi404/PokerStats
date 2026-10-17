import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import * as repo from '../lib/repo.js'
import { CHECKLIST, progressCount, setText, TAGS, toggleTag, toText } from '../lib/reviewNotes.js'

/*
  Review notes (2026-10-17): the checklist to go through on the phone before
  the "less dense" pass, with like / dislike / want more / remove / move and
  a note per item. Opened from the floating Review button or from More.
  Saved on every change; shared as text for the next session.
*/

const META_KEY = 'reviewNotes'
const TAG_ON = {
  like: 'bg-gain/20 text-gain',
  dislike: 'bg-loss/20 text-loss',
  want: 'bg-accent/20 text-accent',
  remove: 'bg-loss/20 text-loss',
  move: 'bg-white/15 text-ink',
}

export default function ReviewSheet({ onClose, onHideButton, buttonHidden }) {
  const [notes, setNotes] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    repo.getMeta(META_KEY).then((v) => setNotes(v || {})).catch(() => setNotes({}))
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const update = (next) => {
    setNotes(next)
    repo.setMeta(META_KEY, next).catch(() => setMessage('Could not save on this phone — share your notes before closing.'))
  }

  const share = async () => {
    const text = toText(notes, typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '')
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PokerStats review notes', text })
        return
      }
      await navigator.clipboard.writeText(text)
      setMessage('Copied — paste it into the next session.')
    } catch (e) {
      if (e?.name !== 'AbortError') setMessage('Could not share or copy here.')
    }
  }

  const count = notes ? progressCount(notes) : null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label="Review notes">
      <div className="pt-safe mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-4">
        <div className="flex items-center justify-between gap-3 py-3">
          <div>
            <div className="text-lg font-semibold">Review notes</div>
            {count && (
              <div className="num text-xs text-muted">
                {count.done} of {count.total} looked at
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
          <p className="text-sm text-muted">
            Go through the app and mark what you like, don’t, want more of, would remove or move. Notes save as you go.
            When done, share them and paste them into the next session.
          </p>

          {notes &&
            CHECKLIST.map((s) => (
              <section key={s.screen}>
                <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">{s.screen}</div>
                <div className="card divide-y divide-white/5">
                  {s.items.map(([key, q]) => {
                    const n = notes[key] || { tags: [], text: '' }
                    return (
                      <div key={key} className="space-y-2 p-3.5">
                        <div className="text-[14px] leading-snug">{q}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {TAGS.map((t) => {
                            const on = n.tags.includes(t.key)
                            return (
                              <button
                                key={t.key}
                                type="button"
                                aria-pressed={on}
                                onClick={() => update(toggleTag(notes, key, t.key))}
                                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${on ? TAG_ON[t.key] : 'bg-surface-2 text-faint'}`}
                              >
                                {t.label}
                              </button>
                            )
                          })}
                        </div>
                        <textarea
                          rows={n.text ? 2 : 1}
                          value={n.text}
                          onChange={(e) => update(setText(notes, key, e.target.value))}
                          placeholder="Note (optional)"
                          aria-label={`Note: ${q}`}
                          className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-ink placeholder:text-faint"
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

          {notes && (
            <section>
              <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Anything else</div>
              <textarea
                rows={4}
                value={notes._other?.text || ''}
                onChange={(e) => update({ ...notes, _other: { text: e.target.value } })}
                placeholder="Ideas, annoyances, things you’d show your friend…"
                aria-label="Other notes"
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-ink placeholder:text-faint"
              />
            </section>
          )}

          <button type="button" onClick={onHideButton} className="w-full py-2 text-center text-xs text-faint underline">
            {buttonHidden ? 'Show the floating Review button again' : 'Hide the floating Review button (this stays under More)'}
          </button>
        </div>

        <div className="pb-safe py-3">
          {message && <p className="mb-2 text-center text-xs text-muted">{message}</p>}
          <button type="button" onClick={share} className="btn-gold min-h-12 w-full rounded-2xl font-semibold">
            Share notes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
