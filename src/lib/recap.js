/*
  Wording for the tournament recap (PokerEdge core/tourney_recap.py, Phase 8).

  The summary carries the recap as data — a grade, the leaks to work on, the
  turning points, every mistake on the timeline, and the all-in luck — and
  this file turns it into short sentences. No poker judgement happens here:
  the beast graded everything.

    review.recap = {
      grade: { accuracy, grade, decisions, right, inaccuracies, mistakes, blunders,
               groups: { short_stack|bb|postflop: same } },
      work_on: [{ lesson, count, cost_bb, stack_range, example }],
      keep: { group, decisions, right, accuracy } | null,
      mistakes: [{ i, hand_id, tier, cost_bb }],
      turning_points: [{ kind: 'hand', hand_id, i, time, before_bb, after_bb, net_bb,
                         verdict, bust } | { kind: 'stretch', i, i_end, from, to,
                         mistakes, cost_bb, worst_hand_id }],
    }
    review.luck = { allins, expected_bb, actual_bb, luck_bb }
    key_hand.allin = { street, equity, expected_bb, actual_bb, luck_bb, opponents, approx }
*/

/** Each leak, keyed '<area>:<better play>': a title and what happened, counted. */
const LESSONS = {
  'shove:shove': ['Shove more when short', (n) => `${n} fold${s(n)} that should have been all-in`],
  'shove:fold': ['Shove less', (n) => `${n} shove${s(n)} that should have been a fold`],
  'call:call': ['Call more shoves', (n) => `${n} fold${s(n)} that should have been a call`],
  'call:fold': ['Call fewer shoves', (n) => `${n} call${s(n)} that should have been a fold`],
  'reshove:shove': ['Re-shove more over a raise', (n) => `${n} fold${s(n)} that should have been a re-shove`],
  'reshove:fold': ['Re-shove less', (n) => `${n} re-shove${s(n)} that should have been a fold`],
  'fourbet:shove': ['Jam more when 3-bet', (n) => `${n} fold${s(n)} to a 3-bet that should have been a jam`],
  'fourbet:fold': ['Jam less when 3-bet', (n) => `${n} jam${s(n)} that should have been a fold`],
  'steal:play': ['Open more at 15–25bb', (n) => `${n} fold${s(n)} where raising or shoving was better`],
  'bb:defend': ['Defend your big blind more', (n) => `${n} fold${s(n)} that should have been a defend`],
  'bb:fold': ['Defend your big blind less', (n) => `${n} defend${s(n)} that should have been a fold`],
  'postflop:continue': ['Fold less after the flop', (n) => `${n} fold${s(n)} to a bet that should have continued`],
  'postflop:fold': ['Call down less', (n) => `${n} continue${s(n)} that should have been a fold`],
}

function s(n) {
  return n === 1 ? '' : 's'
}

/** Names for the three areas a grade is split into. */
export const AREA_LABELS = { short_stack: 'Short-stack all-ins', bb: 'Big blind', postflop: 'After the flop' }

/** The words for a leak: { title, detail } — "Shove more when short", "10 folds that should have been all-in · 10bb". */
export function lessonText(w) {
  const [title, count] = LESSONS[w.lesson] || ['Fix this spot', (n) => `${n} mistake${s(n)}`]
  const floor = w.lesson === 'steal:play' ? '≥' : ''
  const where = w.stack_range ? ` at ${rangeText(w.stack_range)}` : ''
  return { title, detail: `${count(w.count)}${where} · ${floor}${w.cost_bb}bb` }
}

function rangeText([a, b]) {
  const lo = Math.round(a)
  const hi = Math.round(b)
  return lo === hi ? `${lo}bb` : `${lo}–${hi}bb`
}

/** The example under a leak: "on the BTN at 7.5bb". */
export function exampleWhere(ex) {
  return [ex.seat && `on the ${ex.seat}`, ex.street && `on the ${ex.street}`, Number.isFinite(ex.stack_bb) && `at ${ex.stack_bb}bb`]
    .filter(Boolean)
    .join(' ')
}

/** Colour of a letter: good is green, middling gold, bad red. */
export function gradeTone(letter) {
  if (!letter) return 'muted'
  const l = letter[0]
  return l === 'A' || l === 'B' ? 'gain' : l === 'C' ? 'accent' : 'loss'
}

