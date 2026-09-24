import { useCallback, useEffect, useState } from 'react'
import * as repo from '../lib/repo.js'

/**
 * Every session, loaded once and kept in memory.
 *
 * The whole record is small — a heavy player logs a few hundred sessions a year,
 * a few hundred KB — so holding all of it in state and filtering in JavaScript
 * is simpler and faster than querying IndexedDB per screen.
 *
 * Writes go to IndexedDB first and only then into state, so the screen never
 * shows a session that is not actually saved.
 */
export default function useSessions() {
  const [sessions, setSessions] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    try {
      setSessions(await repo.listSessions())
      setStatus('ready')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    // Async load: setState happens after the await, never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload])

  const save = useCallback(async (session) => {
    const saved = await repo.saveSession(session)
    setSessions((list) => [...list.filter((s) => s.id !== saved.id), saved])
    return saved
  }, [])

  const remove = useCallback(async (id) => {
    await repo.deleteSession(id)
    setSessions((list) => list.filter((s) => s.id !== id))
  }, [])

  return { sessions, status, error, save, remove, reload }
}
