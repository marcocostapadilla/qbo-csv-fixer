/**
 * QBO CSV Fixer - opening + net vs ending balance check, money helpers.
 */

export const RECONCILE_TOLERANCE = 0.01;

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Opening + net vs ending balance. leftOutCount > 0 (rows that could not be read) always gives
 * INCOMPLETE, never PASS: the totals are missing those rows.
 */
export function reconcileBalances(opening, closing, net, leftOutCount = 0) {
  if (leftOutCount > 0) {
    const hasBal = opening != null && closing != null;
    const expected = hasBal ? round2(opening + net) : null;
    return {
      status: 'INCOMPLETE',
      expectedClosing: expected,
      delta: hasBal ? round2(closing - expected) : null,
      message: `${leftOutCount} row(s) could not be read (listed below), so the balances cannot be checked. Fix those rows in the file, or add them in QuickBooks by hand.`,
    };
  }
  if (opening == null || closing == null) {
    return {
      status: 'N/A',
      expectedClosing: null,
      delta: null,
      message: 'This file has no opening or ending balance, so nothing to check against. Compare the net with your statement.',
    };
  }
  const expected = round2(opening + net);
  const delta = round2(closing - expected);
  const ok = Math.abs(delta) <= RECONCILE_TOLERANCE;
  return {
    status: ok ? 'PASS' : 'FAIL',
    expectedClosing: expected,
    delta,
    message: ok
      ? 'Opening balance plus these rows equals the ending balance.'
      : `Opening balance plus these rows is ${fmtMoney(expected)}, but the file's ending balance is ${fmtMoney(closing)} (off by ${fmtMoney(delta)}).`,
  };
}

export function fmtMoney(n) {
  if (n == null || !Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toFixed(2);
}
