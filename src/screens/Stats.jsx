import { useMemo, useState } from 'react'
import ProfitChart from '../components/ProfitChart.jsx'
import { Profit, Segmented, Tile } from '../components/ui.jsx'
import { formatMoney, formatSigned } from '../lib/money.js'
import { ordinal } from '../lib/sessions.js'
import { PERIODS, breakdown, cashStats, cumulative, distinctValues, filterSessions, finished, tournamentStats } from '../lib/stats.js'
import { formatDuration } from '../lib/time.js'

const pct = (ratio) => (ratio === null ? '—' : `${Math.round(ratio * 100)}%`)
const selectClass = 'min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink'

/**
 * Stats, split Cash | Tournaments at the top (their rates do not mix), with
 * Live/Online, period, casino and event filters in one row beneath.
 */
export default function Stats({ sessions }) {
  const [format, setFormat] = useState('cash')
  const [setting, setSetting] = useState('all')
  const [period, setPeriod] = useState('all')
  const [venue, setVenue] = useState('')
  const [event, setEvent] = useState('')

  const done = useMemo(() => finished(sessions), [sessions])
  const venues = useMemo(() => distinctValues(done.filter((s) => s.format === format), 'venue'), [done, format])
  const events = useMemo(() => distinctValues(done, 'event'), [done])

  const filtered = useMemo(
    () => filterSessions(done, { format, setting, period, venue, event }),
    [done, format, setting, period, venue, event],
  )
  const points = useMemo(() => cumulative(filtered), [filtered])

  if (!done.length) {
    return <p className="px-4 py-16 text-center text-sm text-faint">Stats appear once you have finished a session.</p>
  }

  return (
    <div className="space-y-4">
      <Segmented
        value={format}
        onChange={(f) => {
          setFormat(f)
          setVenue('')
        }}
        options={[
          { value: 'cash', label: 'Cash games' },
          { value: 'tournament', label: 'Tournaments' },
        ]}
      />

      <div className="space-y-2">
        <Segmented
          size="sm"
          value={setting}
          onChange={setSetting}
          options={[
            { value: 'all', label: 'All' },
            { value: 'live', label: 'Live' },
            { value: 'online', label: 'Online' },
          ]}
        />
        <div className="flex gap-2">
          <select className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
            {Object.entries(PERIODS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <select className={selectClass} value={venue} onChange={(e) => setVenue(e.target.value)} aria-label="Casino or site">
            <option value="">All places</option>
            {venues.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          {events.length > 0 && (
            <select className={selectClass} value={event} onChange={(e) => setEvent(e.target.value)} aria-label="Event">
              <option value="">Any night</option>
              {events.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-faint">No finished {format === 'cash' ? 'cash games' : 'tournaments'} match these filters.</p>
      ) : format === 'cash' ? (
        <CashStats sessions={filtered} />
      ) : (
        <TournamentStats sessions={filtered} />
      )}

      {filtered.length > 0 && (
        <div className="card p-3.5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Running total</div>
          <ProfitChart points={points} />
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <Breakdown title="By casino / site" rows={breakdown(filtered, 'venue')} format={format} />
          <Breakdown title={format === 'cash' ? 'By stakes' : 'By tournament'} rows={breakdown(filtered, 'game')} format={format} />
          {filtered.some((s) => s.event) && <Breakdown title="By special night" rows={breakdown(filtered, 'event', 'Regular night')} format={format} />}
        </>
      )}
    </div>
  )
}

function CashStats({ sessions }) {
  const s = cashStats(sessions)
  return (
    <>
      <div className="card-hero p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">Net profit</div>
        <Profit cents={s.net} className="mt-1 block text-[40px] leading-tight font-bold tracking-tight" />
        <div className="mt-1 text-sm text-muted">
          {s.count} sessions{s.minutes ? ` · ${formatDuration(s.minutes)} played` : ''}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Per hour" sub={s.untimed ? `${s.untimed} session${s.untimed > 1 ? 's' : ''} without times not counted` : null}>
          {s.hourly === null ? '—' : <Profit cents={s.hourly} />}
        </Tile>
        <Tile label="Winning sessions">{pct(s.winRate)}</Tile>
        <Tile label="Average session">{s.average === null ? '—' : <Profit cents={s.average} />}</Tile>
        <Tile label="Best / worst">
          <span className="block text-base leading-snug">
            <Profit cents={s.best} />
            <br />
            <Profit cents={s.worst} />
          </span>
        </Tile>
      </div>
    </>
  )
}

function TournamentStats({ sessions }) {
  const t = tournamentStats(sessions)
  return (
    <>
      <div className="card-hero p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">Net profit</div>
        <Profit cents={t.net} className="mt-1 block text-[40px] leading-tight font-bold tracking-tight" />
        <div className="mt-1 text-sm text-muted">
          {t.count} tournaments · {formatMoney(t.spent)} in · {formatMoney(t.won)} won
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="ROI">{t.roi === null ? '—' : <span className={t.roi >= 0 ? 'text-gain' : 'text-loss'}>{t.roi >= 0 ? '+' : '−'}{pct(Math.abs(t.roi))}</span>}</Tile>
        <Tile label="In the money" sub={`${t.cashes} of ${t.count}`}>{pct(t.itm)}</Tile>
        <Tile label="Best finish" sub={t.bestFinish?.name}>
          {t.bestFinish ? `${ordinal(t.bestFinish.place)}${t.bestFinish.entrants ? ` / ${t.bestFinish.entrants}` : ''}` : '—'}
        </Tile>
        <Tile label="Biggest cash">{t.biggestCash ? formatMoney(t.biggestCash) : '—'}</Tile>
      </div>
    </>
  )
}

/** A small table: one row per casino / stakes / event, with profit and the format's rate. */
function Breakdown({ title, rows, format }) {
  if (rows.length < 2) return null // a one-row breakdown repeats the headline
  return (
    <div className="card p-3.5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">{title}</div>
      {/* Fixed layout with set widths: in an auto table the name column is the
          one that gets squeezed, down to "C…" for every casino. */}
      <table className="num w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-9" />
          <col className="w-20" />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-faint">
            <th className="pb-1.5 font-medium" />
            <th className="pb-1.5 text-right font-medium">#</th>
            <th className="pb-1.5 text-right font-medium">{format === 'cash' ? '$/hr' : 'ROI'}</th>
            <th className="pb-1.5 text-right font-medium">Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="truncate py-2 pr-2">{r.label}</td>
              <td className="py-2 text-right text-muted">{r.count}</td>
              <td className="py-2 text-right text-muted">
                {format === 'cash'
                  ? r.hourly === null
                    ? '—'
                    : formatSigned(r.hourly)
                  : r.roi === null
                    ? '—'
                    : `${r.roi >= 0 ? '+' : '−'}${Math.round(Math.abs(r.roi) * 100)}%`}
              </td>
              <td className="py-2 pl-2 text-right">
                <Profit cents={r.net} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
