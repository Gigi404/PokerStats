import { useMemo, useState } from 'react'
import { Badge, Segmented } from '../components/ui.jsx'
import usePlayground from '../hooks/usePlayground.js'
import { formatMoney } from '../lib/money.js'
import {
  KIND_LABELS,
  ageLabel,
  compactDollars,
  dateRange,
  dayLabel,
  lastHitLabel,
  scheduleDays,
  seriesSchedule,
  shortName,
  toCentsFromDollars,
  tournamentsOn,
} from '../lib/playground.js'
import { formatDay, nowHHMM, todayKey } from '../lib/time.js'

const SITE = 'https://www.playground.ca'
const dollars = (d) => formatMoney(toCentsFromDollars(d))
const sectionTitle = 'mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'

/**
 * What's on at Playground: jackpots, big series, the tournament schedule and
 * the poker promotions. Read-only — nothing here writes to her sessions.
 */
export default function Playground() {
  const { status, data } = usePlayground()
  const today = todayKey()

  if (status === 'loading') return null
  if (status === 'error' || !data) {
    return (
      <div className="card p-5 text-sm">
        <div className="font-semibold">Playground info isn&apos;t available right now</div>
        <p className="mt-1 text-muted">
          It loads once you have signal and is kept for offline after that. Meanwhile, the full calendar is on{' '}
          <a className="text-accent underline" href={`${SITE}/poker/tournament-calendar`} target="_blank" rel="noreferrer">
            playground.ca
          </a>
          .
        </p>
      </div>
    )
  }

  const tournaments = data.tournaments || []
  const series = (data.series || []).filter((s) => s.end >= today)

  return (
    <div className="space-y-6">
      {data.jackpots?.length > 0 && <Jackpots jackpots={data.jackpots} stale={data.stale?.jackpots} />}

      {series.length > 0 && (
        <section>
          <h2 className={sectionTitle}>Big series</h2>
          <div className="space-y-2">
            {series.map((s) => (
              <SeriesCard key={s.key} series={s} tournaments={tournaments} today={today} />
            ))}
          </div>
        </section>
      )}

      {tournaments.length > 0 && <Schedule tournaments={tournaments} today={today} stale={data.stale?.tournaments} />}

      {(data.highHand || data.promotions?.length > 0) && (
        <section>
          <h2 className={sectionTitle}>Promotions</h2>
          <div className="space-y-2">
            {data.highHand && <HighHand hh={data.highHand} />}
            {(data.promotions || [])
              .filter((p) => p.key !== 'badBeatJackpot' && !/high hand/i.test(p.title))
              .map((p) => (
                <a key={p.key} href={p.url} target="_blank" rel="noreferrer" className="card flex items-center gap-3 p-4 active:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{p.title}</div>
                    {p.blurb && <div className="text-sm text-muted">{p.blurb}</div>}
                    {p.until && <div className="mt-0.5 text-xs text-faint">Until {formatDay(p.until)}</div>}
                  </div>
                  <Chevron />
                </a>
              ))}
          </div>
        </section>
      )}

      <p className="px-1 text-center text-xs text-faint">
        From playground.ca · updated {ageLabel(data.fetchedAt)}
        <br />
        Always check with the poker room before you go.
      </p>
    </div>
  )
}

