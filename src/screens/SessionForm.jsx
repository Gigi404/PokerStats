import { useMemo, useState } from 'react'
import { Field, Profit, Segmented, inputClass } from '../components/ui.jsx'
import { centsToInput, formatMoney, toCents } from '../lib/money.js'
import { EVENT_PRESETS, minutesPlayed, profit, totalIn, validate } from '../lib/sessions.js'
import { distinctValues } from '../lib/stats.js'
import { formatDuration, nowHHMM } from '../lib/time.js'

/**
 * Add / edit / finish one session — a full-screen sheet over the app.
 *
 * The form edits a DRAFT whose amounts are the raw strings she typed; they are
 * converted to cents only when saving. Converting on every keystroke would turn
 * "12." into 12 and eat the decimal point while she is still typing it.
 *
 * @param {object}   props.session   the session to edit (new ones come pre-built from App)
 * @param {'new'|'start'|'edit'|'finish'} props.mode
 *        start  = just sat down (saved as in-play)
 *        finish = cashing out of an in-play session (end time pre-filled)
 * @param {object[]} props.sessions  every session, for venue/game suggestions
 */
export default function SessionForm({ session, mode: initialMode, sessions, onSave, onDelete, onClose }) {
  // Mode can change once: "Finish now" on an in-play session turns the edit
  // sheet into the cash-out sheet in place, rather than saving a finished cash
  // game with no cash-out.
  const [mode, setMode] = useState(initialMode)
  const [draft, setDraft] = useState(() => toDraft(session, initialMode))
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }))
    setError(null)
  }

  const tourney = draft.format === 'tournament'
  const online = draft.setting === 'online'
  const inPlay = draft.status === 'active'

  const venues = useMemo(() => distinctValues(sessions, 'venue'), [sessions])
  const games = useMemo(
    () => distinctValues(sessions.filter((s) => s.format === draft.format), 'game'),
    [sessions, draft.format],
  )
  const events = useMemo(
    () => [...new Set([...EVENT_PRESETS, ...distinctValues(sessions, 'event')])],
    [sessions],
  )

  // Live preview of the result, computed from what is typed so far.
  const preview = fromDraft({ ...draft, status: 'done' })
  // Once cashing out, the in-play session is about to be finished: preview it as such.
  const showResult = !inPlay || mode === 'finish'
  const previewProfit = showResult && (tourney || Number.isFinite(preview.cashOut)) ? profit(preview) : null
  const previewMinutes = minutesPlayed(preview)

  const submit = async (finishing) => {
    const next = fromDraft({ ...draft, status: finishing ? 'done' : draft.status })
    if (finishing && !next.end && !online) next.end = nowHHMM()
    const problem = validate(next)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      await onSave(next)
    } catch (err) {
      setError(`Could not save: ${err?.message || err}`)
      setSaving(false)
    }
  }

  const title = { new: 'Log a session', start: 'Start a session', edit: 'Edit session', finish: tourney ? 'Tournament over' : 'Cash out' }[mode]

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-bg">
      <header className="pt-safe sticky top-0 z-10 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button type="button" onClick={onClose} className="py-1 pr-3 text-muted">
            Cancel
          </button>
          <h1 className="font-semibold">{title}</h1>
          <span className="w-14" />
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(mode === 'finish')
        }}
        className="mx-auto max-w-lg space-y-5 px-4 pt-4 pb-40"
      >
        {/* The finishing question first — it is the reason the form is open. */}
        {mode === 'finish' && !tourney && (
          <Field label="Cash-out" hint={`In for ${formatMoney(totalIn(preview))}. Enter 0 if you busted.`}>
            <MoneyInput autoFocus value={draft.cashOut} onChange={(v) => set({ cashOut: v })} />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Segmented
            value={draft.format}
            onChange={(format) => set({ format })}
            options={[
              { value: 'cash', label: 'Cash game' },
              { value: 'tournament', label: 'Tournament' },
            ]}
          />
          <Segmented
            size="sm"
            value={draft.setting}
            onChange={(setting) => set({ setting })}
            options={[
              { value: 'live', label: 'Live' },
              { value: 'online', label: 'Online' },
            ]}
          />
        </div>

        {/* Tournament result — also first when finishing one. */}
        {tourney && mode === 'finish' && <TournamentResult draft={draft} set={set} autoFocus />}

        <Field label={online ? 'Site' : 'Casino'}>
          <input
            className={inputClass}
            list="venues"
            value={draft.venue}
            placeholder={online ? 'PokerStars, GGPoker…' : 'Casino de Montréal…'}
            onChange={(e) => set({ venue: e.target.value })}
          />
          <datalist id="venues">
            {venues.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>

        <Field label={tourney ? 'Tournament' : 'Game / stakes'}>
          <input
            className={inputClass}
            list="games"
            value={draft.game}
            placeholder={tourney ? 'Tuesday $150 NLH…' : '1/2 NLH, 2/5 PLO…'}
            onChange={(e) => set({ game: e.target.value })}
          />
          <datalist id="games">
            {games.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </Field>

        {/* Date gets its own row: iOS renders it as "Sep 24, 2026", too wide for a third of the screen. */}
        <Field label="Date">
          <input type="date" className={inputClass} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Arrived">
            <input type="time" className={`${inputClass} px-2`} value={draft.start} onChange={(e) => set({ start: e.target.value })} />
          </Field>
          <Field label="Left">
            <input
              type="time"
              className={`${inputClass} px-2`}
              value={draft.end}
              disabled={inPlay && mode !== 'finish'}
              onChange={(e) => set({ end: e.target.value })}
            />
          </Field>
        </div>
        {online && <p className="-mt-3 text-xs text-faint">Times are optional online. Sessions without them are left out of $/hour.</p>}

        {/* Buy-ins: the first, then any rebuys / re-entries / add-ons. */}
        <div>
          <div className="mb-1.5 text-sm font-medium text-muted">{tourney ? 'Buy-in (incl. fee)' : 'Buy-in'}</div>
          <div className="space-y-2">
            {draft.buyIns.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <MoneyInput
                    value={value}
                    placeholder={i === 0 ? 'Amount' : tourney ? 'Re-entry / add-on' : 'Rebuy'}
                    onChange={(v) => set({ buyIns: draft.buyIns.map((b, j) => (j === i ? v : b)) })}
                  />
                </div>
                {i > 0 && (
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => set({ buyIns: draft.buyIns.filter((_, j) => j !== i) })}
                    className="h-11 w-11 shrink-0 rounded-xl bg-surface-2 text-lg text-muted"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ buyIns: [...draft.buyIns, draft.buyIns.at(-1) || ''] })}
            className="mt-2 text-sm font-medium text-accent"
          >
            + Add {tourney ? 're-entry / add-on' : 'rebuy'}
          </button>
        </div>

        {!tourney && mode !== 'finish' && !inPlay && (
          <Field label="Cash-out" hint="Enter 0 if you busted.">
            <MoneyInput value={draft.cashOut} onChange={(v) => set({ cashOut: v })} />
          </Field>
        )}

        {tourney && mode !== 'finish' && !inPlay && <TournamentResult draft={draft} set={set} />}

        {/* Special night */}
        <div>
          <div className="mb-1.5 text-sm font-medium text-muted">Special night / event</div>
          <div className="flex flex-wrap gap-1.5">
            {events.map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => set({ event: draft.event === ev ? '' : ev })}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  draft.event === ev ? 'bg-accent font-medium text-accent-ink' : 'bg-surface-2 text-muted'
                }`}
              >
                {ev}
              </button>
            ))}
          </div>
          <input
            className={`${inputClass} mt-2`}
            value={draft.event}
            placeholder="Or type your own…"
            onChange={(e) => set({ event: e.target.value })}
          />
        </div>

        <Field label="Notes">
          <textarea
            rows={3}
            className={inputClass}
            value={draft.notes}
            placeholder="How it went, a hand to remember…"
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>

        {mode === 'edit' && (
          <div className="pt-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2 rounded-2xl bg-surface p-3">
                <span className="flex-1 text-sm">Delete this session for good?</span>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 text-sm text-muted">
                  Keep
                </button>
                <button type="button" onClick={() => onDelete(session.id)} className="rounded-xl bg-loss px-3 py-2 text-sm font-semibold text-bg">
                  Delete
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-loss">
                Delete session
              </button>
            )}
          </div>
        )}

        {/* Sticky footer: the result so far, and the save button(s). */}
        <div className="pb-safe fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 backdrop-blur">
          <div className="mx-auto max-w-lg space-y-2 px-4 pt-3 pb-3">
            {error && <p className="text-sm text-loss">{error}</p>}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">
                In {formatMoney(totalIn(preview))}
                {previewMinutes !== null && showResult ? ` · ${formatDuration(previewMinutes)}` : ''}
              </span>
              {previewProfit !== null && <Profit cents={previewProfit} className="text-base font-semibold" />}
            </div>
            <div className="flex gap-2">
              {inPlay && mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('finish')
                    if (!draft.end && draft.setting === 'live') set({ end: nowHHMM() })
                    window.scrollTo(0, 0)
                  }}
                  className="flex-1 rounded-xl bg-surface-2 py-3 font-semibold"
                >
                  Finish now
                </button>
              )}
              <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-accent py-3 font-semibold text-accent-ink active:opacity-80 disabled:opacity-50">
                {mode === 'start' ? 'Start' : mode === 'finish' ? 'Save result' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

/** Place / entrants / prize / bounties. */
function TournamentResult({ draft, set, autoFocus }) {
  return (
    <div className="space-y-3 rounded-2xl bg-surface p-3.5">
      <div className="text-sm font-semibold">Result</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Finished">
          <input
            autoFocus={autoFocus}
            inputMode="numeric"
            className={inputClass}
            placeholder="Place"
            value={draft.place}
            onChange={(e) => set({ place: e.target.value.replace(/\D/g, '') })}
          />
        </Field>
        <Field label="Out of">
          <input
            inputMode="numeric"
            className={inputClass}
            placeholder="Entrants"
            value={draft.entrants}
            onChange={(e) => set({ entrants: e.target.value.replace(/\D/g, '') })}
          />
        </Field>
        <Field label="Prize">
          <MoneyInput value={draft.prize} placeholder="0" onChange={(v) => set({ prize: v })} />
        </Field>
        <Field label="Bounties">
          <MoneyInput value={draft.bounties} placeholder="0" onChange={(v) => set({ bounties: v })} />
        </Field>
      </div>
      <p className="text-xs text-faint">Leave prize empty if you didn&apos;t cash.</p>
    </div>
  )
}

/** A dollar field: "$" prefix, decimal keypad on the phone. */
function MoneyInput({ value, onChange, placeholder = 'Amount', autoFocus }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint">$</span>
      <input
        autoFocus={autoFocus}
        inputMode="decimal"
        className={`${inputClass} num pl-7`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** Session → editable draft (amounts as strings). */
function toDraft(session, mode) {
  const draft = {
    ...session,
    buyIns: session.buyIns.length ? session.buyIns.map(centsToInput) : [''],
    cashOut: centsToInput(session.cashOut),
    prize: centsToInput(session.prize),
    bounties: centsToInput(session.bounties),
    place: session.place ? String(session.place) : '',
    entrants: session.entrants ? String(session.entrants) : '',
  }
  // Cashing out: the time she left is now, unless it was already filled in.
  if (mode === 'finish' && !draft.end && draft.setting === 'live') draft.end = nowHHMM()
  return draft
}

/** Draft → session (amounts back to cents; empty rebuy rows dropped). */
function fromDraft(draft) {
  const int = (text) => (text ? parseInt(text, 10) || null : null)
  return {
    ...draft,
    venue: draft.venue.trim(),
    game: draft.game.trim(),
    event: draft.event.trim(),
    notes: draft.notes.trim(),
    end: draft.status === 'active' ? '' : draft.end,
    buyIns: draft.buyIns.filter((b) => String(b).trim() !== '').map(toCents),
    cashOut: toCents(draft.cashOut),
    prize: toCents(draft.prize),
    bounties: toCents(draft.bounties),
    place: int(draft.place),
    entrants: int(draft.entrants),
  }
}
