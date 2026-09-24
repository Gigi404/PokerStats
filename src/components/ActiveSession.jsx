import { useEffect, useState } from 'react'
import { formatMoney, toCents } from '../lib/money.js'
import { isTournament, totalIn } from '../lib/sessions.js'
import { durationMinutes, formatDuration, nowHHMM } from '../lib/time.js'
import { inputClass } from './ui.jsx'

/**
 * The session she is playing right now.
 *
 * Built for one hand at a table: the two things that happen mid-session — a
 * rebuy and leaving — are one tap each, and nothing else is in the way. Tapping
 * the card itself opens the full form for anything else.
 */
export default function ActiveSession({ session, onRebuy, onFinish, onOpen }) {
  const [now, setNow] = useState(() => nowHHMM())
  const [rebuying, setRebuying] = useState(false)
  const [amount, setAmount] = useState('')

  // Refresh the elapsed time twice a minute. Only while mounted, so a finished
  // session costs nothing.
  useEffect(() => {
    const timer = setInterval(() => setNow(nowHHMM()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const elapsed = session.date && session.start ? durationMinutes(session.start, now) : null
  const tourney = isTournament(session)

  const submitRebuy = (event) => {
    event.preventDefault()
    const cents = toCents(amount)
    if (!cents || cents <= 0) return
    onRebuy(session, cents)
    setAmount('')
    setRebuying(false)
  }

  // The last buy-in is the sensible default for a rebuy — usually the same amount again.
  const lastBuyIn = session.buyIns.at(-1)

  return (
    <div className="rounded-2xl border border-accent/50 bg-surface p-4">
      <button type="button" onClick={() => onOpen(session)} className="block w-full text-left">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Playing now · {tourney ? 'Tournament' : 'Cash'} · {session.setting === 'online' ? 'Online' : 'Live'}
        </div>
        <div className="mt-1.5 text-lg font-semibold">{session.venue || 'Session'}</div>
        {session.game && <div className="text-sm text-muted">{session.game}</div>}
        <div className="num mt-3 flex gap-6 text-sm">
          <div>
            <div className="text-faint">In for</div>
            <div className="text-base font-semibold">{formatMoney(totalIn(session))}</div>
          </div>
          <div>
            <div className="text-faint">Playing</div>
            <div className="text-base font-semibold">{elapsed === null ? '—' : formatDuration(elapsed)}</div>
          </div>
          {session.buyIns.length > 1 && (
            <div>
              <div className="text-faint">{tourney ? 'Entries' : 'Buy-ins'}</div>
              <div className="text-base font-semibold">{session.buyIns.length}</div>
            </div>
          )}
        </div>
      </button>

      {rebuying ? (
        <form onSubmit={submitRebuy} className="mt-4 flex gap-2">
          <input
            autoFocus
            inputMode="decimal"
            className={inputClass}
            placeholder={lastBuyIn ? `${lastBuyIn / 100}` : 'Amount'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={tourney ? 'Re-entry or add-on amount' : 'Rebuy amount'}
          />
          <button type="submit" className="rounded-xl bg-accent px-4 font-semibold text-accent-ink">
            Add
          </button>
          <button type="button" onClick={() => setRebuying(false)} className="rounded-xl px-3 text-muted">
            Cancel
          </button>
        </form>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setAmount(lastBuyIn ? String(lastBuyIn / 100) : '')
              setRebuying(true)
            }}
            className="rounded-xl bg-surface-2 py-3 font-semibold active:bg-line"
          >
            + {tourney ? 'Re-entry / add-on' : 'Rebuy'}
          </button>
          <button
            type="button"
            onClick={() => onFinish(session)}
            className="rounded-xl bg-accent py-3 font-semibold text-accent-ink active:opacity-80"
          >
            {tourney ? 'Finished' : 'Cash out'}
          </button>
        </div>
      )}
    </div>
  )
}
