/*
  Table sounds for the puzzles (2026-11-15), made with Web Audio: a chip
  click per action, a chime for a right answer, a low buzz for a wrong one,
  a short fanfare on a new level, a tick in the last seconds of the time
  bank. Synthesised, so there are no files to ship.

  Browsers start audio only after a tap: the first sounds of the very first
  puzzle may be silent until the player touches the screen, and every call
  quietly does nothing where Web Audio is missing. On iPhone the ring/silent
  switch can mute it. Vibration is added where the phone supports it
  (Android; Safari on iPhone does not).
*/

let ctx = null

function audio() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/** One shaped tone: frequency (Hz), start offset and length (s), wave, volume. */
function tone(freq, at, len, type = 'sine', vol = 0.18) {
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + at
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
  osc.connect(gain).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + len + 0.02)
}

function buzz(ms) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Not supported: nothing to do.
  }
}

/** The sounds, each a no-op when `on` is false. */
export function sounds(on) {
  const play = (fn) => () => {
    if (!on) return
    try {
      fn()
    } catch {
      // Audio is decoration: never let it break a puzzle.
    }
  }
  return {
    chip: play(() => {
      tone(2400, 0, 0.04, 'triangle', 0.08)
      tone(1800, 0.03, 0.05, 'triangle', 0.06)
    }),
    right: play(() => {
      tone(880, 0, 0.14)
      tone(1320, 0.1, 0.22)
      buzz(30)
    }),
    wrong: play(() => {
      tone(180, 0, 0.28, 'sawtooth', 0.09)
      buzz([60, 40, 60])
    }),
    levelUp: play(() => {
      ;[660, 880, 1100, 1320].forEach((f, i) => tone(f, i * 0.09, 0.18, 'triangle', 0.14))
      buzz([40, 30, 40, 30, 80])
    }),
    tick: play(() => tone(1000, 0, 0.03, 'square', 0.05)),
  }
}
