#!/usr/bin/env node
/**
 * Node verification: fixture must yield 10 txns, net 2515.45,
 * opening 1250.47, closing 3767.92, reconcile FAIL delta ~2.00
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processCsv, round2 } from './core.mjs';

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
function assert(cond, msg) {
  if (cond) {
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

console.log('');
if (failed === 0) {
  console.log('ALL ASSERTIONS PASSED. Reconcile badge MUST show FAIL with Δ $2.00 on this fixture.');
  process.exit(0);
} else {
  console.log(`FAILED: ${failed} assertion(s).`);
  process.exit(1);
}