/**
 * The one sentence under the grade: what went well and what cost most.
 * Built only from the recap's own numbers.
 */
export function gradeSentence(recap) {
  const g = recap.grade
  if (!g.decisions) return 'No decision in this one was big enough to grade.'
  if (!g.grade) return `Only ${g.decisions} decision${s(g.decisions)} that mattered — too few for a grade.`
  const parts = []
  if (recap.keep) {
    const k = recap.keep
    parts.push(`${AREA_LABELS[k.group] || k.group}: ${k.right} of ${k.decisions} right.`)
  }
  const top = recap.work_on[0]
  if (top) parts.push(`What cost most: ${lessonText(top).title.toLowerCase()}.`)
  else parts.push('No costly mistake.')
  return parts.join(' ')
}

/** Shares of right / inaccuracies / mistakes / blunders for the bar, in percent. */
export function tierShares(g) {
  const n = g.decisions || 0
  if (!n) return []
  return [
    ['right', g.right, 'bg-gain'],
    ['inaccuracies', g.inaccuracies, 'bg-muted/60'],
    ['mistakes', g.mistakes, 'bg-accent'],
    ['blunders', g.blunders, 'bg-loss'],
  ]
    .filter(([, k]) => k > 0)
    .map(([key, k, cls]) => ({ key, pct: (100 * k) / n, cls }))
}

/** The luck line: how the all-ins ran against what they were worth, or null. */
export function luckLine(luck) {
  if (!luck || !luck.allins) return null
  const n = `${luck.allins} all-in${s(luck.allins)}`
  const v = Math.round(Math.abs(luck.luck_bb) * 10) / 10
  if (v < 1) return { text: `${n} · ran about as expected`, tone: 'muted' }
  return luck.luck_bb > 0
    ? { text: `${n} · ran ${v}bb above what they were worth`, tone: 'gain' }
    : { text: `${n} · ran ${v}bb below what they were worth`, tone: 'loss' }
}

const VERDICT_WORD = { right: 'Right', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' }

/** Colour for a decision tier. */
export const TIER_TONE = { right: 'gain', inaccuracy: 'muted', mistake: 'accent', blunder: 'loss' }

/**
 * One turning point in words.
 *
 * @param tp  a turning point from recap.turning_points
 * @param kh  the key hand it refers to (review.key_hands), when kind is 'hand'
 * @returns {{headline: string, detail: string, value: string, tone: string}}
 */
export function turningText(tp, kh) {
  if (tp.kind === 'stretch') {
    return {
      headline: `${tp.from}–${tp.to} · ${tp.mistakes} mistakes close together`,
      detail: 'The stretch where most of the mistakes happened.',
      value: `−${tp.cost_bb}bb`,
      tone: 'accent',
    }
  }
  const moved = `${fmt(tp.before_bb)} → ${fmt(tp.after_bb)}bb`
  const bits = []
  if (kh?.allin) {
    const a = kh.allin
    const odds = `${Math.round(a.equity)}% to win when the money went in`
    bits.push(a.actual_bb > 0 ? `${odds}, and won` : a.actual_bb < 0 ? `${odds}, and lost` : odds)
  }
  if (tp.verdict) bits.push(`${VERDICT_WORD[tp.verdict]} decision`)
  return {
    headline: tp.bust ? `${tp.time} · out` : `${tp.time} · ${moved}`,
    detail: bits.join(' · ') || 'Not a graded spot: this shows what happened, not whether it was right.',
    value: tp.bust ? 'bust' : `${tp.net_bb > 0 ? '+' : tp.net_bb < 0 ? '−' : ''}${Math.abs(tp.net_bb)}bb`,
    tone: tp.bust ? 'muted' : tp.net_bb > 0 ? 'gain' : tp.net_bb < 0 ? 'loss' : 'muted',
  }
}

function fmt(v) {
  return Math.round(v)
}

/**
 * Minutes since the first hand for each "HH:MM", carrying over midnight.
 * A tournament started at 23:40 and still running at 00:15 reads 0 … 35.
 */
export function minutesFrom(times) {
  if (!times?.length) return []
  const raw = times.map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)))
  // Hands are in order, so the clock only goes backwards at midnight.
  let add = 0
  return raw.map((m, i) => {
    if (i && m < raw[i - 1]) add += 1440
    return m + add - raw[0]
  })
}
