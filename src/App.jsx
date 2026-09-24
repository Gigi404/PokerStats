import { useCallback, useEffect, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import useSessions from './hooks/useSessions.js'
import * as repo from './lib/repo.js'
import { newSession, startSession } from './lib/sessions.js'
import { isInstalled } from './lib/storage.js'
import Backup from './screens/Backup.jsx'
import SessionForm from './screens/SessionForm.jsx'
import Sessions from './screens/Sessions.jsx'
import Stats from './screens/Stats.jsx'

// Nudge for a backup once this many sessions have been added or changed since
// the last one. Small enough that a lost phone costs a couple of weeks, not a year.
const BACKUP_EVERY = 10

export default function App() {
  const { sessions, status, error, save, remove, reload } = useSessions()
  const [tab, setTab] = useState('sessions')
  const [editing, setEditing] = useState(null) // { session, mode } while the form is open
  const [lastBackup, setLastBackup] = useState(null)
  const [installed] = useState(isInstalled)

  // Tell index.html's startup check that React mounted.
  useEffect(() => {
    window.__pokerStarted = true
  }, [])

  useEffect(() => {
    repo.getMeta('lastBackupAt').then((v) => setLastBackup(v || null)).catch(() => {})
  }, [])

  const changedSinceBackup = sessions.filter((s) => !lastBackup || s.updatedAt > lastBackup).length
  const backupDue = changedSinceBackup >= BACKUP_EVERY

  const markBackedUp = useCallback(async () => {
    const at = new Date().toISOString()
    await repo.setMeta('lastBackupAt', at)
    setLastBackup(at)
  }, [])

  const handleSave = async (session) => {
    await save(session)
    setEditing(null)
  }

  const handleDelete = async (id) => {
    await remove(id)
    setEditing(null)
  }

  const handleRebuy = (session, cents) => save({ ...session, buyIns: [...session.buyIns, cents] })

  if (status === 'error') {
    return (
      <div className="pt-safe mx-auto max-w-lg px-5 py-10">
        <h1 className="text-xl font-semibold">PokerStats can&apos;t reach its storage</h1>
        <p className="mt-2 text-muted">
          {String(error?.message || error)}. If Safari is in Private Browsing mode, turn it off — the app needs storage
          to keep your sessions.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      <header className="pt-safe mx-auto max-w-lg px-4">
        <h1 className="pt-4 pb-3 text-2xl font-bold tracking-tight">
          {{ sessions: 'PokerStats', stats: 'Stats', more: 'Backup' }[tab]}
        </h1>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28">
        {status === 'loading' ? null : tab === 'sessions' ? (
          <Sessions
            sessions={sessions}
            installed={installed}
            backupDue={backupDue}
            onStart={(format, setting) => setEditing({ session: startSession(format, setting, sessions), mode: 'start' })}
            onAdd={() => setEditing({ session: newSession(), mode: 'new' })}
            onOpen={(session) => setEditing({ session, mode: 'edit' })}
            onFinish={(session) => setEditing({ session, mode: 'finish' })}
            onRebuy={handleRebuy}
            onBackup={() => setTab('more')}
          />
        ) : tab === 'stats' ? (
          <Stats sessions={sessions} />
        ) : (
          <Backup sessions={sessions} lastBackup={lastBackup} onBackedUp={markBackedUp} onRestored={reload} />
        )}
      </main>

      <BottomNav tab={tab} onChange={setTab} />

      {editing && (
        <SessionForm
          key={editing.session.id + editing.mode}
          session={editing.session}
          mode={editing.mode}
          sessions={sessions}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
