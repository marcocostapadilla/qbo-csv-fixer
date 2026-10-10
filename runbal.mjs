/**
 * v1.5.9: running-balance check for any file with a signed amount (or Debit/Credit) and a
 * running-balance column, when the file has no Beginning/Ending balance rows.
 * Opening = oldest row's balance minus its amount; closing = newest row's balance.
 * Row order is read from the balance chain, both directions. The column is trusted only when
 * at least 2 of every 3 row-to-row links chain in one direction (more than in the other), with 3+ rows (v1.5.11); otherwise no balances
 * (badge N/A), never a guessed PASS. A missing first or last row cannot be caught this way.
 */
import { headerKey } from './headers.mjs';
import { parseAmount } from './money.mjs';

export const CHAIN_SHARE = 2 / 3; // share of row-to-row links that must chain
export const MIN_LINKS = 2; // at least two chaining links (so 3+ exported rows), and a clear direction

const BAL_KEY = /^(?:(?:running|current|ledger|account|book|cash|account running) ?)?balance(?: (?:usd|eur|gbp|cad|aud|amount))?$/

/** Index of a running-balance column not already mapped, or -1. */
export function findBalanceCol(headers, mappedCols = []) {
  const used = new Set(mappedCols.filter((i) => i >= 0));
  return headers.findIndex((h, i) => !used.has(i) && BAL_KEY.test(headerKey(h).replace(/^runningbalance$/, 'running balance')));
}

/**
 * pts: [{ amt, bal }] in file order (transactions kept for export, with a readable balance).
 * Returns { opening, closing, order: 'oldest-first' | 'newest-first', links, chained } or null.
 */
export function chainBalances(pts) {
  const links = pts.length - 1;
  if (links < MIN_LINKS) return null;
  const near = (x, y) => Math.abs(x - y) < 0.005;
  let down = 0; // newest first: previous row's balance minus its amount is this row's balance
  let up = 0; // oldest first: this row's balance minus its amount is the previous row's balance
  for (let i = 1; i < pts.length; i++) {
    if (near(pts[i - 1].bal - pts[i - 1].amt, pts[i].bal)) down++;
    if (near(pts[i].bal - pts[i].amt, pts[i - 1].bal)) up++;
  }
  if (down === up) return null; // no clear order
  const newestFirst = down > up;
  const chained = Math.max(down, up);
  if (chained < MIN_LINKS || chained < links * CHAIN_SHARE) return null;
  const oldest = newestFirst ? pts[pts.length - 1] : pts[0];
  const newest = newestFirst ? pts[0] : pts[pts.length - 1];
  return {
    opening: Math.round((oldest.bal - oldest.amt) * 100) / 100,
    closing: newest.bal,
    order: newestFirst ? 'newest-first' : 'oldest-first',
    links,
    chained,
  };
}

/** From exported transactions (sourceRow is 1-based into rows). */
export function runningBalanceFrom(transactions, rows, balCol, numOpts) {
  if (balCol < 0) return null;
  const pts = [];
  for (const t of transactions) {
    const bal = parseAmount((rows[t.sourceRow - 1] || [])[balCol], numOpts);
    if (bal != null && Number.isFinite(t.amount)) pts.push({ amt: t.amount, bal });
  }
  return chainBalances(pts);
}

/**
 * Explicit balance rows win; when only one is there (BofA without its summary block), the other
 * side comes from the column. Needs a signed amount or Debit/Credit. Returns the chain result with
 * opening/closing already merged, or null.
 */
export function runningBalanceFor(opening, closing, cols, transactions, rows, headers, numOpts) {
  if (opening != null && closing != null) return null;
  if (!(cols.amount >= 0 || cols.debit >= 0 || cols.credit >= 0)) return null;
  const rb = runningBalanceFrom(transactions, rows, findBalanceCol(headers, Object.values(cols)), numOpts);
  if (!rb) return null;
  return Object.assign(rb, { opening: opening ?? rb.opening, closing: closing ?? rb.closing });
}

/** Badge text when balances came from the column. */
export function noteRunningBalance(reconcile) {
  if (reconcile.status === 'PASS') reconcile.message = 'Opening balance plus these rows equals the newest balance in the running balance column. A missing first or last row would not show here.';
  if (reconcile.status === 'FAIL') reconcile.message += ' Opening and ending come from the running balance column.';
}
