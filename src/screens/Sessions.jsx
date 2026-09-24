import { useMemo, useState } from 'react'
import ActiveSession from '../components/ActiveSession.jsx'
import InstallBanner from '../components/InstallBanner.jsx'
import { Badge, Profit, Segmented } from '../components/ui.jsx'
import { compareSessions, isActive, isTournament, minutesPlayed, ordinal, profit } from '../lib/sessions.js'
import { netProfit } from '../lib/stats.js'
import { formatDay, formatDuration, formatMonth, todayKey } from '../lib/time.js'

/**
 * The sheet: sessions in play at the top, the start buttons, then every
 * finished session newest first, grouped by month with each month's total.
 */
export default function Sessions({ sessions, installed, backupDue, onStart, onAdd, onOpen, onRebuy, onFinish, onBackup }) {
  const [setting, setSetting] = useState('live')

  const active = sessions.filter(isActive)
  const done = useMemo(() => sessions.filter((s) => !isActive(s)).sort(compareSessions).reverse(), [sessions])

  const months = useMemo(() => {
    const groups = []
    for (const s of done) {
      const key = s.date.slice(0, 7)
      let group = groups.at(-1)
      if (!group || group.key !== key) {
        group = { key, sessions: [] }
        groups.push(group)
      }
      group.sessions.push(s)
    }
    return groups
  }, [done])

  const thisMonth = todayKey().slice(0, 7)
  const monthNet = netProfit(done.filter((s) => s.date.startsWith(thisMonth)))

  return (
    <div className="space-y-4">
      {!installed && <InstallBanner />}

      {backupDue && (
        <button type="button" onClick={onBackup} className="block w-full rounded-2xl bg-surface p-3.5 text-left text-sm">
          <span className="font-semibold text-accent">Time for a backup.</span>{' '}
          <span className="text-muted">Your sessions only live on this phone — tap to save a copy.</span>
        </button>
      )}

      {/* Totals strip */}
      {done.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface p-3.5">
            <div className="text-xs font-medium uppercase tracking-wide text-faint">All time</div>
            <Profit cents={netProfit(done)} className="mt-1 block text-2xl font-semibold" />
            <div className="text-xs text-muted">{done.length} sessions</div>
          </div>
          <div className="rounded-2xl bg-surface p-3.5">
            <div className="text-xs font-medium uppercase tracking-wide text-faint">This month</div>
            <Profit cents={monthNet} className="mt-1 block text-2xl font-semibold" />
            <div className="text-xs text-muted">{done.filter((s) => s.date.startsWith(thisMonth)).length} sessions</div>
          </div>
        </div>
      )}

      {active.map((s) => (
        <ActiveSession key={s.id} session={s} onRebuy={onRebuy} onFinish={onFinish} onOpen={onOpen} />
      ))}

      {/* Start — the "I just sat down" buttons */}
      <div className="space-y-2.5 rounded-2xl bg-surface p-4">
        <div className="text-sm font-semibold">Start a session</div>
        <Segmented
          size="sm"
          value={setting}
          onChange={setSetting}
          options={[
            { value: 'live', label: 'Live' },
            { value: 'online', label: 'Online' },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onStart('cash', setting)} className="rounded-xl bg-accent py-3 font-semibold text-accent-ink active:opacity-80">
            Cash game
          </button>
          <button type="button" onClick={() => onStart('tournament', setting)} className="rounded-xl bg-accent py-3 font-semibold text-accent-ink active:opacity-80">
            Tournament
          </button>
        </div>
        <button type="button" onClick={onAdd} className="w-full py-1.5 text-sm font-medium text-muted">
          + Log a past session
        </button>
      </div>

      {done.length === 0 && active.length === 0 && (
        <p className="px-2 py-6 text-center text-sm text-faint">
          No sessions yet. Tap <b className="text-muted">Cash game</b> or <b className="text-muted">Tournament</b> when you sit
          down, or log one you already played.
        </p>
      )}

      {months.map((m) => (
        <section key={m.key}>
          <div className="mb-1.5 flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold text-muted">{formatMonth(m.key)}</h2>
            <Profit cents={netProfit(m.sessions)} className="text-sm font-semibold" />
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
            {m.sessions.map((s) => (
              <SessionRow key={s.id} session={s} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function SessionRow({ session: s, onOpen }) {
  const mins = minutesPlayed(s)
  const tourney = isTournament(s)
  const detail = [
    s.game,
    tourney && s.place ? `${ordinal(s.place)}${s.entrants ? ` / ${s.entrants}` : ''}` : null,
    mins !== null ? formatDuration(mins) : null,
  ].filter(Boolean)

  return (
    <li>
      <button type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{s.venue || (tourney ? 'Tournament' : 'Cash game')}</span>
            {tourney && <Badge>MTT</Badge>}
            {s.setting === 'online' && <Badge>Online</Badge>}
            {s.event && <Badge tone="accent">{s.event}</Badge>}
          </div>
          <div className="truncate text-xs text-muted">
            {formatDay(s.date)}
            {detail.length ? ` · ${detail.join(' · ')}` : ''}
          </div>
        </div>
        <Profit cents={profit(s)} className="font-semibold" />
      </button>
    </li>
  )
}

