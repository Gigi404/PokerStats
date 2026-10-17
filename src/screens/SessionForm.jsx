import { useMemo, useState } from 'react'
import { Field, Profit, Segmented, inputClass } from '../components/ui.jsx'
import { centsToInput, formatMoney, toCents } from '../lib/money.js'
import { EVENT_PRESETS, minutesPlayed, profit, totalIn, validate } from '../lib/sessions.js'
import { distinctValues } from '../lib/stats.js'
import { formatLabel, homeFormats, homeName, homeVenue, isHomeGame, stakesOptions, venueOptions } from '../lib/venues.js'
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
 *
 * Live only since 2026-10-16: online results arrive on the Online tab by
 * themselves. Where and the stakes are dropdowns (lib/venues.js); a home
 * game tournament picks its sit & go format, which fills the buy-in.
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
  // Special night + notes fold away unless the session already has one.
  const [more, setMore] = useState(() => Boolean(session.event || session.notes))

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }))
    setError(null)
  }

  const tourney = draft.format === 'tournament'
  const online = draft.setting === 'online'
  const inPlay = draft.status === 'active'

  const home = isHomeGame(draft.venue)
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
    <div className="sheet-in fixed inset-0 z-30 overflow-y-auto bg-bg">
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

        <Segmented
          value={draft.format}
          onChange={(format) => set({ format })}
          options={[
            { value: 'cash', label: 'Cash game' },
            { value: 'tournament', label: 'Tournament' },
          ]}
        />
        {online && (
          <p className="-mt-2 text-xs text-faint">
            Logged by hand as an online session. Online results now arrive by themselves on the Online tab.
          </p>
        )}

        {/* Tournament result — also first when finishing one. */}
        {tourney && mode === 'finish' && <TournamentResult draft={draft} set={set} autoFocus />}

        <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
          <VenueSelect sessions={sessions} value={draft.venue} onChange={(venue) => set({ venue })} />
          {!tourney ? (
            <StakesSelect sessions={sessions} value={draft.game} onChange={(game) => set({ game })} />
          ) : home ? (
            <HomeFormatSelect
              sessions={sessions}
              venue={draft.venue}
              draft={draft}
              onPick={(buyIn, chips) =>
                set({
                  chips,
                  buyIns: [centsToInput(buyIn), ...draft.buyIns.slice(1)],
                  game: draft.game || `Sit & go ${formatLabel(buyIn, chips)}`,
                })
              }
            />
          ) : (
            <Field label="Tournament">
              <input
                className={inputClass}
                list="games"
                value={draft.game}
                placeholder="Name…"
                onChange={(e) => set({ game: e.target.value })}
              />
              <datalist id="games">
                {games.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
          )}
        </div>

        {/* One row: the date takes the widest column (iOS writes it out as "Oct 16, 2026"). */}
        <div className="grid grid-cols-[1.25fr_1fr_1fr] gap-1.5 [&>*]:min-w-0">
          <Field label="Date">
            <input type="date" className={`${inputClass} min-w-0 px-2 text-[15px]`} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Arrived">
            <input type="time" className={`${inputClass} min-w-0 px-2`} value={draft.start} onChange={(e) => set({ start: e.target.value })} />
          </Field>
          <Field label="Left">
            <input
              type="time"
              className={`${inputClass} min-w-0 px-2`}
              value={draft.end}
              disabled={inPlay && mode !== 'finish'}
              onChange={(e) => set({ end: e.target.value })}
            />
          </Field>
        </div>

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

        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className="flex w-full items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-muted"
        >
          <span>
            Special night · notes
            {!more && (draft.event || draft.notes) ? <span className="text-faint"> · filled in</span> : null}
          </span>
          <span>{more ? '▴' : '▾'}</span>
        </button>

        {more && (
        <>
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
                  draft.event === ev ? 'btn-gold font-medium' : 'bg-surface-2 text-muted'
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
        </>
        )}

        {mode === 'edit' && (
          <div className="pt-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2 card p-3">
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
              <button type="submit" disabled={saving} className="flex-1 rounded-xl btn-gold py-3 font-semibold text-accent-ink active:opacity-80 disabled:opacity-50">
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
    <div className="space-y-3 card p-3.5">
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
    chips: session.chips ?? null,
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

// ---------------------------------------------------------------------------
// Where / stakes / home-game format: dropdowns with "add one" in place
// ---------------------------------------------------------------------------

const NEW = '__new__'
const selectClass = `${inputClass} appearance-none pr-8`

/** A select with a chevron, the shared look of the three dropdowns. */
function Select({ label, value, onChange, children }) {
  return (
    <Field label={label}>
      <div className="relative">
        <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
          {children}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-faint">▾</span>
      </div>
    </Field>
  )
}

/** A one-line "name it" input with OK and ×, shown in place of a dropdown when "+ New …" is picked. */
function AddInline({ label, placeholder, onAdd, onCancel }) {
  const [text, setText] = useState('')
  const add = () => text.trim() && onAdd(text.trim())
  return (
    <Field label={label}>
      <div className="flex gap-1.5">
        <input
          autoFocus
          className={`${inputClass} min-w-0 px-2.5`}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" onClick={add} className="shrink-0 rounded-xl btn-gold px-2.5 text-sm font-semibold text-accent-ink">
          OK
        </button>
        <button type="button" aria-label="Cancel" onClick={onCancel} className="shrink-0 rounded-xl bg-surface-2 px-2.5 text-muted">
          ×
        </button>
      </div>
    </Field>
  )
}

/** Where: the casino, Playground, any other place played, and the home games. */
function VenueSelect({ sessions, value, onChange }) {
  const [adding, setAdding] = useState(false)
  const { places, homes } = useMemo(() => venueOptions(sessions, value), [sessions, value])
  if (adding) {
    return (
      <AddInline
        label="New home game"
        placeholder="Whose? e.g. Marc"
        onAdd={(name) => {
          onChange(homeVenue(name))
          setAdding(false)
        }}
        onCancel={() => setAdding(false)}
      />
    )
  }
  return (
    <Select label="Where" value={value || ''} onChange={(v) => (v === NEW ? setAdding(true) : onChange(v))}>
      {!value && <option value="">Choose…</option>}
      {places.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
      <optgroup label="Home games">
        {homes.map((h) => (
          <option key={h} value={h}>
            {homeName(h)}
          </option>
        ))}
        <option value={NEW}>+ New home game…</option>
      </optgroup>
    </Select>
  )
}

/** Stakes for a cash game: 1/2 NL, 1/2 PLO, whatever else she has played, or a new one. */
function StakesSelect({ sessions, value, onChange }) {
  const [adding, setAdding] = useState(false)
  const options = useMemo(() => stakesOptions(sessions, value), [sessions, value])
  if (adding) {
    return (
      <AddInline
        label="Stakes"
        placeholder="e.g. 2/5 NL"
        onAdd={(v) => {
          onChange(v)
          setAdding(false)
        }}
        onCancel={() => setAdding(false)}
      />
    )
  }
  return (
    <Select label="Stakes" value={value || ''} onChange={(v) => (v === NEW ? setAdding(true) : onChange(v))}>
      {!value && <option value="">Choose…</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value={NEW}>Other…</option>
    </Select>
  )
}

/**
 * A home game's sit & go format ("$50 · 1,500 chips"). Picking one fills the
 * buy-in and the starting chips. A home game with no format yet, or "+ New
 * format", asks for both: $ in and chips, saved on OK.
 */
function HomeFormatSelect({ sessions, venue, draft, onPick }) {
  const saved = useMemo(() => homeFormats(sessions, venue), [sessions, venue])
  const [adding, setAdding] = useState(false)
  const [buyIn, setBuyIn] = useState('')
  const [chips, setChips] = useState('')
  const firstIn = toCents(draft.buyIns[0])
  const matches = (f) => f.buyIn === firstIn && (f.chips || null) === (draft.chips || null)
  // A format just entered is not saved anywhere until the session is, so it
  // joins the list from the draft itself.
  const formats =
    draft.chips && firstIn && !saved.some(matches)
      ? [{ key: `${firstIn}|${draft.chips}`, buyIn: firstIn, chips: draft.chips, label: formatLabel(firstIn, draft.chips) }, ...saved]
      : saved
  const current = formats.find(matches)

  if (adding || !formats.length) {
    const add = () => {
      const cents = toCents(buyIn)
      if (!cents) return
      onPick(cents, parseInt(chips, 10) || null)
      setAdding(false)
    }
    return (
      <Field label={formats.length ? 'New format' : 'Format'}>
        <div className="flex gap-1.5">
          <input
            autoFocus={adding}
            inputMode="decimal"
            className={`${inputClass} num min-w-0 px-2`}
            placeholder="$ in"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
          />
          <input
            inputMode="numeric"
            className={`${inputClass} num min-w-0 px-2`}
            placeholder="chips"
            value={chips}
            onChange={(e) => setChips(e.target.value.replace(/\D/g, ''))}
          />
          <button type="button" onClick={add} className="shrink-0 rounded-xl btn-gold px-2.5 text-sm font-semibold text-accent-ink">
            OK
          </button>
          {formats.length > 0 && (
            <button type="button" aria-label="Cancel" onClick={() => setAdding(false)} className="shrink-0 rounded-xl bg-surface-2 px-2.5 text-muted">
              ×
            </button>
          )}
        </div>
      </Field>
    )
  }
  return (
    <Select
      label="Format"
      value={current ? current.key : ''}
      onChange={(v) => {
        if (v === NEW) return setAdding(true)
        const f = formats.find((x) => x.key === v)
        if (f) onPick(f.buyIn, f.chips)
      }}
    >
      {!current && <option value="">Choose…</option>}
      {formats.map((f) => (
        <option key={f.key} value={f.key}>
          {f.label}
        </option>
      ))}
      <option value={NEW}>+ New format…</option>
    </Select>
  )
}
