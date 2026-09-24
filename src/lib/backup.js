/*
  Backup and export.

  Her sessions exist only on her phone, so these files ARE the backup. Two
  formats, for two different jobs:
    - JSON backup: complete and exact, the only thing Restore accepts.
    - CSV export:  for opening in Numbers / Excel / Google Sheets. Readable, but
                   deliberately not importable — a spreadsheet round trip is
                   where dates get reformatted and amounts lose their cents.
*/

import { compareSessions, isTournament, minutesPlayed, profit, totalIn, totalOut } from './sessions.js'

const APP = 'PokerStats'
const BACKUP_VERSION = 1

/** Every session, wrapped with enough metadata to recognise the file later. */
export function toBackupJSON(sessions) {
  return JSON.stringify(
    { app: APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), sessions },
    null,
    2,
  )
}

/**
 * Parse and check a backup file's text.
 *
 * Checked hard, because restoring REPLACES everything on the phone: a wrong file
 * must be refused with a reason, never half-applied.
 *
 * @returns {object[]} the sessions
 * @throws {Error} with a message fit to show her
 */
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not a PokerStats backup (it is not JSON — the CSV export cannot be restored).')
  }
  if (data?.app !== APP || !Array.isArray(data.sessions)) {
    throw new Error('That file is not a PokerStats backup.')
  }
  if (data.version > BACKUP_VERSION) {
    throw new Error('That backup was made by a newer version of the app. Update the app first.')
  }
  const bad = data.sessions.find((s) => !s || typeof s.id !== 'string' || !s.date || !Array.isArray(s.buyIns))
  if (bad) throw new Error('That backup is damaged: one of its sessions is incomplete.')
  return data.sessions
}

/** Quote a CSV cell only when it needs it. */
function cell(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const dollars = (cents) => (cents === null || cents === undefined ? '' : (cents / 100).toFixed(2))

/** One row per session, oldest first, amounts in dollars. */
export function toCSV(sessions) {
  const header = [
    'Date', 'Format', 'Where', 'Casino / site', 'Game / tournament', 'Start', 'End', 'Hours',
    'Buy-ins', 'Total in', 'Cash-out / prize', 'Bounties', 'Profit', 'Place', 'Entrants', 'Event', 'Notes',
  ]
  const rows = [...sessions].sort(compareSessions).map((s) => {
    const mins = minutesPlayed(s)
    return [
      s.date,
      isTournament(s) ? 'Tournament' : 'Cash',
      s.setting === 'online' ? 'Online' : 'Live',
      s.venue,
      s.game,
      s.start,
      s.end,
      mins === null ? '' : (mins / 60).toFixed(2),
      s.buyIns.map(dollars).join(' + '),
      dollars(totalIn(s)),
      dollars(isTournament(s) ? s.prize : totalOut(s)),
      isTournament(s) ? dollars(s.bounties) : '',
      dollars(profit(s)),
      s.place ?? '',
      s.entrants ?? '',
      s.event,
      s.notes,
    ].map(cell)
  })
  return [header.map(cell), ...rows].map((r) => r.join(',')).join('\n')
}

/**
 * Hand a file to the user.
 *
 * On iPhone the share sheet is the right door: it offers Save to Files, Mail,
 * AirDrop and Messages, and it works inside an installed Home Screen app, where
 * a plain download link is unreliable. Falls back to a download link elsewhere.
 *
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function shareOrDownload(filename, text, type) {
  const file = new File([text], filename, { type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (err) {
      // Closing the share sheet is a choice, not a failure.
      if (err?.name === 'AbortError') return 'cancelled'
      // Anything else: fall through to the download link.
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
