/**
 * QBO CSV Fixer - opening + net vs ending balance check, money helpers.
 */

export const RECONCILE_TOLERANCE = 0.01;

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function reconcileBalances(opening, closing, net) {
  if (opening == null || closing == null) {
    return {
      status: 'N/A',
      expectedClosing: null,
      delta: null,
      message: 'No beginning/ending balances found in file',
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
      ? 'Opening + transactions match ending balance'
      : `Opening + transactions = ${fmtMoney(expected)}, ending = ${fmtMoney(closing)}, delta = ${fmtMoney(delta)}`,
  };
}

export function fmtMoney(n) {
  if (n == null || !Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toFixed(2);
}
