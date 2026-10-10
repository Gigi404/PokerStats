/*
  Wording for PokerEdge's short-stack grades (core/short_stack.py).

  The summary carries each graded decision as numbers — verdict, how much the
  better option was worth, and the "why" (fold %, call %, equity, pot odds).
  This file only turns those into sentences: no poker rule lives here, the
  judgement was made on the beast.

  A decision is one of three spots, each a choice between going all-in and
  folding:
    shove    folded to you, ≤15bb
    reshove  one raise in front, ≤20bb
    call     facing a shove, ≤25bb
  `ev_bb` is what the all-in option (shove or call) is worth against folding.
*/

const ALL_IN = { shove: 'shove', reshove: 're-shove', call: 'call' }
const GERUND = { shove: 'Shoving', reshove: 'Re-shoving', call: 'Calling' }

/** Signed big blinds, one decimal, with a real minus sign. */
export function bb(v) {
  // Rounded on the magnitude: Math.round(-17.5) is -17, which would show
  // −1.7 for a cost the conclusion line calls 1.8.
  const r = Math.round(Math.abs(v) * 10) / 10
  return `${r === 0 ? '±' : v > 0 ? '+' : '−'}${r}bb`
}

/** What the player did, in the past tense, with the situation. */
export function situation(d) {
  const folded = d.action === 'fold'
  if (d.spot === 'shove') return folded ? 'folded, first in' : 'shoved, first in'
  if (d.spot === 'reshove') return folded ? 'folded to a raise' : 're-shoved over a raise'
  return folded ? 'folded to a shove' : 'called a shove'
}

/**
 * The verdict line: a mark, a short sentence and how much better the chosen
 * option was (or the other option would have been), in big blinds.
 *
 * @returns {{mark: string, text: string, value: string, tone: 'gain'|'loss'|'muted'}}
 */
export function verdictLine(d) {
  const alt = ALL_IN[d.spot]
  const acted = d.action !== 'fold'
  const did = acted ? alt : 'fold'
  if (d.verdict === 'close') {
    return { mark: '≈', text: `Close — ${alt} or fold, about the same`, value: bb(d.ev_bb), tone: 'muted' }
  }
  if (d.verdict === 'correct') {
    return { mark: '✅', text: `Correct ${did}`, value: bb(Math.abs(d.ev_bb)), tone: 'gain' }
  }
  return acted
    ? { mark: '❌', text: `${cap(alt)} — folding was better`, value: bb(-d.cost_bb), tone: 'loss' }
    : { mark: '❌', text: `Folded — ${GERUND[d.spot].toLowerCase()} was better`, value: bb(-d.cost_bb), tone: 'loss' }
}

/**
 * The "why" as a list of sentences: what happens if you go all-in, then
 * the conclusion. Percentages and sample sizes come straight from the file.
 *
 * @returns {{lines: string[], conclusion: string, notes: string[]}}
 */
export function whyLines(d) {
  const w = d.why || {}
  const alt = ALL_IN[d.spot]
  const lines = []
  if (d.spot === 'call') {
    lines.push(`Their shoves here: about the top ${fmt(w.shove_pct)}% of hands.`)
    lines.push(`Your equity against that: ${w.equity_pct}%. The price needed ${w.needed_pct}%.`)
  } else {
    const who = w.players_behind === 1 ? 'the player behind folds' : 'everyone folds'
    lines.push(`If you ${alt}, ${who} ${w.fold_pct}% of the time and you win the ${fmt(d.pot_bb)}bb pot.`)
    if (w.equity_if_called_pct !== null && w.equity_if_called_pct !== undefined) {
      lines.push(`You get called ${w.called_pct}% of the time, and then you have ${w.equity_if_called_pct}% equity.`)
    }
  }
  if (w.bounty_bb > 0) lines.push(`Their bounty is worth ${fmt(w.bounty_bb)}bb to you, counted.`)

  const gerund = GERUND[d.spot]
  const conclusion = d.ev_bb >= 0
    ? `${gerund} earns ${fmt(Math.abs(d.ev_bb))}bb more than folding.`
    : `Folding earns ${fmt(Math.abs(d.ev_bb))}bb more than ${gerund.toLowerCase()}.`

  const notes = []
  if (w.sample) notes.push(`Based on ${w.sample.toLocaleString('en-CA')} similar spots in this player pool.`)
  for (const f of d.flags || []) if (FLAG_TEXT[f]) notes.push(FLAG_TEXT[f])
  return { lines, conclusion, notes }
}

const FLAG_TEXT = {
  satellite: 'Satellite: a seat pays everyone the same, so surviving is worth more than chips say.',
  bounty_unknown: 'Bounty not counted: the starting stack is unknown.',
  others_behind: 'Players still to act are assumed to fold.',
}

/**
 * Decisions for the review list. "mistakes": mistakes only, costliest first.
 * "order": everything, as played.
 */
export function listDecisions(decisions, mode) {
  if (mode === 'order') return decisions
  return decisions.filter((d) => d.verdict === 'mistake').sort((a, b) => b.cost_bb - a.cost_bb)
}

/** Counts and bb given up for one tournament's decisions. */
export function tally(decisions) {
  const t = { n: decisions.length, correct: 0, close: 0, mistake: 0, folds: 0, cost: 0 }
  for (const d of decisions) {
    t[d.verdict] += 1
    if (d.verdict === 'mistake') {
      t.cost += d.cost_bb
      if (d.action === 'fold') t.folds += 1
    }
  }
  t.cost = Math.round(t.cost * 10) / 10
  return t
}

const cap = (s) => s[0].toUpperCase() + s.slice(1)
const fmt = (v) => String(Math.round(v * 10) / 10)
