/*
  River choices wording — PokerEdge analysis/river_bet_grading.py
  (play.river_choice). The beast prices each bet or check; this turns the
  totals into a verdict. Missed bluffs are never mistakes (owner, 2026-10-30):
  they stay out of the headline and carry no cost.
*/

/** Both games added up, for the headline. */
function totals(r) {
  const games = Object.values(r?.games || {})
  const sum = (key) => games.reduce((n, g) => n + (g[key] || 0), 0)
  return { n: sum('n'), value: sum('missed_value'), bad: sum('bad_bet'), bets: sum('bets') }
}

/** The headline: which side of the river you lose more on. */
export function riverHeadline(r) {
  const t = totals(r)
  if (!t.n) return { tone: 'muted', text: 'Not enough river choices to tell yet.' }
  if (t.value > t.bad) {
    return {
      tone: 'loss',
      text: `You check too many good hands: ${t.value} value bets missed, against ${t.bad} of your ${t.bets} bets that should have been checks.`,
    }
  }
  if (t.bad > t.value) {
    return { tone: 'loss', text: `You bet too often: ${t.bad} bets should have been checks, against ${t.value} value bets missed.` }
  }
  return { tone: 'gain', text: `Your river bets and checks hold up: ${t.value} value bets missed, ${t.bad} bets that should have been checks.` }
}

/** What a verdict was, in words. */
export function spotLabel(g) {
  if (g.kind === 'missed_value') return 'Checked, a value bet was better'
  if (g.kind === 'bad_bet') return `Bet ${g.bet_pct}% of the pot, checking was better`
  return 'Checked, a bluff could work'
}

/** The size a bet would have used, as a share of the pot. */
export function sizeLabel(g) {
  return `${Math.round(g.best_size * 100)}% of the pot`
}

/** One line of range reading: how much of each range the hand beats. */
export function rangeLine(g) {
  return `You beat ${Math.round(g.equity)}% of the hands that call, ${Math.round(g.equity_check)}% of the hands that check.`
}
