#!/usr/bin/env node
/**
 * Node verification.
 * 1. chase-like fixture must yield 10 txns, net 2515.45,
 *    opening 1250.47, closing 3767.92, reconcile FAIL delta ~2.00 (v1, unchanged).
 * 2. Date ambiguity (US M/D vs EU D/M) detection and toggle.
 * 3. Named bank presets: row count, net, sign convention, normalized dates, auto-detect.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processCsv, round2, detectPreset, buildExportRows, toCsvString, PRESETS } from './core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, 'samples', 'chase-like-messy.csv');
const text = readFileSync(fixturePath, 'utf8');

const result = processCsv(text, 'generic_bank');
const { transactions, opening, closing, net, reconcile } = result;

const expectedNet = 2515.45;
const expectedOpening = 1250.47;
const expectedClosing = 3767.92;
const expectedDelta = 2.0;
const expectedCount = 10;

const expectedAmounts = [
  -14.99, 12.5, -89.0, 2450.0, -18.4, 320.0, -67.23, 22.15, -100.0, 0.42,
];

let failed = 0;
let passed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failed++;
  }
}

console.log('=== QBO CSV Fixer verify (chase-like-messy.csv) ===');
console.log('Fixture:', fixturePath);
console.log('');
console.log('Transactions (' + transactions.length + '):');
transactions.forEach((t, i) => {
  console.log(
    `  ${i + 1}. ${t.date} | ${t.description.slice(0, 40).padEnd(40)} | ${t.amount.toFixed(2)}`
  );
});
console.log('');
console.log('Opening:', opening);
console.log('Net:    ', net);
console.log('Expected closing (open+net):', round2(opening + net));
console.log('File closing:', closing);
console.log('Reconcile:', reconcile.status, '|', reconcile.message);
console.log('');

assert(transactions.length === expectedCount, `txn count === ${expectedCount} (got ${transactions.length})`);
assert(Math.abs(net - expectedNet) < 0.001, `net ≈ ${expectedNet} (got ${net})`);
assert(opening === expectedOpening, `opening === ${expectedOpening} (got ${opening})`);
assert(closing === expectedClosing, `closing === ${expectedClosing} (got ${closing})`);
assert(reconcile.status === 'FAIL', `reconcile status === FAIL (got ${reconcile.status})`);
assert(
  Math.abs(reconcile.delta - expectedDelta) < 0.001,
  `delta ≈ ${expectedDelta} (got ${reconcile.delta})`
);

for (let i = 0; i < expectedAmounts.length; i++) {
  const got = transactions[i]?.amount;
  assert(
    got != null && Math.abs(got - expectedAmounts[i]) < 0.001,
    `txn[${i}] amount === ${expectedAmounts[i]} (got ${got})`
  );
}

// ---------------------------------------------------------------
// 2. Date ambiguity
// ---------------------------------------------------------------
const readSample = (name) => readFileSync(join(__dirname, 'samples', name), 'utf8');
const MMDDYYYY = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

console.log('');
console.log('=== Date ambiguity (samples/ambiguous-dates.csv) ===');
{
  const text = readSample('ambiguous-dates.csv');
  const us = processCsv(text, 'generic_bank', { dateOrder: 'mdy' });
  const eu = processCsv(text, 'generic_bank', { dateOrder: 'dmy' });
  const dflt = processCsv(text, 'generic_bank');
  assert(us.dateInfo.ambiguous === true, `ambiguous flag === true (got ${us.dateInfo.ambiguous})`);
  assert(dflt.dateInfo.used === 'mdy', `default order for generic bank === mdy (got ${dflt.dateInfo.used})`);
  assert(us.transactions.length === 3, `3 txns (got ${us.transactions.length})`);
  const usExport = buildExportRows(us.transactions, 'date_desc_amount');
  const euExport = buildExportRows(eu.transactions, 'date_desc_amount');
  assert(usExport.body[0][0] === '03/04/2026', `US mode: 03/04/2026 -> 03/04/2026 (March 4) (got ${usExport.body[0][0]})`);
  assert(euExport.body[0][0] === '04/03/2026', `EU mode: 03/04/2026 -> 04/03/2026 (April 3) (got ${euExport.body[0][0]})`);
  assert(euExport.body[2][0] === '12/11/2026', `EU mode: 11/12/2026 -> 12/11/2026 (got ${euExport.body[2][0]})`);
  const usCsv = toCsvString(usExport.header, usExport.body);
  const euCsv = toCsvString(euExport.header, euExport.body);
  assert(usCsv !== euCsv && euCsv.includes('04/03/2026,NORTHWIND COFFEE,-4.50'), 'toggle changes the export CSV');
}
{
  // Chase-like: 9 slash dates all with both parts <= 12, plus one ISO date. Honest answer: ambiguous.
  const r = processCsv(text, 'generic_bank');
  assert(r.dateInfo.ambiguous === true, `chase-like fixture is ambiguous (all slash dates have parts <= 12) (got ${r.dateInfo.ambiguous})`);
  assert(r.dateInfo.used === 'mdy', `chase-like default stays US M/D (got ${r.dateInfo.used})`);
  assert(r.transactions[2].date === '01/04/2026', `chase-like txn[2] date === 01/04/2026 in default US mode (got ${r.transactions[2].date})`);
}
{
  // A disambiguating row (day > 12) auto-picks and ignores the toggle; ISO never ambiguous.
  const dmyText = 'Date,Description,Amount\n03/04/2026,A,-1.00\n25/04/2026,B,-2.00\n';
  const r = processCsv(dmyText, 'generic_bank', { dateOrder: 'mdy' });
  assert(r.dateInfo.ambiguous === false && r.dateInfo.used === 'dmy', `25/04/2026 row auto-picks EU D/M, no warning (got ambiguous=${r.dateInfo.ambiguous}, used=${r.dateInfo.used})`);
  assert(r.transactions[0].date === '04/03/2026', `auto D/M: 03/04/2026 -> 04/03/2026 (got ${r.transactions[0].date})`);
  const mdyText = 'Date,Description,Amount\n03/04/2026,A,-1.00\n04/25/2026,B,-2.00\n';
  const r2 = processCsv(mdyText, 'generic_bank', { dateOrder: 'dmy' });
  assert(r2.dateInfo.ambiguous === false && r2.dateInfo.used === 'mdy', `04/25/2026 row auto-picks US M/D (got ambiguous=${r2.dateInfo.ambiguous}, used=${r2.dateInfo.used})`);
  const isoText = 'Date,Description,Amount\n2026-03-04,A,-1.00\n2026-05-06,B,-2.00\n';
  const r3 = processCsv(isoText, 'generic_bank');
  assert(r3.dateInfo.ambiguous === false && r3.transactions[0].date === '03/04/2026', `ISO dates never ambiguous (got ambiguous=${r3.dateInfo.ambiguous}, ${r3.transactions[0].date})`);
}

// ---------------------------------------------------------------
// 3. Named bank presets
// ---------------------------------------------------------------
const presetCases = [
  { file: 'chase-checking.csv', preset: 'chase', count: 6, net: 1760.0, outflow: 'CHECK 1043', outAmt: -250.0, inflowAmt: 2150.0, firstDate: '01/16/2026' },
  { file: 'bank-of-america.csv', preset: 'bofa', count: 7, net: 1488.53, outflow: 'MAPLE STREET', outAmt: -86.14, inflowAmt: 2500.0, firstDate: '02/02/2026', reconcile: 'PASS', opening: 3410.22, closing: 4898.75 },
  { file: 'wells-fargo.csv', preset: 'wells_fargo', count: 6, net: 930.8, outflow: 'MAPLE STREET', outAmt: -54.21, inflowAmt: 1850.0, firstDate: '01/02/2026' },
  { file: 'amex.csv', preset: 'amex', count: 6, net: -68.3, outflow: 'FABRIKAM AIRLINES', outAmt: -412.8, inflowAmt: 500.0, firstDate: '01/03/2026' },
  { file: 'capital-one.csv', preset: 'capital_one', count: 6, net: 452.26, outflow: 'MAPLE STREET', outAmt: -94.17, inflowAmt: 650.0, firstDate: '03/02/2026' },
  { file: 'revolut.csv', preset: 'revolut', count: 6, net: 313.34, outflow: 'Contoso Travel', outAmt: -61.86, inflowAmt: 500.0, firstDate: '01/02/2026', skipped: 2 },
  { file: 'paypal.csv', preset: 'paypal', count: 5, net: 10.79, outflow: 'Fabrikam Hosting', outAmt: -29.0, inflowAmt: 115.33, firstDate: '01/04/2026', skipped: 1 },
  { file: 'stripe.csv', preset: 'stripe', count: 6, net: 43.39, outflow: 'STRIPE PAYOUT', outAmt: -237.83, inflowAmt: 242.45, firstDate: '02/02/2026' },
  { file: 'wise.csv', preset: 'wise', count: 5, net: 821.11, outflow: 'Sent money to Jane Doe', outAmt: -450.0, inflowAmt: 1500.0, firstDate: '02/27/2026' },
];

for (const c of presetCases) {
  console.log('');
  console.log(`=== Preset ${c.preset} (samples/${c.file}) ===`);
  const t = readSample(c.file);
  const r = processCsv(t, c.preset);
  r.transactions.forEach((x, i) =>
    console.log(`  ${i + 1}. ${x.date} | ${x.description.slice(0, 40).padEnd(40)} | ${x.amount.toFixed(2)}`)
  );
  assert(detectPreset(t) === c.preset, `auto-detect === ${c.preset} (got ${detectPreset(t)})`);
  assert(r.transactions.length === c.count, `row count === ${c.count} (got ${r.transactions.length})`);
  assert(Math.abs(r.net - c.net) < 0.001, `net === ${c.net.toFixed(2)} (got ${r.net})`);
  const out = r.transactions.find((x) => x.description.includes(c.outflow));
  assert(out && Math.abs(out.amount - c.outAmt) < 0.001 && out.amount < 0, `money out negative: "${c.outflow}" === ${c.outAmt} (got ${out && out.amount})`);
  const inn = r.transactions.find((x) => Math.abs(x.amount - c.inflowAmt) < 0.001);
  assert(inn && inn.amount > 0, `money in positive: ${c.inflowAmt} present`);
  assert(r.transactions.every((x) => MMDDYYYY.test(x.date)), 'all dates normalized to MM/DD/YYYY');
  assert(r.transactions[0].date === c.firstDate, `first date === ${c.firstDate} (got ${r.transactions[0].date})`);
  assert(r.dateInfo.ambiguous === false, `dates not ambiguous (got ${r.dateInfo.ambiguous})`);
  if (c.skipped != null) assert(r.skippedRows.length === c.skipped, `skipped non-final rows === ${c.skipped} (got ${r.skippedRows.length})`);
  if (c.reconcile) {
    assert(r.opening === c.opening && r.closing === c.closing, `summary block opening ${c.opening} / ending ${c.closing} (got ${r.opening} / ${r.closing})`);
    assert(r.reconcile.status === c.reconcile, `reconcile === ${c.reconcile} (got ${r.reconcile.status})`);
  }
  const { header, body } = buildExportRows(r.transactions, 'date_desc_debit_credit');
  const debitSum = round2(body.reduce((s, row) => s + (row[2] ? Number(row[2]) : 0), 0));
  const creditSum = round2(body.reduce((s, row) => s + (row[3] ? Number(row[3]) : 0), 0));
  assert(header.join(',') === 'Date,Description,Debit,Credit' && Math.abs(round2(creditSum - debitSum) - c.net) < 0.001, `Debit/Credit export balances to net (credits ${creditSum} - debits ${debitSum})`);
}

console.log('');
console.log('=== Preset metadata ===');
for (const id of ['chase', 'bofa', 'wells_fargo', 'amex', 'capital_one', 'revolut', 'paypal', 'stripe', 'wise']) {
  assert(PRESETS[id] && PRESETS[id].slug && PRESETS[id].sample, `preset ${id} has a how-to slug and sample`);
}
assert(detectPreset(text) === 'generic_bank', `chase-like fixture auto-detects as generic_bank (got ${detectPreset(text)})`);

console.log('');
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed === 0) {
  console.log('ALL ASSERTIONS PASSED. Reconcile badge MUST show FAIL with Δ $2.00 on the chase-like fixture.');
  process.exit(0);
} else {
  console.log(`FAILED: ${failed} assertion(s).`);
  process.exit(1);
}
