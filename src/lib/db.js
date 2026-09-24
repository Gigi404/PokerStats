/*
  Low-level IndexedDB access — the only place her data lives.

  Raw API, no idb/Dexie, the same as Ritual's lib/db.js, and for the same
  reasons: zero dependencies in the layer that owns the record, and one request
  per transaction. An IndexedDB transaction auto-commits the moment the
  microtask queue drains, so awaiting anything in the middle of one silently
  kills it; one request per transaction makes that mistake impossible to write.
*/

const DB_NAME = 'pokerstats'
const DB_VERSION = 1

export const STORES = {
  // One row per session, keyed by a uuid (two sessions on the same day are
  // both real — never key a session by its date).
  SESSIONS: 'sessions',
  // Small key/value facts: when she last took a backup.
  META: 'meta',
}

let dbPromise = null

/** Open (and on first run, create) the database. Every caller shares one connection. */
export function openDb() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('This browser has no storage for apps (private browsing?).'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      // Guarded by contains() so a future v2 can add stores without ever
      // touching these — an upgrade must never be able to cost history.
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessions = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' })
        sessions.createIndex('date', 'date', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      // Forget the failed attempt so the next call can retry instead of
      // returning the same rejected promise forever.
      dbPromise = null
      reject(request.error)
    }
    request.onblocked = () => reject(new Error('Storage upgrade blocked by another open copy of the app.'))
  })

  return dbPromise
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Read every record in a store. */
export async function getAll(storeName) {
  const db = await openDb()
  return promisify(db.transaction(storeName, 'readonly').objectStore(storeName).getAll())
}

/** Read one record by key; undefined if absent. */
export async function getOne(storeName, key) {
  const db = await openDb()
  return promisify(db.transaction(storeName, 'readonly').objectStore(storeName).get(key))
}

/** Insert or replace one record. */
export async function put(storeName, value) {
  const db = await openDb()
  await promisify(db.transaction(storeName, 'readwrite').objectStore(storeName).put(value))
  return value
}

/** Delete one record by key. */
export async function remove(storeName, key) {
  const db = await openDb()
  return promisify(db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key))
}

/**
 * Replace the ENTIRE contents of a store in one transaction — used only by
 * backup restore. Clear and puts share the transaction, so a restore that fails
 * halfway rolls back to the old data instead of leaving half of each.
 */
export async function replaceAll(storeName, values) {
  const db = await openDb()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  store.clear()
  for (const value of values) store.put(value)
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}
