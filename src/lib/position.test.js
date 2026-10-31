import { describe, expect, it } from 'vitest'
import { edge, positionHeadline, sideValue, textureLine } from './position.js'
import { NOTE_KEYS, studyNotes } from './study.js'
import { THEORY_KEYS, theory } from './theory.js'

const side = (ip, oop, se = 0.1, n = 500) => ({ ip: { n, bb: ip, se }, oop: { n, bb: oop, se } })

describe('sideValue', () => {
  it('shows a signed value', () => {
    expect(sideValue({ n: 500, bb: 0.13 })).toBe('+0.13bb')
    expect(sideValue({ n: 500, bb: -0.9 })).toBe('−0.9bb')
  })
  it('says too few under the minimum', () => {
    expect(sideValue({ n: 12, bb: 4 })).toBe('too few')
  })
})

describe('edge', () => {
  it('is the gap with its error', () => {
    expect(edge(side(0.9, -0.9, 0.3))).toEqual({ bb: 1.8, se: 0.42 })
  })
  it('refuses a thin side', () => {
    expect(edge(side(1, -1, 0.1, 5))).toBeNull()
  })
})

describe('positionHeadline', () => {
  it('names a clear shortfall', () => {
    const t = positionHeadline({ hero: side(0.1, 0, 0.1), pool: side(0.9, -0.9, 0.1) })
    expect(t).toContain('You take less of it than they do.')
  })
  it('hedges a small one', () => {
    const t = positionHeadline({ hero: side(0.1, 0, 0.6), pool: side(0.9, -0.9, 0.1) })
    expect(t).toContain('not by much more than the noise')
  })
  it('calls noise noise', () => {
    expect(positionHeadline({ hero: side(0.8, -0.8, 0.5), pool: side(0.9, -0.9, 0.1) })).toContain('within the noise')
  })
  it('says when there is too little', () => {
    expect(positionHeadline({})).toContain('Not enough')
  })
})

describe('textureLine', () => {
  it('reads in board order', () => {
    expect(textureLine({ wet: { n: 30, mistakes: 5 }, dry: { n: 40, mistakes: 2 } })).toBe('dry 2 of 40, wet 5 of 30')
  })
  it('is empty without data', () => {
    expect(textureLine(undefined)).toBeNull()
  })
})

describe('study notes', () => {
  it('only sit on cards that exist', () => {
    for (const k of NOTE_KEYS) expect(THEORY_KEYS).toContain(k)
  })
  it('reach the theory card', () => {
    expect(theory('postflop:fold').notes).toEqual(studyNotes('postflop:fold'))
    expect(theory('shove:fold').notes).toEqual([])
  })
})
