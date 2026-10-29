import { describe, expect, it } from 'vitest'
import { blunderNote, cutTone, signed, tiltHeadline } from './tilt.js'

const cut = (key, label, diff, finding = null, extra = {}) => ({ key, label, diff, finding, ...extra })

describe('tiltHeadline', () => {
  it('names the worst tilt when there is one', () => {
    const h = tiltHeadline({
      cuts: [cut('bust', 'After busting a tournament', -4.1, 'worse'), cut('bad_beat', 'After a bad beat', -6.0, 'worse')],
    })
    expect(h.tone).toBe('loss')
    expect(h.text).toContain('after a bad beat')
    expect(h.text).toContain('drop 6 points')
  })
  it('says no tilt when nothing is worse, even with a better cut', () => {
    expect(tiltHeadline({ cuts: [cut('bust', 'x', 3.3, 'better'), cut('blunder', 'y', -1.2)] }).tone).toBe('gain')
  })
  it('says too few when nothing could be tested', () => {
    expect(tiltHeadline({ cuts: [cut('bust', 'x', null)] }).tone).toBe('muted')
  })
})

describe('blunderNote / signed / cutTone', () => {
  it('explains clustered mistakes when the like-for-like gap is noise', () => {
    const n = blunderNote({ cuts: [cut('blunder', 'b', -1.2, null, { accuracy: 79.3, rest: 86.6 })] })
    expect(n).toContain('79.3% after a blunder against 86.6%')
    expect(n).toContain('−1.2')
    expect(blunderNote({ cuts: [cut('blunder', 'b', -5, 'worse', { accuracy: 70, rest: 86 })] })).toBeNull()
  })
  it('formats and colours', () => {
    expect([signed(3.6), signed(-1.2), signed(0), signed(null)]).toEqual(['+3.6', '−1.2', '0', '—'])
    expect([cutTone({ finding: 'worse' }), cutTone({ finding: 'better' }), cutTone({ finding: null })]).toEqual(['loss', 'gain', 'muted'])
  })
})
