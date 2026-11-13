import { useMemo } from 'react'
import ActiveSession from '../components/ActiveSession.jsx'
import InstallBanner from '../components/InstallBanner.jsx'
import Logo from '../components/Logo.jsx'
import { Badge, Profit } from '../components/ui.jsx'
import { compareSessions, isActive, isTournament, minutesPlayed, ordinal, profit } from '../lib/sessions.js'
import { cashStats, groupByDay, netProfit, tournamentStats } from '../lib/stats.js'
import { formatDuration, formatMonth, todayKey } from '../lib/time.js'

/**
 * The sheet: sessions in play at the top, the start buttons, then every
 * finished session newest first, grouped by month with each month's total and,
 * inside a month, by day under one calendar tile. MTT rows are tinted blue.
 */
export default function Sessions({ sessions, installed, backupDue, onStart, onAdd, onOpen, onRebuy, onFinish, onBackup }) {
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

  // Headline: this month, LIVE only, cash and MTT kept apart (owner, 2026-11-13).
  // Online results have their own tab; all-time lives on the Stats screen.
  const thisMonth = todayKey().slice(0, 7)
  const monthLive = useMemo(
    () => done.filter((s) => s.setting === 'live' && s.date.startsWith(thisMonth)),
    [done, thisMonth],
  )
  const cash = cashStats(monthLive)
  const mtt = tournamentStats(monthLive)
  const mttMinutes = monthLive.filter(isTournament).reduce((m, s) => m + (minutesPlayed(s) || 0), 0)

  return (
    <div className="space-y-4">
      {!installed && <InstallBanner />}

      {backupDue && (
        <button type="button" onClick={onBackup} className="block w-full card p-3.5 text-left text-sm">
          <span className="font-semibold text-accent">Time for a backup.</span>{' '}
          <span className="text-muted">Your sessions only live on this phone — tap to save a copy.</span>
        </button>
      )}

      {/* Headline: this month, live, cash | MTT side by side. */}
      {done.length > 0 && (
        <div className="card-hero p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">
            {formatMonth(thisMonth)} · Live
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-faint">Cash</div>
              <Profit cents={cash.net} className="mt-0.5 block text-[26px] leading-tight font-bold tracking-tight" />
              <dl className="mt-2 space-y-1 text-sm">
                <StatLine label="$/hour">{cash.hourly === null ? <Dash /> : <Profit cents={cash.hourly} className="font-semibold" />}</StatLine>
                <StatLine label="$/session">{cash.average === null ? <Dash /> : <Profit cents={cash.average} className="font-semibold" />}</StatLine>
                <StatLine label="Sessions">{cash.count}</StatLine>
                <StatLine label="Hours">{Math.round(cash.minutes / 60)}</StatLine>
              </dl>
            </div>
            <div className="border-l border-white/5 pl-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-mtt">MTT</div>
              <Profit cents={mtt.net} className="mt-0.5 block text-[26px] leading-tight font-bold tracking-tight" />
              <dl className="mt-2 space-y-1 text-sm">
                <StatLine label="Entries">{mtt.count}</StatLine>
                <StatLine label="Cashes">{mtt.count ? `${mtt.cashes} / ${mtt.count}` : <Dash />}</StatLine>
                <StatLine label="ROI">{mtt.roi === null ? <Dash /> : `${Math.round(mtt.roi * 100)}%`}</StatLine>
                <StatLine label="Hours">{Math.round(mttMinutes / 60)}</StatLine>
              </dl>
            </div>
          </div>
          {cash.untimed > 0 && (
            <div className="mt-3 text-xs text-faint">
              $/hour leaves out {cash.untimed} cash session{cash.untimed > 1 ? 's' : ''} with no start/end time.
            </div>
          )}
        </div>
      )}

      {active.map((s) => (
        <ActiveSession key={s.id} session={s} onRebuy={onRebuy} onFinish={onFinish} onOpen={onOpen} />
      ))}

      {/* Start — the "I just sat down" buttons. Live only: online results
          arrive by themselves on the Online tab (2026-10-16). */}
      <div className="space-y-2.5 card p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Start a session</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onStart('cash', 'live')} className="rounded-2xl btn-gold py-3.5 text-[17px] font-bold">
            Cash game
          </button>
          <button type="button" onClick={() => onStart('tournament', 'live')} className="rounded-2xl btn-gold py-3.5 text-[17px] font-bold">
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
            {groupByDay(m.sessions).map((d) => (
              <DayGroup key={d.date} day={d} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** One label/value line in the headline's cash or MTT column. */
function StatLine({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="num font-semibold">{children}</dd>
    </div>
  )
}

const Dash = () => <span className="text-faint">—</span>

/**
 * Every session of one day under a single calendar tile. The rows stay separate
 * (each opens its own session); a day with more than one shows its total.
 */
function DayGroup({ day: d, onOpen }) {
  const date = new Date(`${d.date}T12:00:00`)
  const several = d.sessions.length > 1
  return (
    <li className="flex gap-2.5 px-2.5 py-2.5">
      {/* Calendar tile: the date is how she will look a session up. */}
      <div className="flex w-11 shrink-0 flex-col items-center">
        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
          <span className="text-[10px] font-semibold uppercase text-faint">{date.toLocaleDateString('en-CA', { weekday: 'short' })}</span>
          <span className="num mt-0.5 text-lg font-bold">{date.getDate()}</span>
        </div>
        {several && <Profit cents={d.net} className="mt-1 text-[10px] font-semibold" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {d.sessions.map((s) => (
          <SessionRow key={s.id} session={s} onOpen={onOpen} />
        ))}
      </div>
    </li>
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

  // MTT rows sit in a blue-tinted box with a blue left edge so they read apart
  // from cash at a glance (owner, 2026-11-13); cash rows stay plain.
  const box = tourney
    ? 'border-l-[3px] border-mtt bg-mtt/10 active:bg-mtt/20'
    : 'border-l-[3px] border-transparent active:bg-surface-2'
  return (
    <button
      type="button"
      onClick={() => onOpen(s)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${box}`}
    >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{s.venue || (tourney ? 'Tournament' : 'Cash game')}</span>
            {tourney && <Badge tone="mtt">MTT</Badge>}
            {s.setting === 'online' && <Badge>Online</Badge>}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            {s.event && <Badge tone="accent">{s.event}</Badge>}
            <span className="truncate">{detail.join(' · ')}</span>
          </div>
        </div>
        <Profit cents={profit(s)} className="font-bold" />
    </button>
  )
}
