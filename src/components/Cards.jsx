/*
  Playing cards as the Online screens draw them. Shared by the tournament
  review and the short-stack grades.
*/

const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' }

/** "Jd Jh" → two little cards; hearts and diamonds in red. */
export default function Cards({ cards, small = false }) {
  const list = String(cards || '').split(/[\s,]+/).filter(Boolean)
  if (!list.length) return <span className="text-faint">??</span>
  return (
    <span className="inline-flex gap-0.5">
      {list.map((c, i) => {
        const rank = c.slice(0, -1).replace('T', '10')
        const suit = c.slice(-1).toLowerCase()
        const red = suit === 'h' || suit === 'd'
        return (
          <span
            key={c + i}
            className={`num inline-flex items-center justify-center rounded border border-black/10 bg-[#f4f1e8] font-bold leading-none ${
              small ? 'h-5 min-w-[1.25rem] px-0.5 text-[10px]' : 'h-7 min-w-[1.75rem] px-1 text-[13px]'
            } ${red ? 'text-[#c0392b]' : 'text-[#111]'}`}
          >
            {rank}
            {SUIT[suit] || suit}
          </span>
        )
      })}
    </span>
  )
}
