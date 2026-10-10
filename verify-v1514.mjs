/**
 * Verify suite 24 (v1.5.14): first-time clarity fixes from the 10 Oct live walk.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv } from './core.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

// Same rule as ui.mjs renderResults: the balance-lines sentence shows only for balance rows in the file.
const showsBalLines = (r) => (r.opening != null || r.closing != null) && !r.runningBalance;

export function run() {
  console.log('');
  console.log('=== v1.5.14 first-time clarity fixes ===');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(html.includes('<span id="balLines">Opening and ending balance lines are not exported; they feed the balance check.</span>'), 'balance-lines sentence is its own element');
  assert(ui.includes("document.getElementById('balLines').hidden = !((r.opening != null || r.closing != null) && !r.runningBalance)"), 'ui.mjs hides it unless the file has balance rows');
  assert(showsBalLines(processCsv(readSample('chase-like-messy.csv'), 'generic_bank')), 'shown: file with Beginning/Ending balance rows');
  assert(!showsBalLines(processCsv(readSample('usaa.csv'), 'usaa')), 'hidden: no balances (badge N/A)');
  assert(!showsBalLines(processCsv(readSample('td-bank.csv'), 'td_bank')), 'hidden: balances from the running-balance column (no balance lines)');
  assert(ui.includes('` ("${m.descriptionFallback}" when empty)`'), 'Columns used: Description = "Description" ("Action" when empty), column names quoted on their own');
}
