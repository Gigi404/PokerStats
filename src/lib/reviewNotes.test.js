import { describe, expect, it } from 'vitest'
import { CHECKLIST, progressCount, setText, toggleTag, toText } from './reviewNotes.js'

describe('review notes', () => {
  it('toggles tags and keeps text', () => {
    let n = toggleTag({}, 'recap-grade', 'like')
    n = toggleTag(n, 'recap-grade', 'move')
    n = toggleTag(n, 'recap-grade', 'like')
    n = setText(n, 'recap-grade', 'Letter is great, bar too small')
    expect(n['recap-grade']).toEqual({ tags: ['move'], text: 'Letter is great, bar too small' })
  })

  it('counts items with something in them', () => {
    const total = CHECKLIST.reduce((a, s) => a + s.items.length, 0)
    expect(progressCount({})).toEqual({ done: 0, total })
    expect(progressCount({ 'recap-grade': { tags: [], text: '  ' }, 'puz-mix': { tags: ['like'], text: '' } }).done).toBe(1)
  })

  it('shares only what has notes, by screen', () => {
    const notes = { 'puz-mix': { tags: ['like', 'want'], text: 'more river spots' }, _other: { text: 'Love it' } }
    const t = toText(notes, '0.21.0')
    expect(t).toContain('PokerStats review notes (v0.21.0)')
    expect(t).toContain('## Puzzles')
    expect(t).toContain('[Like, Want more]')
    expect(t).toContain('more river spots')
    expect(t).toContain('## Other\nLove it')
    expect(t).not.toContain('## Tournament recap')
    expect(toText({})).toContain('(no notes yet)')
  })

  // Notes are saved on the phone by item key, so a key that changes or
  // disappears silently orphans a note already written. These are the keys of
  // v0.21.0 (36 of them — CLAUDE.md's "35-item" was a miscount); they must all
  // survive any later edit of the checklist.
  const ORIGINAL_KEYS = [
    'day-grade', 'day-letters', 'day-checks',
    'recap-grade', 'recap-sentence', 'recap-luck', 'recap-workon', 'recap-timeline', 'recap-how', 'recap-folded',
    'replay-steps', 'replay-why', 'replay-end',
    'puz-question', 'puz-answer', 'puz-mix', 'puz-filters', 'puz-habit',
    'game-progress', 'game-stats', 'game-opens', 'game-short', 'game-bb', 'game-post', 'game-leaks', 'game-trends', 'game-order',
    'other-overview', 'other-history', 'other-goal', 'other-charts',
    'app-tabs', 'app-more', 'app-dense', 'app-missing', 'app-friend',
  ]
  const keys = CHECKLIST.flatMap((s) => s.items.map(([k]) => k))
  const sectionOf = (key) => CHECKLIST.find((s) => s.items.some(([k]) => k === key))?.screen

  it('has no duplicate keys', () => {
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps every original key, so saved notes still show', () => {
    expect(ORIGINAL_KEYS).toHaveLength(36)
    for (const k of ORIGINAL_KEYS) expect(keys).toContain(k)
  })

  it('asks about the screens built since v0.21.0', () => {
    expect(sectionOf('sess-month')).toBe('Sessions (live)')
    expect(sectionOf('more-trust')).toBe('More')
    for (const k of ['game-luck', 'game-reality', 'game-river', 'game-payjumps', 'game-position', 'game-videos',
      'game-suits', 'game-tilt', 'game-theory', 'game-practise']) {
      expect(sectionOf(k)).toMatch(/^Online → My game/)
    }
  })

  it('shares a new-section note under its own heading', () => {
    const t = toText({ 'sess-mtt': { tags: ['like'], text: 'blue works' } })
    expect(t).toContain('## Sessions (live)\n- MTT rows in blue')
    expect(t).toContain('blue works')
    expect(t).not.toContain('## More')
  })
})
