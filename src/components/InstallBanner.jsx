import { isIOS } from '../lib/storage.js'

/**
 * Shown only when the app is open in a browser tab rather than installed.
 *
 * This matters more than it looks on iPhone: Safari and the Home Screen app
 * keep SEPARATE storage. Sessions logged in the Safari tab do not appear in the
 * installed app, and Safari may clear an unused site's data after seven days.
 * So the banner says "install first" before she logs anything worth keeping.
 */
export default function InstallBanner() {
  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
      <div className="font-semibold text-accent">Install the app first</div>
      {isIOS() ? (
        <p className="mt-1 text-ink/90">
          Tap <ShareIcon /> <b>Share</b> at the bottom of Safari, then <b>Add to Home Screen</b>. Open PokerStats from
          your home screen from now on — sessions saved here in Safari stay in Safari.
        </p>
      ) : (
        <p className="mt-1 text-ink/90">
          Use your browser menu → <b>Install app</b> / <b>Add to Home screen</b>, then open it from there. Sessions
          saved in this browser tab stay in this tab.
        </p>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-4 w-4 -translate-y-px" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
