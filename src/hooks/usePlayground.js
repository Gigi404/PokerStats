import { useEffect, useState } from 'react'

// Written by scripts/fetch-playground.mjs at deploy time and every morning.
const URL = `${import.meta.env.BASE_URL}data/playground.json`

/**
 * Playground's schedule, promos and jackpots.
 *
 * Fetched once per app open. The service worker answers from the network when
 * there is signal and from its last copy when there isn't (NetworkFirst, see
 * vite.config.js), so this works at a table with no reception — the tab then
 * shows the copy's age rather than pretending it is current.
 */
export default function usePlayground() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false
    fetch(URL, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => !cancelled && setState({ status: 'ready', data, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', data: null, error }))
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
