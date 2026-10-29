import { useCallback, useEffect, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Logo from './components/Logo.jsx'
import ReviewSheet from './components/ReviewSheet.jsx'
import useSessions from './hooks/useSessions.js'
import * as repo from './lib/repo.js'
import { newSession, startSession } from './lib/sessions.js'
import { isInstalled } from './lib/storage.js'
import Backup from './screens/Backup.jsx'
import More from './screens/More.jsx'
import Online from './screens/Online.jsx'
import Playground from './screens/Playground.jsx'
import Puzzles from './screens/Puzzles.jsx'
import SessionForm from './screens/SessionForm.jsx'
import Sessions from './screens/Sessions.jsx'
import Stats from './screens/Stats.jsx'
import Trust from './screens/Trust.jsx'

// Nudge for a backup once this many sessions have been added or changed since
// the last one. Small enough that a lost phone costs a couple of weeks, not a year.
const BACKUP_EVERY = 10

export default function App() {
  const { sessions, status, error, save, remove, reload } = useSessions()
  const [tab, setTab] = useState('sessions')
  // Under More: null (the list), 'playground', 'backup' or 'trust'.
  const [moreView, setMoreView] = useState(null)
  const openTab = (id) => {
    setTab(id)
    setMoreView(null)
  }
  // Review notes (2026-10-17): a sheet over any screen, from a floating
  // button (hideable) or from More.
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewHidden, setReviewHidden] = useState(false)
  useEffect(() => {
    repo.getMeta('reviewButtonHidden').then((v) => setReviewHidden(!!v)).catch(() => {})
  }, [])
  const toggleReviewButton = () => {
    const next = !reviewHidden
    setReviewHidden(next)
    repo.setMeta('reviewButtonHidden', next).catch(() => {})
  }
  const openMore = (id) => (id === 'review' ? setReviewOpen(true) : setMoreView(id))
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
        <div className="flex items-center gap-2.5 pt-4 pb-4">
          <Logo className="h-8 w-8" />
          {tab === 'more' && moreView && (
            <button type="button" onClick={() => setMoreView(null)} className="text-accent" aria-label="Back to More">
              ‹
            </button>
          )}
          <h1 className="text-[26px] font-bold tracking-tight">
            {tab === 'more'
              ? { playground: 'Playground', backup: 'Backup', trust: 'How sure are we' }[moreView] || 'More'
              : { sessions: 'PokerStats', online: 'Online', puzzles: 'Puzzles', stats: 'Stats' }[tab]}
          </h1>
        </div>
      </header>

      {/* Keyed by tab so each switch replays the fade-up. */}
      <main key={`${tab}-${moreView}`} className="fade-up mx-auto max-w-lg px-4 pb-28">
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
            onBackup={() => {
              setTab('more')
              setMoreView('backup')
            }}
          />
        ) : tab === 'online' ? (
          <Online />
        ) : tab === 'puzzles' ? (
          <Puzzles />
        ) : tab === 'stats' ? (
          <Stats sessions={sessions} />
        ) : moreView === 'playground' ? (
          <Playground />
        ) : moreView === 'backup' ? (
          <Backup sessions={sessions} lastBackup={lastBackup} onBackedUp={markBackedUp} onRestored={reload} />
        ) : moreView === 'trust' ? (
          <Trust />
        ) : (
          <More backupDue={backupDue} onOpen={openMore} />
        )}
      </main>

      {!reviewHidden && !editing && (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="fixed right-4 z-20 rounded-full border border-accent/40 bg-surface/95 px-3.5 py-2 text-[13px] font-semibold text-accent shadow-lg backdrop-blur"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
        >
          ✎ Review
        </button>
      )}
      {reviewOpen && <ReviewSheet onClose={() => setReviewOpen(false)} onHideButton={toggleReviewButton} buttonHidden={reviewHidden} />}

      <BottomNav tab={tab} onChange={openTab} />

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
