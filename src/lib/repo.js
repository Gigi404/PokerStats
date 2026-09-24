/*
  The data layer the screens use. Wraps db.js with the app's own vocabulary.
*/

import { STORES, getAll, getOne, put, remove, replaceAll } from './db.js'

export const listSessions = () => getAll(STORES.SESSIONS)

/** Save a session, stamping updatedAt — which is what the backup reminder counts. */
export function saveSession(session) {
  return put(STORES.SESSIONS, { ...session, updatedAt: new Date().toISOString() })
}

export const deleteSession = (id) => remove(STORES.SESSIONS, id)

export async function getMeta(key) {
  const row = await getOne(STORES.META, key)
  return row?.value
}

export const setMeta = (key, value) => put(STORES.META, { key, value })

/** Replace every session with the ones from a backup, atomically. */
export const restoreSessions = (sessions) => replaceAll(STORES.SESSIONS, sessions)