/** The three Bad Beat Jackpots: the main one large, the other two as tiles. */
function Jackpots({ jackpots, stale }) {
  const [main, ...rest] = jackpots
  return (
    <section>
      <div className="card-hero p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent/80">{main.label}</div>
          {stale && <div className="text-[11px] text-faint">as of {ageLabel(stale)}</div>}
        </div>
        <div className="num mt-1 text-[40px] leading-tight font-bold tracking-tight">{dollars(main.amount)}</div>
        <div className="mt-1 text-sm text-muted">
          {main.qualifying && (
            <>
              <b className="text-ink">{main.qualifying}</b> or better beaten
            </>
          )}
          {main.lastHit && <> · last hit {lastHitLabel(main.lastHit)}</>}
        </div>
        {main.loserShare && (
          <div className="num mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3.5 text-sm">
            <Share label="Losing hand" value={main.loserShare} />
            <Share label="Winning hand" value={main.winnerShare} />
            <Share label="Table share" value={main.tableShare} />
          </div>
        )}
      </div>
      {rest.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {rest.map((j) => (
            <div key={j.key} className="card p-3.5">
              <div className="text-xs font-medium uppercase tracking-wide text-faint">{j.label}</div>
              <div className="num mt-1 text-xl font-semibold">{dollars(j.amount)}</div>
              {j.qualifying && <div className="mt-0.5 text-xs text-muted">{j.qualifying} or better beaten</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Share({ label, value }) {
  return (
    <div>
      <div className="text-xs text-faint">{label}</div>
      <div className="font-semibold">{value ? dollars(Math.round(value)) : '—'}</div>
    </div>
  )
}

/** A series card; tap to open its day-by-day schedule. */
function SeriesCard({ series: s, tournaments, today }) {
  const [open, setOpen] = useState(false)
  const days = useMemo(() => (open ? seriesSchedule(tournaments, s.key) : []), [open, tournaments, s.key])
  const running = s.start <= today

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">{s.name}</span>
            {running && <Badge tone="accent">On now</Badge>}
          </div>
          <div className="mt-0.5 text-sm text-muted">
            {dateRange(s.start, s.end)} · {s.events} events
            {s.mainGuarantee ? ` · ${compactDollars(s.mainGuarantee)} GTD` : ''}
          </div>
        </div>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="border-t border-white/5 px-4 pt-1 pb-3">
          {days.map((d) => (
            <div key={d.date} className="pt-3">
              <div className="mb-1 text-xs font-semibold text-accent">{formatDay(d.date)}</div>
              {d.events.map((e) => (
                <TournamentRow key={e.id} t={e} name={shortName(e)} />
              ))}
            </div>
          ))}
          <a href={s.url} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-medium text-accent">
            Full details on playground.ca →
          </a>
        </div>
      )}
    </div>
  )
}

/** Day chips + kind filter + that day's tournaments. */
function Schedule({ tournaments, today, stale }) {
  const [kind, setKind] = useState('all')
  const days = useMemo(() => scheduleDays(tournaments, today, kind), [tournaments, today, kind])
  const [picked, setPicked] = useState(null)
  // Keep the chosen day if it still has events under the new filter, else the first one.
  const day = days.includes(picked) ? picked : days[0]
  const list = day ? tournamentsOn(tournaments, day, kind) : []
  const now = nowHHMM()

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Tournament schedule</h2>
        {stale && <span className="text-[11px] text-faint">as of {ageLabel(stale)}</span>}
      </div>
      <div className="space-y-2.5">
        <Segmented
          size="sm"
          value={kind}
          onChange={setKind}
          options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
        />
        {/* Horizontally scrolling day chips; bleeds to the screen edge like a native picker. */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPicked(d)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ${
                d === day ? 'btn-gold' : 'bg-surface-2 text-muted'
              }`}
            >
              {dayLabel(d, today)}
            </button>
          ))}
        </div>
        <div className="card px-4 py-1">
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">Nothing scheduled.</p>
          ) : (
            list.map((t) => <TournamentRow key={t.id} t={t} past={day === today && t.time < now} />)
          )}
        </div>
      </div>
    </section>
  )
}

/** One tournament: time, name (+ badges / satellite target), buy-in. */
function TournamentRow({ t, name, past }) {
  return (
    <div className={`flex items-start gap-3 border-b border-white/5 py-2.5 last:border-0 ${past ? 'opacity-45' : ''}`}>
      <div className="num w-12 shrink-0 pt-px text-sm font-semibold text-accent">{t.time}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-snug font-medium">{name || t.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {t.kind === 'satellite' && <Badge>Satellite</Badge>}
          {t.kind === 'series' && !name && <Badge tone="accent">{t.seriesName || 'Series'}</Badge>}
          {t.guarantee ? <Badge tone="accent">{compactDollars(t.guarantee)} GTD</Badge> : null}
          {t.seats ? <Badge>{t.seats} seats GTD</Badge> : null}
          {t.target && <span className="text-xs text-muted">→ {t.target}</span>}
        </div>
      </div>
      <div className="num shrink-0 pt-px text-sm font-semibold">{t.buyIn ? dollars(t.buyIn) : ''}</div>
    </div>
  )
}

/** The High Hand promo, spelled out: hours, payouts, minimum hand. */
function HighHand({ hh }) {
  return (
    <a href={hh.url} target="_blank" rel="noreferrer" className="card block p-4 active:bg-surface-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{hh.title}</span>
        {hh.minHand && <Badge tone="accent">{hh.minHand}+</Badge>}
      </div>
      {hh.hours.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-muted">
          {hh.hours.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      {hh.payouts.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-white/5 pt-2 text-sm">
          {hh.payouts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </a>
  )
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 text-faint transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
