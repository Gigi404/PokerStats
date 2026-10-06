import { useCallback, useEffect, useState } from 'react'
import * as repo from '../lib/repo.js'
import { ONLINE_URL, SUPPORTED_SCHEMA, WrongPassphraseError, deriveKey, openEnvelope } from '../lib/online.js'

// Kept in the app's own IndexedDB on this phone, never sent anywhere.
const PASS_KEY = 'onlinePassphrase'
// The derived AES key for the last file seen, with the salt it was made for.
// Deriving costs ~1s of PBKDF2; the salt only changes when PokerEdge publishes
// new results, so most opens skip it. A CryptoKey is stored as-is (structured
// clone) and is non-extractable: the raw key never leaves WebCrypto.
const KEY_CACHE = 'onlineKey'

/**
 * The online results, unlocked.
 *
 * status:
 *   'loading'   reading the stored passphrase / fetching / unlocking
 *   'locked'    no passphrase yet, or the stored one no longer opens the file
 *               (`error` says which)
 *   'ready'     `data` is the summary, `publishedAt` when the beast sent it
 *   'error'     the file could not be fetched and there is no saved copy
 *
 * Fetched once per app open. The service worker answers from the network when
 * there is signal and from its last copy when there isn't (NetworkFirst, see
 * vite.config.js), so the tab works at a table with no reception and says how
 * old its copy is.
 */
export default function useOnline() {
  const [state, setState] = useState({ status: 'loading', data: null, publishedAt: null, error: null })
  const [envelope, setEnvelope] = useState(null)

  /** Open `env` with `passphrase`, reusing the cached key when the salt matches. */
  const open = useCallback(async (env, passphrase) => {
    let key = null
    try {
      const cached = await repo.getMeta(KEY_CACHE)
      if (cached?.salt === env.salt && cached.key) key = cached.key
    } catch {
      /* no cache: derive below */
    }
    if (!key) key = await deriveKey(passphrase, env)
    const data = await openEnvelope(env, key)
    // Only a key that worked is worth keeping. Some browsers cannot store a
    // CryptoKey; that just means deriving again next time.
    repo.setMeta(KEY_CACHE, { salt: env.salt, key }).catch(() => {})
    return data
  }, [])

  const show = useCallback((env, data) => {
    if ((data.schema ?? 1) > SUPPORTED_SCHEMA) {
      setState({ status: 'error', data: null, publishedAt: env.published_at, error: new Error('These results need a newer version of the app. Close it completely and reopen it with signal to update.') })
      return
    }
    setState({ status: 'ready', data, publishedAt: env.published_at, error: null })
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let env
      try {
        const res = await fetch(ONLINE_URL, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        env = await res.json()
      } catch (error) {
        if (!cancelled) setState({ status: 'error', data: null, publishedAt: null, error })
        return
      }
      if (cancelled) return
      setEnvelope(env)

      const passphrase = await repo.getMeta(PASS_KEY).catch(() => null)
      if (!passphrase) {
        if (!cancelled) setState({ status: 'locked', data: null, publishedAt: env.published_at, error: null })
        return
      }
      try {
        const data = await open(env, passphrase)
        if (!cancelled) show(env, data)
      } catch (error) {
        if (cancelled) return
        // The stored passphrase stopped working: it was changed on the beast.
        const message = error instanceof WrongPassphraseError
          ? new Error('The passphrase was changed. Enter the new one.')
          : error
        setState({ status: error instanceof WrongPassphraseError ? 'locked' : 'error', data: null, publishedAt: env.published_at, error: message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, show])

  /**
   * Try a passphrase typed on the gate. Saves it only if it opens the file.
   * @returns {Promise<boolean>}
   */
  const unlock = useCallback(
    async (passphrase) => {
      if (!envelope) return false
      // No 'loading' state here: the form stays up and shows "Unlocking…".
      try {
        const data = await open(envelope, passphrase)
        await repo.setMeta(PASS_KEY, passphrase)
        show(envelope, data)
        return true
      } catch (error) {
        setState({ status: 'locked', data: null, publishedAt: envelope.published_at, error })
        return false
      }
    },
    [envelope, open, show],
  )

  /** Remove the passphrase and cached key from this phone. */
  const forget = useCallback(async () => {
    await repo.setMeta(PASS_KEY, null)
    await repo.setMeta(KEY_CACHE, null)
    setState((s) => ({ status: 'locked', data: null, publishedAt: s.publishedAt, error: null }))
  }, [])

  return { ...state, unlock, forget }
}
