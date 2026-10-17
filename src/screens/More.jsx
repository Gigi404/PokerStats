/*
  More: the screens that left the tab bar when Puzzles took a slot
  (2026-10-17, owner: "move it for now, we have to rework those tabs
  anyway"). Playground and Backup, one tap away; Backup says so when one
  is due, as the old tab did.
*/

const ROWS = [
  { id: 'playground', label: 'Playground', hint: 'Jackpots, series, the schedule and promotions' },
  { id: 'backup', label: 'Backup', hint: 'Save or restore your live sessions' },
]

export default function More({ backupDue, onOpen }) {
  return (
    <div className="card divide-y divide-white/5">
      {ROWS.map((r) => (
        <button key={r.id} type="button" onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-surface-2">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{r.label}</span>
            <span className="block text-xs text-muted">{r.hint}</span>
          </span>
          {r.id === 'backup' && backupDue && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">due</span>}
          <span className="text-faint" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  )
}
