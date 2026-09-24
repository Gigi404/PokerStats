/**
 * The PokerStats chip — the same mark as public/icon.svg and the home-screen
 * icon, drawn inline so it stays sharp at any size and needs no request.
 */
export default function Logo({ className = 'h-8 w-8' }) {
  const notches = [0, 60, 120, 180, 240, 300]
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="var(--color-accent)" />
      <g fill="var(--color-surface)">
        {notches.map((deg) => (
          <path key={deg} d="M95.3 41.5 L95.3 58.5 L81.5 55.8 L81.5 44.2 Z" transform={`rotate(${deg} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="30" />
      </g>
      <g fill="var(--color-accent)">
        <circle cx="42.2" cy="51.8" r="8.4" />
        <circle cx="57.8" cy="51.8" r="8.4" />
        <path d="M50 32.5 L34 50.6 L66 50.6 Z" />
        <path d="M50 52 L44.4 66.8 L55.6 66.8 Z" />
      </g>
    </svg>
  )
}
