/**
 * The tab bar. Sits above the iPhone home indicator via pb-safe.
 */
const TABS = [
  { id: 'sessions', label: 'Sessions', icon: 'M4 6h16M4 12h16M4 18h10' },
  // Globe: results that arrive from PokerStars by themselves.
  { id: 'online', label: 'Online', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18' },
  // Puzzle piece: spots from your own hands (Phase 8).
  { id: 'puzzles', label: 'Puzzles', icon: 'M4 7h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4z' },
  { id: 'stats', label: 'Stats', icon: 'M4 19V9m6 10V5m6 14v-7m4 7H3' },
  // Playground and Backup live under More since 2026-10-17 (owner: try it,
  // the tabs get reworked anyway).
  { id: 'more', label: 'More', icon: 'M5 12h.01M12 12h.01M19 12h.01' },
]

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold ${
                active ? 'text-accent' : 'text-faint'
              }`}
            >
              {/* Active tab sits in a soft pill, like the native tab bars. */}
              <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? 'bg-accent/15' : ''}`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.icon} />
              </svg>
              </span>
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
