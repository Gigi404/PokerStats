/**
 * The tab bar. Sits above the iPhone home indicator via pb-safe.
 */
const TABS = [
  { id: 'sessions', label: 'Sessions', icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'playground', label: 'Playground', icon: 'M8 3v3m8-3v3M4 10h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
  { id: 'stats', label: 'Stats', icon: 'M4 19V9m6 10V5m6 14v-7m4 7H3' },
  { id: 'more', label: 'Backup', icon: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' },
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
              <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${active ? 'bg-accent/15' : ''}`}>
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
