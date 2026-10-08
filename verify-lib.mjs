/**
 * QBO CSV Fixer - tiny assertion harness shared by the verify-*.mjs suites.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processCsv, round2, detectPreset, buildExportRows } from './core.mjs';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const stats = { passed: 0, failed: 0 };
export const MMDDYYYY = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

export function assert(cond, msg) {
  if (cond) {
    stats.passed++;
    console.log('  PASS:', msg);
  } else {
    stats.failed++;
    console.log('  FAIL:', msg);
  }
}

/** Read a fixture under samples/ (name may include a subfolder, e.g. 'drift/x.csv'). */
export function readSample(name) {
  return readFileSync(join(ROOT, 'samples', name), 'utf8');
}

export function printTxns(r) {
  r.transactions.forEach((x, i) =>
    console.log(`  ${i + 1}. ${x.date} | ${x.description.slice(0, 40).padEnd(40)} | ${x.amount.toFixed(2)}`)
  );
}

/**
 * One named-preset fixture: auto-detect, row count, net, money out negative, money in positive,
 * MM/DD/YYYY dates, first date, optional skipped rows / reconcile, Debit/Credit export balance.
 * c.detectAs: expected auto-detect result when the preset is deliberately not auto-detected.
 */
export function runPresetCase(c) {
  console.log('');
  console.log(`=== Preset ${c.preset} (samples/${c.file}) ===`);
  const t = readSample(c.file);
  const r = processCsv(t, c.preset);
  printTxns(r);
  const want = c.detectAs || c.preset;
  assert(detectPreset(t) === want, `auto-detect === ${want} (got ${detectPreset(t)})`);
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
  return r;
}
