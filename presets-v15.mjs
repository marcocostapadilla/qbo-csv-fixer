/**
 * QBO CSV Fixer - v1.5 preset: Toast PaymentDetails.csv (payments data export).
 * Columns from Toast's data export field reference; values checked against real public exports.
 * Sources in VERIFY-presets-v15.md.
 */
import { findCol } from './headers.mjs';
import { parseAmount } from './money.mjs';
import { normalizeDate } from './dates.mjs';
import { round2 } from './reconcile.mjs';

const TOAST_SKIP = ['denied', 'voided', 'error', 'cancelled', 'canceled'];

/** One line per payment ("Toast Credit Visa, order 12"), plus a negative line for each refund. */
function toastLines(txns, rows, headers) {
  const col = (a) => findCol(headers, [a]);
  const [type, card, order, ra, rta, rdate, paid] = ['type', 'card type', 'order #', 'refund amount', 'refund tip amount', 'refund date', 'paid date'].map(col);
  const cell = (row, i) => (i >= 0 ? String(row[i] ?? '').trim() : '');
  const out = [];
  for (const t of txns) {
    const row = rows[t.sourceRow - 1] || [];
    const what = [cell(row, type), cell(row, card)].filter(Boolean).join(' ') || 'payment';
    const ord = cell(row, order) ? `, order ${cell(row, order)}` : '';
    out.push(Object.assign({}, t, { description: `Toast ${what}${ord}` }));
    const refund = (parseAmount(cell(row, ra)) || 0) + (parseAmount(cell(row, rta)) || 0);
    if (refund) {
      const when = cell(row, rdate) || cell(row, paid);
      out.push({ date: normalizeDate(when, 'mdy') || t.date, description: `Toast refund${ord}`, amount: round2(-Math.abs(refund)) + 0, sourceRow: t.sourceRow });
    }
  }
  return out;
}

/** Card fees sit in their own column; how Toast takes them (daily or monthly) is not in the file. */
function toastFeeNote(rows, headers, numOpts) {
  const f = findCol(headers, ['v/mc/d fees']);
  const s = findCol(headers, ['status']);
  if (f < 0) return [];
  const fees = rows
    .filter((r) => s < 0 || !TOAST_SKIP.includes(String(r[s] ?? '').trim().toLowerCase()))
    .map((r) => parseAmount(r[f], numOpts))
    .filter((v) => v != null && v !== 0);
  if (!fees.length) return [];
  const total = Math.abs(fees.reduce((a, b) => a + b, 0)).toFixed(2);
  return [
    `Card fees (V/MC/D Fees) in this file are not subtracted: ${fees.length} row(s), $${total} in total. Toast may take them from each deposit or once a month, so add them in QuickBooks as they appear on your bank statement.`,
  ];
}

export const V15_PRESETS = {
  toast: {
    id: 'toast',
    label: 'Toast (PaymentDetails CSV)',
    hint: 'Payments data export (Location, Payment Id, Order Id, Order #, Paid Date, ..., Amount, Tip, Gratuity, Total, ..., Refund Date, Refund Amount, Refund Tip Amount, ..., Status, Type, ..., Card Type, ..., V/MC/D Fees). One line per payment from Total (amount plus tip and gratuity), money in to a Toast clearing account; refunds become a separate negative line. Denied, voided, error and cancelled payments are left out and listed. Card fees are not subtracted; a note shows their total.',
    defaultDateOrder: 'mdy',
    slug: 'toast',
    sample: 'samples/toast.csv',
    columns: {
      date: ['paid date'],
      amount: ['total'],
      status: ['status'],
      descExtras: [['type'], ['card type']],
    },
    skipStatus: TOAST_SKIP,
    statusLabel: 'Status',
    groupTxns: toastLines,
    fileNotes: toastFeeNote,
    detect: [{ all: ['paid date', 'v/mc/d fees'] }, { all: ['payment id', 'paid date', 'amount tendered'] }],
    signatures: [['payment id', 'order id', 'order #', 'paid date', 'order date', 'check id', 'amount', 'tip', 'gratuity', 'total', 'amount tendered', 'refunded', 'refund amount', 'status', 'type', 'card type', 'v/mc/d fees']],
  },
};
