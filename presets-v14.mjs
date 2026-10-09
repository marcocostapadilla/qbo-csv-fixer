/**
 * QBO CSV Fixer - v1.4 presets: Square transfers export and Shopify Payments payouts list.
 * Columns are sourced in VERIFY-presets-v13.md (v1.4 section). Uses the process.mjs hook
 * groupTxns(transactions, rows, headers) to merge or relabel rows after they are read.
 */
import { findCol } from './headers.mjs';
import { round2 } from './reconcile.mjs';

/** Square transfers: one line per Deposit ID (the amount that reached the bank), dated Deposit Date. */
function squareTransferGroups(txns, rows, headers) {
  const id = findCol(headers, ['deposit id']);
  if (id < 0) return txns;
  const out = [];
  const byId = new Map();
  for (const t of txns) {
    const key = String(rows[t.sourceRow - 1]?.[id] ?? '').trim();
    if (!key) {
      out.push(t);
      continue;
    }
    let g = byId.get(key);
    if (!g) {
      g = { date: t.date, key, amount: 0, n: 0, sourceRow: t.sourceRow };
      byId.set(key, g);
      out.push(g);
    }
    g.amount += t.amount;
    g.n++;
  }
  return out.map((g) =>
    g.key == null
      ? g
      : { date: g.date, description: `Square transfer ${g.key} (${g.n} item${g.n > 1 ? 's' : ''})`, amount: round2(g.amount) + 0, sourceRow: g.sourceRow }
  );
}

/** Shopify payouts list: every row is one payout; say so in the description. */
const shopifyPayoutLabel = (txns) =>
  txns.map((t) => Object.assign({}, t, { description: 'Shopify Payments payout' + (t.description && t.description !== '(no description)' ? ` (${t.description})` : '') }));

export const V14_PRESETS = {
  square_transfers: {
    id: 'square_transfers',
    label: 'Square (transfers export)',
    hint: 'Transfers export (Deposit Date, Payment Date, Type, Transaction ID, Payment ID, Collected, Fees, Deposited, Deposit ID, Location). Rows with the same Deposit ID are added up into one line per transfer, dated Deposit Date, as money out of a Square clearing account (negative). Refunds lower the transfer.',
    defaultDateOrder: 'mdy',
    slug: 'square',
    sample: 'samples/square-transfers.csv',
    columns: {
      date: ['deposit date'],
      description: ['type'],
      amount: ['deposited'],
      descExtras: [['type'], ['deposit id']],
    },
    invertAmount: true,
    groupTxns: squareTransferGroups,
    detect: [{ all: ['deposit date', 'deposited', 'deposit id'] }],
    signatures: [['deposit date', 'payment date', 'type', 'transaction id', 'payment id', 'collected', 'fees', 'deposited', 'deposit id', 'location']],
  },
  shopify_payouts: {
    id: 'shopify_payouts',
    label: 'Shopify Payments (payouts list)',
    hint: 'Payouts list export (Payout Date, Status, Charges, Refunds, Adjustments, Reserved Funds, Fees, Retried Amount, Total). One line per payout from Total, as money out of a Shopify Payments clearing account (negative). Scheduled, pending, failed and canceled payouts are left out and listed.',
    defaultDateOrder: 'mdy',
    slug: 'shopify',
    sample: 'samples/shopify-payouts-list.csv',
    columns: {
      date: ['payout date'],
      amount: ['total', 'total (net)', 'net'],
      status: ['status'],
      descExtras: [['status'], ['currency']],
    },
    skipStatus: ['scheduled', 'pending', 'failed', 'canceled', 'cancelled'],
    statusLabel: 'Status',
    invertAmount: true,
    groupTxns: shopifyPayoutLabel,
    detect: [{ all: ['payout date', 'charges', 'refunds', 'fees'] }],
    signatures: [['payout date', 'status', 'charges', 'refunds', 'adjustments', 'reserved funds', 'fees', 'retried amount', 'total', 'currency']],
  },
};
