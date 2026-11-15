import { boardCards, layout, totalPot } from '../lib/table.js'

/*
  The puzzle table (2026-11-15): an oval of felt with the players around
  it, hero at the bottom, bets in front of each seat, the dealer button,
  the pot and the board in the middle. One frame of lib/table.js frames()
  at a time; the parent moves through them to deal the hand out.

  Original art in the app's own colours: it looks like a poker client, not
  like any particular one.
*/

const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' }

/** A face-up card; `size` 'lg' for hero's, 'md' for the board, 'sm' for shown hands. */
function Card({ card, size = 'md', delay = 0 }) {
  const rank = card.slice(0, -1).replace('T', '10')
  const suit = card.slice(-1).toLowerCase()
  const red = suit === 'h' || suit === 'd'
  const dims = {
    lg: 'h-[4.1rem] w-[2.9rem] text-[19px]',
    md: 'h-[2.9rem] w-[2.05rem] text-[14px]',
    sm: 'h-[1.9rem] w-[1.35rem] text-[10px]',
  }[size]
  return (
    <span
      className={`deal-in num flex flex-col items-center justify-center rounded-md border border-black/15 bg-[#f7f4ea] font-extrabold leading-none shadow-[0_2px_6px_rgba(0,0,0,0.45)] ${dims} ${
        red ? 'text-[#c0392b]' : 'text-[#141414]'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span>{rank}</span>
      <span className="text-[0.85em]">{SUIT[suit] || suit}</span>
    </span>
  )
}

/** The back of a card, for the players still in. */
function Back() {
  return (
    <span
      className="block h-[1.6rem] w-[1.15rem] rounded-[3px] border border-white/30 shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
      style={{ background: 'repeating-linear-gradient(45deg, #8a1f2b 0 3px, #a8303d 3px 6px)' }}
    />
  )
}

/** A stack of chips with its amount, in front of a seat. */
function Bet({ amount, x, y }) {
  return (
    <div className="pop-in absolute flex items-center gap-1" style={{ left: `${x}%`, top: `${y}%` }}>
      <span className="relative block h-3.5 w-3.5">
        <span className="absolute inset-0 rounded-full border-2 border-dashed border-white/80 bg-[#d4a017]" />
        <span className="absolute inset-0 -translate-y-[3px] rounded-full border-2 border-dashed border-white/80 bg-[#c0392b]" />
      </span>
      <span className="num rounded-full bg-black/55 px-1.5 text-[11px] font-semibold text-white">{amount}</span>
    </div>
  )
}

/**
 * @param {{t: object, frame: object, heroCards: string, reveal?: boolean, glow?: string}} props
 *   t: the puzzle's table; frame: one of frames(t); heroCards: "Ah Kd";
 *   reveal: after the answer, the whole board and the hands shown at showdown.
 */
export default function PokerTable({ t, frame, heroCards, reveal = false }) {
  const spots = layout(frame.seats.length, t.h)
  const board = boardCards(t)
  const showN = reveal ? board.length : frame.boardCount
  const shown = Object.fromEntries((reveal ? t.shown || [] : []).map(([i, c]) => [i, c]))
  const hero = String(heroCards || '').split(/\s+/).filter(Boolean)

  return (
    // Never taller than about half the screen, so on a phone the header, the
    // table and the action buttons fit without scrolling.
    <div className="relative mx-auto aspect-[4/5] select-none" style={{ width: 'min(100%, 26rem, calc(46svh * 0.8))' }}>
      {/* Rail and felt. */}
      <div
        className="absolute inset-x-[7%] inset-y-[9%] rounded-[50%] p-[10px] shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
        style={{ background: 'linear-gradient(160deg, #5a3a22, #2e1d10)' }}
      >
        <div
          className="h-full w-full rounded-[50%] border border-black/40"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #2f8a5a 0%, #1d6a43 45%, #114a2e 100%)' }}
        />
      </div>

      {/* Pot and board. */}
      <div className="absolute left-1/2 top-[44%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        <div className="num rounded-full bg-black/45 px-3 py-0.5 text-[12px] font-semibold text-white">
          Pot {totalPot(frame)}bb
        </div>
        <div className="flex h-[2.9rem] gap-1">
          {board.slice(0, showN).map((c, k) => (
            <Card key={c} card={c} delay={k * 60} />
          ))}
        </div>
      </div>

      {/* Bets in front of the players. */}
      {frame.seats.map((s, i) => (s.bet > 0 ? <Bet key={`b${i}-${s.bet}`} amount={s.bet} x={spots[i].bx} y={spots[i].by} /> : null))}

      {/* Dealer button. */}
      {t.b !== null && t.b !== undefined && spots[t.b] && (
        <span
          className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/30 bg-white text-[10px] font-extrabold text-black shadow"
          style={{ left: `${spots[t.b].dx}%`, top: `${spots[t.b].dy}%` }}
        >
          D
        </span>
      )}

      {/* Seats. */}
      {frame.seats.map((s, i) => {
        const p = spots[i]
        const isHero = i === t.h
        const acting = frame.actor === i
        return (
          <div
            key={i}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-opacity duration-300 ${
              s.folded ? 'opacity-40' : ''
            }`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {/* Cards: hero's face up and large; the others' backs, or what they showed. */}
            {isHero ? (
              <div className="mb-[-0.6rem] flex gap-1">
                {hero.map((c, k) => (
                  <Card key={c} card={c} size="lg" delay={k * 90} />
                ))}
              </div>
            ) : shown[i] ? (
              <div className="mb-[-0.35rem] flex gap-0.5">
                {shown[i].split(/\s+/).map((c) => (
                  <Card key={c} card={c} size="sm" />
                ))}
              </div>
            ) : !s.folded ? (
              <div className="mb-[-0.35rem] flex gap-0.5">
                <Back />
                <Back />
              </div>
            ) : null}

            <div
              className={`relative z-[1] min-w-[3.9rem] rounded-xl border px-2 py-0.5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${
                isHero ? 'border-accent bg-[#1a1405]' : 'border-white/15 bg-[#0d1512]'
              } ${acting ? 'ring-2 ring-accent' : ''}`}
            >
              <div className={`text-[10px] font-bold tracking-wide ${isHero ? 'text-accent' : 'text-muted'}`}>{isHero ? 'YOU' : s.pos}</div>
              <div className="num text-[12px] font-semibold text-ink">{s.allin ? 'All-in' : `${s.stack}bb`}</div>
            </div>

            {s.said && !isHero && (
              <div key={s.said} className="fade-up mt-0.5 rounded-md bg-black/70 px-1.5 text-[10px] font-semibold text-white">
                {s.said}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
