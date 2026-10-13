import { useState } from 'react'
import { Segmented } from '../components/ui.jsx'
import { formatPct } from '../lib/online.js'

/*
  Bet sizing against this pool, from PokerEdge's analysis/sizing.py
  (play.sizing). For each open size and c-bet size: how often the bet won at
  once, against what a pure bluff of that size needs to break even, and the
  margin between them — the fold-equity part of the value only (called hands
  still have equity). Beside it, how much of your betting uses each size and
  how often yours won. Counted, not graded. Absent in older files.
*/

const MIN_SPOTS = 20
const title = 'mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint'

/** @param {{s: object}} props  summary.play.sizing */
export default function Sizing({ s }) {
  const [game, setGame] = useState('tournament')
  const [cbetBy, setCbetBy] = useState('hu')
  if (!s || !s.tournament) return null
  const g = s[game]
  return (
    <div className="card p-3.5">
      <div className={title}>Bet sizing vs this pool</div>
      <p className="mb-2 text-[11px] text-faint">
        How often each size wins at once, against what a pure bluff of that size needs. Margin: won − needed.
      </p>
      <div className="mb-2">
        <Segmented
          size="sm"
          value={game}
          onChange={setGame}
          options={[
            { value: 'tournament', label: 'Tournaments' },
            { value: 'cash', label: 'Cash' },
          ]}
        />
      </div>

      <div className={`${title} mt-2`}>Opens</div>
      <SizeTable bands={s.open_bands} pool={g.opens.pool.all} hero={g.opens.hero.all} />

      <div className={`${title} mt-4`}>C-bets</div>
      <div className="mb-1.5">
        <Segmented
          size="sm"
          value={cbetBy}
          onChange={setCbetBy}
          options={[
            { value: 'hu', label: 'Heads-up' },
            { value: 'multi', label: 'Multiway' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>
      <SizeTable
        bands={s.cbet_bands}
        pool={cbetBy === 'all' ? g.cbets.pool.all : g.cbets.pool.by[cbetBy]}
        hero={g.cbets.hero.all}
        heroNote={cbetBy !== 'all'}
      />
      <p className="mt-2 text-[11px] text-faint">
        Pool: every other player&apos;s bets. Who uses a size (short stacks, some seats) colours its result, so read a
        size against its neighbours. Under {MIN_SPOTS} bets is faded.
      </p>
    </div>
  )
}

function SizeTable({ bands, pool, hero, heroNote = false }) {
  return (
    <table className="num w-full table-fixed text-sm">
      <colgroup>
        <col />
        <col className="w-[5.5rem]" />
        <col className="w-[5.5rem]" />
      </colgroup>
      <thead>
        <tr className="text-[11px] text-faint">
          <th className="pb-1 text-left font-normal">Size</th>
          <th className="pb-1 text-right font-normal">Pool won · need</th>
          <th className="pb-1 text-right font-normal">You{heroNote ? ' (all)' : ''}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {bands.map((b) => {
          const p = pool[b.key]
          const h = hero[b.key]
          const thin = p.n < MIN_SPOTS
          return (
            <tr key={b.key}>
              <td className="py-1.5">{b.label}</td>
              <td className={`py-1.5 text-right ${thin ? 'text-faint' : ''}`}>
                <div>
                  {formatPct(p.won_pct)} · {formatPct(p.break_even)}
                </div>
                <div className={`text-[11px] ${thin ? 'text-faint' : p.margin > 0 ? 'text-gain' : 'text-loss'}`}>
                  {p.margin === null ? '—' : `${p.margin > 0 ? '+' : '−'}${Math.abs(p.margin)}`}
                  <span className="text-faint"> ·{p.n}</span>
                </div>
              </td>
              <td className="py-1.5 text-right">
                <div className={h.n < MIN_SPOTS ? 'text-faint' : ''}>{h.share === null ? '—' : `${h.share}% of yours`}</div>
                <div className="text-[11px] text-faint">
                  {h.n ? `won ${formatPct(h.won_pct)} ·${h.n}` : 'none'}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
