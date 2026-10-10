/**
 * QBO CSV Fixer - processor and marketplace presets (v1.3): Square, Shopify Payments, Etsy, Venmo.
 * Same preset fields as presets-banks.mjs plus two optional hooks used by process.mjs:
 *   fixRow(row, headers): repair one data row in place before it is read.
 *   balancesFrom(rows, headers, numOpts): { opening, closing } from balance columns.
 * Layouts and quirks are sourced in VERIFY-presets-v13.md.
 */
import { findCol } from './headers.mjs';
import { parseAmount } from './money.mjs';

/** Etsy deposit rows: "$1,208.35 sent to your bank account" in Title, "--" in Amount, Fees and Net. */
const ETSY_DEPOSIT = /^\s*([^\d\s-]{0,3}\d[\d,]*\.\d{2})\b.*\bsent to your bank account/i;

function etsyFixRow(row, headers) {
  const type = findCol(headers, ['type']);
  const title = findCol(headers, ['title']);
  const net = findCol(headers, ['net']);
  if (type < 0 || title < 0 || net < 0) return;
  // v1.4: "--" is Etsy's empty marker, so a row with no money is "missing amount", not "unreadable"
  for (const c of [findCol(headers, ['amount']), findCol(headers, ['fees & taxes']), net]) if (c >= 0 && String(row[c] ?? '').trim() === '--') row[c] = '';
  if (String(row[type] ?? '').trim().toLowerCase() !== 'deposit') return;
  const cell = String(row[net] ?? '').trim();
  const m = String(row[title] ?? '').match(ETSY_DEPOSIT);
  // Money leaving the Etsy balance for the bank: negative in the Etsy clearing account
  if (m && (cell === '' || cell === '--')) row[net] = '-' + m[1];
}

/** Venmo statement: first Beginning Balance cell and last Ending Balance cell below the header. */
function venmoBalances(rows, headers, numOpts) {
  const b = findCol(headers, ['beginning balance']);
  const e = findCol(headers, ['ending balance']);
  let opening = null;
  let closing = null;
  for (const row of rows) {
    const o = b >= 0 ? parseAmount(row[b], numOpts) : null;
    const c = e >= 0 ? parseAmount(row[e], numOpts) : null;
    if (opening == null && o != null) opening = o;
    if (c != null) closing = c;
  }
  return { opening, closing };
}

/**
 * v1.4: Venmo has a separate Amount (fee) column, and no public source says whether Amount (total)
 * already includes it. Amount (total) is used as is; when any fee is non-zero, say so on screen.
 */
function venmoFeeNote(rows, headers, numOpts) {
  const f = findCol(headers, ['amount (fee)']);
  if (f < 0) return [];
  const fees = rows.map((r) => parseAmount(r[f], numOpts)).filter((v) => v != null && v !== 0);
  if (!fees.length) return [];
  const total = Math.abs(fees.reduce((a, b) => a + b, 0)).toFixed(2);
  return [
    `Venmo lists fees in a separate column (Amount (fee): ${fees.length} row(s), $${total} in total). Amount (total) is exported as is, because Venmo does not say whether it already includes the fee. If the reconcile badge shows FAIL by about that amount, add the fees in QuickBooks.`,
  ];
}

export const V13_PRESETS = {
  square: {
    id: 'square',
    label: 'Square (transactions CSV)',
    hint: 'Transactions export (Date, Time, Time Zone, Gross Sales, ..., Total Collected, ..., Fees, Net Total, Transaction ID, ..., Description, Event Type, ...). Uses Net Total (after Square fees; fees are negative). Refunds are negative. Cash sales are included, so book them to a Square clearing account, not straight to the bank.',
    defaultDateOrder: 'mdy',
    slug: 'square',
    sample: 'samples/square.csv',
    columns: {
      date: ['date'],
      description: ['description', 'event type'],
      amount: ['net total'],
      descExtras: [['event type'], ['description']],
    },
    detect: [{ all: ['gross sales', 'total collected', 'net total'] }],
    signatures: [['date', 'time', 'time zone', 'gross sales', 'net sales', 'total collected', 'fees', 'net total', 'transaction id', 'payment id', 'event type']],
  },
  shopify: {
    id: 'shopify',
    label: 'Shopify Payments (payout transactions)',
    hint: 'Payout transactions export (Transaction Date, Type, Order, Card Brand, Card Source, Payout Status, Payout Date, Available On, Amount, Fee, Net, ...). Uses Net (Amount minus Fee, never subtracted twice). Refunds and adjustments keep their sign. Pending rows are kept: they are real charges not yet paid out. The payout to your bank is not a row here; record it as a transfer.',
    defaultDateOrder: 'mdy',
    slug: 'shopify',
    sample: 'samples/shopify-payouts.csv',
    columns: {
      date: ['transaction date'],
      description: ['order', 'type'],
      amount: ['net'],
      descExtras: [['type'], ['order']],
    },
    detect: [{ all: ['payout status', 'payout date', 'available on', 'net'] }],
    signatures: [['transaction date', 'type', 'order', 'card brand', 'card source', 'payout status', 'payout date', 'available on', 'amount', 'fee', 'net']],
  },
  etsy: {
    id: 'etsy',
    label: 'Etsy (monthly statement CSV)',
    hint: 'Payments monthly statement (Date, Type, Title, Info, Currency, Amount, Fees & Taxes, Net, ...). Uses Net: sales positive; fees, sales tax, ads and refunds negative. "--" means empty. Deposit rows carry the amount only in Title ("$X sent to your bank account"), so they are read from there as money out of the Etsy balance. Rows with Status Pending are left out and listed.',
    defaultDateOrder: 'mdy',
    slug: 'etsy',
    sample: 'samples/etsy.csv',
    columns: {
      date: ['date'],
      description: ['title'],
      amount: ['net'],
      status: ['status'],
      descExtras: [['type'], ['title'], ['info']],
    },
    // v1.5: funds not yet available are left out and listed (as Shopify scheduled payouts)
    skipStatus: ['pending'],
    statusLabel: 'Status',
    fixRow: etsyFixRow,
    detect: [{ all: ['title', 'info', 'fees & taxes', 'net'] }],
    signatures: [['date', 'type', 'title', 'info', 'currency', 'amount', 'fees & taxes', 'net', 'tax details']],
  },
  venmo: {
    id: 'venmo',
    label: 'Venmo (statement CSV)',
    hint: 'Account statement (title and "Account Activity" lines, then ,ID,Datetime,Type,Status,Note,From,To,Amount (total),...,Beginning Balance,Ending Balance,..., then a disclaimer). Amount (total) is signed ("+ $10.00" in, "- $5.00" out) and used as is; Amount (fee) is not subtracted, and a note shows when any fee is non-zero. Beginning and Ending Balance feed the reconcile badge.',
    defaultDateOrder: 'mdy',
    slug: 'venmo',
    sample: 'samples/venmo.csv',
    columns: {
      date: ['datetime'],
      description: ['note', 'type'],
      amount: ['amount (total)'],
      descExtras: [['type'], ['note'], ['from'], ['to']],
    },
    balancesFrom: venmoBalances,
    fileNotes: venmoFeeNote,
    detect: [{ all: ['datetime', 'amount (total)'] }],
    signatures: [['id', 'datetime', 'type', 'status', 'note', 'from', 'to', 'amount (total)', 'amount (fee)', 'funding source', 'destination', 'beginning balance', 'ending balance']],
  },
};
