/**
 * v1.5.7: SoFi checking/savings export. Sources in VERIFY-presets-v157.md.
 */
import { findCol } from './headers.mjs';
import { parseAmount } from './money.mjs';

/**
 * Opening and closing from the Current balance column. SoFi lists newest first, but the
 * order is read from the file: the direction where balance chains row to row wins.
 * Newest first: closing = first balance, opening = last balance minus its amount.
 */
export function runningBalances(rows, headers, numOpts) {
  const a = findCol(headers, ['amount']);
  const b = findCol(headers, ['current balance']);
  if (a < 0 || b < 0) return { opening: null, closing: null };
  const r = rows.map((row) => ({ amt: parseAmount(row[a], numOpts), bal: parseAmount(row[b], numOpts) }))
    .filter((x) => x.amt != null && x.bal != null);
  if (!r.length) return { opening: null, closing: null };
  const near = (x, y) => Math.abs(x - y) < 0.005;
  let down = 0;
  let up = 0;
  for (let i = 1; i < r.length; i++) {
    if (near(r[i - 1].bal - r[i - 1].amt, r[i].bal)) down++; // newest first
    if (near(r[i].bal - r[i].amt, r[i - 1].bal)) up++; // oldest first
  }
  const newestFirst = down >= up;
  const oldest = newestFirst ? r[r.length - 1] : r[0];
  const newest = newestFirst ? r[0] : r[r.length - 1];
  return { opening: Math.round((oldest.bal - oldest.amt) * 100) / 100, closing: newest.bal };
}

export const V157_PRESETS = {
  sofi: {
    id: 'sofi',
    label: 'SoFi (checking or savings)',
    hint: 'SoFi export (Date, Description, Type, Amount, Current balance, Status). Amount is already signed. Opening and ending balances come from the Current balance column, so the reconcile badge can show PASS or FAIL. Pending rows are left out and listed.',
    defaultDateOrder: 'mdy',
    slug: 'sofi',
    sample: 'samples/sofi.csv',
    columns: {
      date: ['date'],
      description: ['description'],
      amount: ['amount'],
      status: ['status'],
    },
    skipStatus: ['pending'],
    detect: [{ all: ['date', 'description', 'type', 'amount', 'current balance', 'status'] }],
    signatures: [['date', 'description', 'type', 'amount', 'current balance', 'status']],
  },
};
