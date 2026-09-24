import { useMemo, useState } from 'react'
import ActiveSession from '../components/ActiveSession.jsx'
import InstallBanner from '../components/InstallBanner.jsx'
import Logo from '../components/Logo.jsx'
import { Badge, Profit, Segmented } from '../components/ui.jsx'
import { compareSessions, isActive, isTournament, minutesPlayed, ordinal, profit } from '../lib/sessions.js'
import { netProfit } from '../lib/stats.js'
import { formatDuration, formatMonth, todayKey } from '../lib/time.js'

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
        <button type="button" onClick={onBackup} className="block w-full card p-3.5 text-left text-sm">
          <span className="font-semibold text-accent">Time for a backup.</span>{' '}
          <span className="text-muted">Your sessions only live on this phone — tap to save a copy.</span>
        </button>
      )}

      {/* Headline: all-time result, with this month and volume underneath. */}
      {done.length > 0 && (
        <div className="card-hero p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">All-time profit</div>
          <Profit cents={netProfit(done)} className="mt-1 block text-[40px] leading-tight font-bold tracking-tight" />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3.5 text-sm">
            <div>
              <div className="text-xs text-faint">This month</div>
              <Profit cents={monthNet} className="font-semibold" />
            </div>
            <div>
              <div className="text-xs text-faint">Sessions</div>
              <div className="num font-semibold">{done.length}</div>
            </div>
            <div>
              <div className="text-xs text-faint">Hours</div>
              <div className="num font-semibold">{Math.round(done.reduce((h, x) => h + (minutesPlayed(x) || 0), 0) / 60)}</div>
            </div>
          </div>
        </div>
      )}

      {active.map((s) => (
        <ActiveSession key={s.id} session={s} onRebuy={onRebuy} onFinish={onFinish} onOpen={onOpen} />
      ))}

      {/* Start — the "I just sat down" buttons */}
      <div className="space-y-2.5 card p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Start a session</div>
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
          <button type="button" onClick={() => onStart('cash', setting)} className="rounded-2xl btn-gold py-3.5 text-[17px] font-bold">
            Cash game
          </button>
          <button type="button" onClick={() => onStart('tournament', setting)} className="rounded-2xl btn-gold py-3.5 text-[17px] font-bold">
            Tournament
          </button>
        </div>
        <button type="button" onClick={onAdd} className="w-full py-1.5 text-sm font-medium text-muted">
          + Log a past session
        </button>
      </div>

      {done.length === 0 && active.length === 0 && (
        <div className="flex flex-col items-center px-6 pt-4 pb-6 text-center">
          <Logo className="h-16 w-16 opacity-90 drop-shadow-[0_8px_24px_rgba(227,179,65,0.25)]" />
          <p className="mt-4 font-semibold">Your results start here</p>
          <p className="mt-1 text-sm text-faint">
            Tap <b className="text-muted">Cash game</b> or <b className="text-muted">Tournament</b> when you sit down, or log a
            session you already played.
          </p>
        </div>
      )}

      {months.map((m) => (
        <section key={m.key}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">{formatMonth(m.key)}</h2>
            <Profit cents={netProfit(m.sessions)} className="text-sm font-semibold" />
          </div>
          <ul className="divide-y divide-white/5 overflow-hidden card">
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

  const day = new Date(`${s.date}T12:00:00`)
  return (
    <li>
      <button type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-2">
        {/* Calendar tile: the date is how she will look a session up. */}
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
          <span className="text-[10px] font-semibold uppercase text-faint">{day.toLocaleDateString('en-CA', { weekday: 'short' })}</span>
          <span className="num mt-0.5 text-lg font-bold">{day.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{s.venue || (tourney ? 'Tournament' : 'Cash game')}</span>
            {tourney && <Badge>MTT</Badge>}
            {s.setting === 'online' && <Badge>Online</Badge>}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            {s.event && <Badge tone="accent">{s.event}</Badge>}
            <span className="truncate">{detail.join(' · ')}</span>
          </div>
        </div>
        <Profit cents={profit(s)} className="font-bold" />
      </button>
    </li>
  )
}
