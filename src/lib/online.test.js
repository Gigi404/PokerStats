import { describe, expect, it } from 'vitest'
import fixture from './online.fixture.json'
import {
  WrongPassphraseError,
  band,
  deriveKey,
  formatPct,
  formatSignedUSD,
  formatUSD,
  openEnvelope,
  ordinal,
  outcomeLabel,
  tournamentCurve,
} from './online.js'

// online.fixture.json was written by PokerEdge's own encryptor
// (tools/publish_summary.encrypt, 1,000 rounds to keep the test fast), so these
// tests prove the phone can open what the beast publishes — not just that this
// file agrees with itself.
describe('online envelope', () => {
  it('opens a file encrypted by PokerEdge', async () => {
    const key = await deriveKey('test phrase élan', fixture)
    const doc = await openEnvelope(fixture, key)
    expect(doc.tournaments.totals).toEqual({ n: 2, net: 12.5 })
  })

  it('rejects a wrong passphrase with a clear error', async () => {
    const key = await deriveKey('test phrase elan', fixture) // missing accent
    await expect(openEnvelope(fixture, key)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('refuses an envelope version it does not know', async () => {
    const key = await deriveKey('test phrase élan', fixture)
    await expect(openEnvelope({ ...fixture, v: 2 }, key)).rejects.toThrow(/Update the app/)
  })
})

describe('online formatting', () => {
  it('writes USD as US$ and always spells out the sign', () => {
    expect(formatUSD(33)).toBe('US$33')
    expect(formatUSD(12.5)).toBe('US$12.50')
    expect(formatSignedUSD(157.69)).toBe('+US$157.69')
    expect(formatSignedUSD(-5.5)).toBe('−US$5.50')
    expect(formatSignedUSD(0)).toBe('US$0')
    expect(formatPct(35.2, { signed: true })).toBe('+35%')
    expect(formatPct(-58.4, { signed: true })).toBe('−58%')
    expect(formatPct(null)).toBe('—')
    expect([1, 2, 3, 4, 11, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '22nd'])
  })

  it('places a stat against its typical range', () => {
    expect(band(18, [20, 26])).toBe('low')
    expect(band(22, [20, 26])).toBe('ok')
    expect(band(30, [20, 26])).toBe('high')
    expect(band(null, [20, 26])).toBeNull()
    expect(band(22, undefined)).toBeNull()
  })
})

describe('tournament history', () => {
  const t = (o) => ({ start: '2026-10-01 20:00:00', format: 'pko', buy_in: 5.5, net: -5.5, ...o })

  it('builds the running total in cents and skips unknown results', () => {
    const curve = tournamentCurve([t({ net: -5.5 }), t({ net: null }), t({ net: 30.8, format: 'satellite' })])
    expect(curve.map((p) => p.total)).toEqual([-550, 2530])
    expect(curve[1].session.venue).toBe('Satellite · US$5.50')
  })

  it('says how each tournament ended', () => {
    expect(outcomeLabel(t({ finish: 4 }))).toBe('4th')
    expect(outcomeLabel(t({ finish: null, source: 'assumed_bust' }))).toBe('Busted')
    expect(outcomeLabel(t({ finish: null, maybe_running: true }))).toBe('Maybe still running')
  })
})
