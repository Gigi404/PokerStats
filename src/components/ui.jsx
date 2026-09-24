/*
  Small shared building blocks. Kept in one file because each is a few lines and
  they only make sense together.
*/

import { formatSigned } from '../lib/money.js'

/**
 * A row of mutually exclusive buttons (Cash | Tournament, Live | Online).
 *
 * @param {{options: {value, label}[], value, onChange, size?: 'sm'|'md'}} props
 */
export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className="flex rounded-xl bg-surface-2 p-1" role="radiogroup">
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg font-medium transition-colors ${
              size === 'sm' ? 'py-1.5 text-sm' : 'py-2.5 text-[15px]'
            } ${selected ? 'bg-accent text-accent-ink' : 'text-muted active:bg-line'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** A labelled form field wrapper. */
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  )
}

/** The input style every text/number/date/time field in the app shares. */
export const inputClass =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-ink placeholder:text-faint focus:border-accent focus:outline-none'

/**
 * A signed profit amount, green for up and red for down. The sign is part of
 * the text (formatSigned), so the colour is reinforcement, never the message.
 */
export function Profit({ cents, className = '' }) {
  const tone = cents > 0 ? 'text-gain' : cents < 0 ? 'text-loss' : 'text-muted'
  return <span className={`num ${tone} ${className}`}>{formatSigned(cents)}</span>
}

/** A stat tile: small label over a large value. */
export function Tile({ label, children, sub }) {
  return (
    <div className="rounded-2xl bg-surface p-3.5">
      <div className="text-xs font-medium uppercase tracking-wide text-faint">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{children}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}

/** A small rounded tag (format, event). */
export function Badge({ children, tone = 'plain' }) {
  const tones = {
    plain: 'bg-surface-2 text-muted',
    accent: 'bg-accent/15 text-accent',
  }
  return <span className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>
}
