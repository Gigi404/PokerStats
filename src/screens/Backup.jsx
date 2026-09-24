import { useEffect, useRef, useState } from 'react'
import { parseBackup, shareOrDownload, toBackupJSON, toCSV } from '../lib/backup.js'
import * as repo from '../lib/repo.js'
import { storageStatus } from '../lib/storage.js'
import { formatDay, todayKey } from '../lib/time.js'

/**
 * Backup, export and restore.
 *
 * The sessions exist only on this phone. Lose the phone, or delete the app, and
 * they are gone — so this screen is the whole safety net, and it says so
 * plainly instead of burying it under "Settings".
 */
export default function Backup({ sessions, lastBackup, onBackedUp, onRestored }) {
  const [message, setMessage] = useState(null)
  const [pending, setPending] = useState(null) // sessions parsed from a file, awaiting confirmation
  const [durable, setDurable] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    storageStatus().then(setDurable)
  }, [])

  const backup = async () => {
    const result = await shareOrDownload(`pokerstats-backup-${todayKey()}.json`, toBackupJSON(sessions), 'application/json')
    if (result === 'cancelled') return
    await onBackedUp()
    setMessage({ tone: 'ok', text: `Backup of ${sessions.length} sessions saved. Keep it somewhere off this phone (Files → iCloud Drive, or email it to yourself).` })
  }

  const exportCsv = async () => {
    await shareOrDownload(`pokerstats-${todayKey()}.csv`, toCSV(sessions), 'text/csv')
  }

  const readFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still fires
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
      setMessage(null)
    } catch (err) {
      setPending(null)
      setMessage({ tone: 'bad', text: err.message })
    }
  }

  const restore = async () => {
    try {
      await repo.restoreSessions(pending)
      await onRestored()
      setMessage({ tone: 'ok', text: `Restored ${pending.length} sessions.` })
    } catch (err) {
      setMessage({ tone: 'bad', text: `Restore failed, nothing was changed: ${err?.message || err}` })
    }
    setPending(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface p-4 text-sm">
        <div className="font-semibold">Your sessions live on this phone only</div>
        <p className="mt-1 text-muted">
          Nothing is sent anywhere. That keeps them private, but it also means a backup file is the only copy if the
          phone is lost or the app is deleted.
        </p>
        <p className="mt-2 text-faint">
          {sessions.length} sessions · last backup: {lastBackup ? formatDay(lastBackup.slice(0, 10), true) : 'never'}
        </p>
      </div>

      <button type="button" onClick={backup} disabled={!sessions.length} className="w-full rounded-xl bg-accent py-3.5 font-semibold text-accent-ink disabled:opacity-40">
        Save a backup
      </button>
      <button type="button" onClick={exportCsv} disabled={!sessions.length} className="w-full rounded-xl bg-surface-2 py-3.5 font-semibold disabled:opacity-40">
        Export spreadsheet (CSV)
      </button>

      {message && <p className={`rounded-xl p-3 text-sm ${message.tone === 'ok' ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'}`}>{message.text}</p>}

      <div className="rounded-2xl bg-surface p-4 text-sm">
        <div className="font-semibold">Restore from a backup</div>
        <p className="mt-1 text-muted">Replaces everything in the app with the sessions in the backup file.</p>
        {pending ? (
          <div className="mt-3 space-y-2">
            <p>
              This backup holds <b>{pending.length}</b> sessions. The <b>{sessions.length}</b> currently in the app will be
              replaced.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPending(null)} className="flex-1 rounded-xl bg-surface-2 py-2.5">
                Cancel
              </button>
              <button type="button" onClick={restore} className="flex-1 rounded-xl bg-loss py-2.5 font-semibold text-bg">
                Replace
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 w-full rounded-xl bg-surface-2 py-2.5 font-medium">
            Choose backup file…
          </button>
        )}
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={readFile} />
      </div>

      <p className="px-1 text-xs text-faint">
        Storage protection: {durable === 'persisted' ? 'on' : durable === 'denied' ? 'not granted by the browser' : 'managed by the phone'}
        {' · '}PokerStats v{__APP_VERSION__}
      </p>
    </div>
  )
}
