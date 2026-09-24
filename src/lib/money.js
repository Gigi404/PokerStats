/*
  Money.

  Every amount is stored as an integer number of CENTS, never as a float of
  dollars. 0.1 + 0.2 !== 0.3 in JavaScript, and a results tracker is the one
  place a running total that drifts by a cent over two hundred sessions would be
  noticed — and would make every other number on the screen suspect.
*/

// Poker amounts are nearly always whole dollars, so a $300 buy-in reads "$300"
// rather than "$300.00" — but an amount that has cents shows both digits
// ("$45.50", never "$45.5"). Two formatters, picked per amount.
const WHOLE = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
const CENTS = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })
const CAD = { format: (dollars) => (Number.isInteger(Math.round(dollars * 100) / 100) ? WHOLE : CENTS).format(dollars) }

/**
 * Parse what someone typed into an amount field into cents.
 *
 * Forgiving on purpose — this is typed one-handed at a table: "$1,200",
 * "1200.5", " 300 " and "300," all parse. A comma followed by exactly one or two
 * digits at the end is read as a French-style decimal ("12,50" → $12.50);
 * any other comma is a thousands separator.
 *
 * @param {string|number|null|undefined} input
 * @returns {number|null} cents, or null when the field is empty or not a number
 */
export function toCents(input) {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null

  let text = String(input).trim().replace(/[$\s]/g, '')
  if (!text) return null

  if (/,\d{1,2}$/.test(text) && !text.includes('.')) {
    text = text.replace(/,(\d{1,2})$/, '.$1')
  }
  text = text.replace(/,/g, '')

  if (!/^-?\d*\.?\d*$/.test(text) || text === '.' || text === '-') return null
  const value = Number(text)
  return Number.isFinite(value) ? Math.round(value * 100) : null
}

/** Cents → the plain string shown back in an editable field ("300", "12.5"). */
export function centsToInput(cents) {
  if (cents === null || cents === undefined) return ''
  return String(cents / 100)
}

/** Cents → "$1,200" / "-$45.50". */
export function formatMoney(cents) {
  if (cents === null || cents === undefined) return '—'
  return CAD.format(cents / 100)
}

/**
 * Cents → "+$1,200" / "−$45". The sign is always written out so a result's
 * direction never depends on colour alone (the green/red is extra, not the
 * signal).
 */
export function formatSigned(cents) {
  if (cents === null || cents === undefined) return '—'
  if (cents === 0) return CAD.format(0)
  const sign = cents > 0 ? '+' : '−'
  return sign + CAD.format(Math.abs(cents) / 100)
}

/** Sum a list of cent amounts, ignoring blanks. */
export function sumCents(list) {
  return (list || []).reduce((total, cents) => total + (Number.isFinite(cents) ? cents : 0), 0)
}
