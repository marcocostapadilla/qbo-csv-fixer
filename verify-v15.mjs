/**
 * Verify suite 12 (v1.5): Etsy pending rows left out, QuickBooks Online upload rules
 * (zero cells blank, 1,000 lines, 350 KB, money-out-only Debit/Credit note) and the Toast preset.
 * Intuit's rules and the Toast sources are quoted in VERIFY.md and VERIFY-presets-v15.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, buildExportRows, toCsvString } from './core.mjs';
import { qboLimitNotes, QBO_MAX_BYTES, QBO_MAX_ROWS } from './export.mjs';
import { assert, readSample, runPresetCase, ROOT } from './verify-lib.mjs';

const amt = (r, part) => (r.transactions.find((t) => t.description.includes(part)) || {}).amount;
const t = (amount, description = 'ROW', date = '03/16/2026') => ({ date, description, amount });

export function run() {
  console.log('');
  console.log('=== v1.5 Etsy: Status Pending left out and listed ===');
  const ep = processCsv(readSample('adversarial/etsy-pending.csv'), 'etsy');
  assert(ep.transactions.length === 3 && Math.abs(ep.net - 51.8) < 0.001, `Etsy: Available, blank and no-Status rows kept, net 40.00 - 0.20 + 12.00 = 51.80 (got ${ep.transactions.length}, ${ep.net})`);
  assert(ep.skippedRows.map((s) => `${s.sourceRow}:${s.reason}`).join(',') === '2:Status PENDING,3:Status PENDING', `Etsy: "Pending" and "pending" rows listed as left out (got ${ep.skippedRows.map((s) => s.reason)})`);
  assert(ep.leftOutRows.length === 0 && ep.reconcile.status !== 'INCOMPLETE', 'Etsy: pending rows are "did not settle", not unreadable');
  assert(processCsv(readSample('etsy.csv'), 'etsy').transactions.length === 8, 'Etsy: files without a Status column are unchanged (8 rows)');

  console.log('');
  console.log('=== v1.5 QuickBooks Online upload rules ===');
  const z3 = buildExportRows([t(0, 'ZERO'), t(-5)], 'date_desc_amount').body;
  assert(z3[0][2] === '' && z3[1][2] === '-5.00', `Amount layout: a zero amount is a blank cell, Intuit: "Leave any cells ... that only contain zero (0) blank" (got "${z3[0][2]}")`);
  const z4 = buildExportRows([t(0, 'ZERO'), t(7)], 'date_desc_debit_credit').body;
  assert(z4[0][2] === '' && z4[0][3] === '' && z4[1][3] === '7.00', `Debit/Credit layout: a zero amount leaves both cells blank (got "${z4[0][2]}", "${z4[0][3]}")`);
  const ok = buildExportRows([t(-5), t(7)], 'date_desc_debit_credit');
  assert(qboLimitNotes(ok.header, ok.body).length === 0, 'no upload note on a normal file');
  const out = buildExportRows([t(-5), t(-7)], 'date_desc_debit_credit');
  assert(qboLimitNotes(out.header, out.body).some((n) => n.includes('money out only')), 'Debit/Credit file with money out only: note to use the Amount layout');
  const out3 = buildExportRows([t(-5), t(-7)], 'date_desc_amount');
  assert(qboLimitNotes(out3.header, out3.body).length === 0, 'money out only in the Amount layout: no note');
  const many = buildExportRows(Array.from({ length: QBO_MAX_ROWS + 1 }, (_, i) => t(i + 1)), 'date_desc_amount');
  assert(qboLimitNotes(many.header, many.body).some((n) => n.includes('1000 lines')), 'over 1,000 lines: note shown');
  const exact = buildExportRows(Array.from({ length: QBO_MAX_ROWS }, (_, i) => t(i + 1)), 'date_desc_amount');
  assert(!qboLimitNotes(exact.header, exact.body).some((n) => n.includes('lines')), 'exactly 1,000 lines: no note');
  const big = buildExportRows([t(1, 'X'.repeat(QBO_MAX_BYTES))], 'date_desc_amount');
  assert(qboLimitNotes(big.header, big.body).some((n) => n.includes('350 KB')), 'over 350 KB: note shown');
  const chase = buildExportRows(processCsv(readSample('chase-like-messy.csv'), 'generic_bank').transactions, 'date_desc_amount');
  assert(new TextEncoder().encode(toCsvString(chase.header, chase.body)).length < QBO_MAX_BYTES && chase.header.length === 3, 'chase-like export: 3 columns, far under 350 KB');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(ui.includes('qboLimitNotes(header, body)'), 'ui.mjs shows the upload notes next to the left-out note');

  const ts = runPresetCase({ file: 'toast.csv', preset: 'toast', count: 5, net: 1276.48, outflow: 'Toast refund, order 5', outAmt: -45, inflowAmt: 1269, firstDate: '03/13/2026', skipped: 2 });
  console.log('');
  console.log('=== v1.5 Toast PaymentDetails ===');
  assert(amt(ts, 'Credit Visa, order 1') === 28.5 && ts.mapping.amount === 'Total' && ts.mapping.date === 'Paid Date', 'Toast: Total (amount + tip + gratuity) by Paid Date; description "Toast Credit Visa, order 1"');
  assert(amt(ts, 'Cash, order 2') === 12.8, 'Toast: cash payment kept (Total, not Amount Tendered 15.00)');
  assert(ts.transactions.find((x) => x.description === 'Toast refund, order 5').date === '03/15/2026', 'Toast: refund 40.00 + tip 5.00 is its own line on Refund Date');
  assert(ts.skippedRows.map((s) => s.reason).join(',') === 'Status DENIED,Status VOIDED', `Toast: DENIED and VOIDED left out and listed (got ${ts.skippedRows.map((s) => s.reason)})`);
  assert(ts.notes.length === 1 && ts.notes[0].includes('$39.32'), `Toast: card fees not subtracted, note with their total 0.83 + 38.07 + 0.42 (got ${ts.notes})`);
  const ta = processCsv(readSample('adversarial/toast-statuses.csv'), 'toast');
  assert(detectPreset(readSample('adversarial/toast-statuses.csv')) === 'toast' && ta.transactions.length === 2 && ta.net === 44.08, `Toast real-format rows (2/1/22 10:50 AM): 2 kept, net 44.08 (got ${ta.transactions.length}, ${ta.net})`);
  assert(ta.skippedRows.map((s) => s.reason).join(',') === 'Status ERROR,Status CANCELLED' && ta.leftOutRows.map((x) => x.reason).join() === 'missing amount', 'Toast: ERROR and CANCELLED listed; a row with no Total is left out, not merged');
  const others = ['square.csv', 'square-transfers.csv', 'shopify-payouts.csv', 'etsy.csv', 'venmo.csv', 'paypal.csv', 'stripe.csv', 'chase-checking.csv'].map((f) => detectPreset(readSample(f)));
  assert(!others.includes('toast'), `no other sample detects as Toast (got ${others})`);
}
