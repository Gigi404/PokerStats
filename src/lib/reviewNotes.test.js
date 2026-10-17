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
})
