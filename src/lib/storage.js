/*
  Storage durability — ported from Ritual's lib/storage.js.

  By default a browser treats IndexedDB as disposable and may evict it under
  storage pressure. navigator.storage.persist() asks to be exempted. On iPhone
  the bigger protection is being installed: a Home Screen web app is exempt from
  Safari's 7-day clearing of unused site data, which is why the app nags about
  installing (see InstallBanner) and why backups exist at all.

  Everything here is best-effort and never throws.
*/

/** @returns {Promise<'persisted'|'denied'|'unsupported'>} */
export async function ensurePersistentStorage() {
  try {
    if (!navigator.storage?.persist || !navigator.storage?.persisted) return 'unsupported'
    if (await navigator.storage.persisted()) return 'persisted'
    return (await navigator.storage.persist()) ? 'persisted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

/** Current durability, without asking for anything. */
export async function storageStatus() {
  try {
    if (!navigator.storage?.persisted) return 'unsupported'
    return (await navigator.storage.persisted()) ? 'persisted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

/** True when running as the installed Home Screen app rather than in a browser tab. */
export function isInstalled() {
  try {
    return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  } catch {
    return false
  }
}

/** iPhone / iPad (iPadOS reports itself as a Mac, but a touch-screen one). */
export function isIOS() {
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}
