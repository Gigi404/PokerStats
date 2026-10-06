/*
  Online results — PokerEdge's summary of the shared PokerStars account.

  Nothing here is typed in. PokerEdge (on the laptop and the beast) reads every
  hand history, builds one summary document, encrypts it and publishes it to the
  `data` branch of this repo. The app fetches that file, unlocks it with the
  passphrase stored on this phone, and only displays it: no online result is
  ever saved as a session.

  The file is public (this repo is), so it is encrypted: AES-256-GCM with a key
  derived from the passphrase by PBKDF2-SHA256. Only the publish time is
  readable without the key. The format is fixed by PokerEdge's
  tools/publish_summary.py:

    { v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter, salt, iv, ct, published_at }

  `ct` is ciphertext followed by the GCM tag, which is exactly what WebCrypto
  expects — so no crypto library is bundled.

  Money in the summary is US DOLLARS as plain numbers (PokerStars' currency),
  never converted: the rest of the app is CAD and the two are never added up.
*/

// VITE_ONLINE_URL exists only for local test builds (a copy encrypted with a
// throwaway passphrase, served by `vite preview`); production never sets it.
export const ONLINE_URL = import.meta.env.VITE_ONLINE_URL || 'https://raw.githubusercontent.com/Gigi404/PokerStats/data/online.enc.json'

/** The summary schema this build understands. A newer one shows an update prompt. */
export const SUPPORTED_SCHEMA = 1

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/**
 * Derive the AES key for one envelope. Slow on purpose (hundreds of thousands
 * of PBKDF2 rounds, ~1s on a phone), so callers cache it per salt.
 *
 * @returns {Promise<CryptoKey>} non-extractable, decrypt-only
 */
export async function deriveKey(passphrase, envelope) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64(envelope.salt), iterations: envelope.iter },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
}

/** Thrown when the passphrase does not open the file (GCM tag mismatch). */
export class WrongPassphraseError extends Error {
  constructor() {
    super("That passphrase doesn't open the online results.")
    this.name = 'WrongPassphraseError'
  }
}

/**
 * Decrypt an envelope with an already-derived key.
 *
 * @returns {Promise<object>} the summary document
 * @throws {WrongPassphraseError} when the key is wrong
 */
export async function openEnvelope(envelope, key) {
  if (envelope?.v !== 1 || envelope.alg !== 'AES-256-GCM') {
    throw new Error('The online results file is in a format this version of the app does not know. Update the app.')
  }
  let plain
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(envelope.iv) }, key, b64(envelope.ct))
  } catch {
    throw new WrongPassphraseError()
  }
  return JSON.parse(new TextDecoder().decode(plain))
}

// ---------------------------------------------------------------------------
// Formatting (USD)
// ---------------------------------------------------------------------------

// "US$" on purpose: everything else in the app is CAD and shows a plain "$".
const USD_WHOLE = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const USD_CENTS = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

/** 12.5 → "US$12.50", 33 → "US$33". */
export function formatUSD(dollars) {
  if (dollars === null || dollars === undefined) return '—'
  const rounded = Math.round(dollars * 100) / 100
  return (Number.isInteger(rounded) ? USD_WHOLE : USD_CENTS).format(rounded)
}

/** Signed, the sign always written out: "+US$157.69", "−US$5.50". */
export function formatSignedUSD(dollars) {
  if (dollars === null || dollars === undefined) return '—'
  const rounded = Math.round(dollars * 100) / 100
  if (rounded === 0) return formatUSD(0)
  return (rounded > 0 ? '+' : '−') + formatUSD(Math.abs(rounded))
}

/** 35.2 → "+35%", -58.4 → "−58%", null → "—". */
export function formatPct(value, { signed = false } = {}) {
  if (value === null || value === undefined) return '—'
  const r = Math.round(value)
  if (!signed) return `${r}%`
  return r === 0 ? '0%' : `${r > 0 ? '+' : '−'}${Math.abs(r)}%`
}

/** 1 → "1st", 22 → "22nd". */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ---------------------------------------------------------------------------
// Shaping the summary for the screens
// ---------------------------------------------------------------------------

export const FORMAT_LABELS = {
  pko: 'PKO',
  satellite: 'Satellite',
  power_path: 'Power Path',
  zoom_pko: 'Zoom PKO',
  zoom: 'Zoom',
  freezeout: 'Freezeout',
  unknown: 'Other',
}

/**
 * Where a value sits against a typical range.
 *
 * @param {number|null} value
 * @param {[number, number]|undefined} range
 * @returns {'low'|'ok'|'high'|null} null when there is nothing to compare
 */
export function band(value, range) {
  if (value === null || value === undefined || !range) return null
  if (value < range[0]) return 'low'
  if (value > range[1]) return 'high'
  return 'ok'
}

/**
 * Running total over the tournament history, oldest first, in the shape the
 * profit chart reads: { session: {date, venue}, result, total } in CENTS.
 * Tournaments with an unknown result are skipped rather than drawn as zero.
 */
export function tournamentCurve(history) {
  let total = 0
  return history
    .filter((t) => t.net !== null && t.net !== undefined)
    .map((t) => {
      const result = Math.round(t.net * 100)
      total += result
      return {
        session: { date: (t.start || '').slice(0, 10), venue: `${FORMAT_LABELS[t.format] || 'Tournament'} · ${formatUSD(t.buy_in)}` },
        result,
        total,
      }
    })
}

/**
 * How a tournament ended, in words, for the history list.
 *
 * The summary marks two kinds of "no recorded finish": a bust whose exit hand
 * was never saved (source 'assumed_bust'), and a tournament that may simply
 * still be running when the data was sent (maybe_running).
 */
export function outcomeLabel(t) {
  if (t.maybe_running) return 'Maybe still running'
  if (t.finish) return ordinal(t.finish)
  if (t.source === 'assumed_bust') return 'Busted'
  return 'No result'
}

/** "2026-10" → "Oct 2026". */
export function monthLabel(key) {
  return new Date(`${key}-15T12:00:00`).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
}
