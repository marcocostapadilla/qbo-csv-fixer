/**
 * Verify suite 13 (v1.5.1): real public sample files (MIT, samples/real/LICENSES.md),
 * plain-language messages, index pitch line and the samples.html page.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, reconcileBalances } from './core.mjs';
import { rejectReason } from './parse.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

const REAL = [
  // file, preset, rows, net, first date, a known row [description part, amount]
  ['beanhub-chase-card.csv', 'chase', 5, 107.12, '04/09/2024', ['AUTOMATIC PAYMENT', 123.45]],
  ['beanhub-citi.csv', 'citi', 8, 3505.72, '11/23/2025', ['ONLINE PAYMENT', 3748.66]],
  ['beanhub-mercury.csv', 'mercury', 4, -1954.62, '04/17/2024', ['GUSTO', -46]],
  ['schola-square.csv', 'square', 8, 445, '07/03/2025', ['Watercolor', 60]],
];

export function run() {
  console.log('');
  console.log('=== v1.5.1 real public samples (samples/real/) ===');
  for (const [file, preset, rows, net, first, [part, amt]] of REAL) {
    const t = readSample('real/' + file);
    const r = processCsv(t, detectPreset(t));
    const row = r.transactions.find((x) => x.description.includes(part));
    assert(
      detectPreset(t) === preset && r.transactions.length === rows && Math.abs(r.net - net) < 0.001 && r.transactions[0].date === first && row && row.amount === amt && !r.leftOutRows.length && !r.skippedRows.length,
      `${file}: ${preset}, ${rows} rows, net ${net}, first ${first}, "${part}" ${amt} (got ${detectPreset(t)}, ${r.transactions.length}, ${r.net}, ${r.transactions[0] && r.transactions[0].date}, ${row && row.amount})`
    );
  }

  console.log('');
  console.log('=== v1.5.1 messages say what happened and what to do ===');
  assert(/so there is nothing to convert/.test(rejectReason('')) && /choose CSV instead of PDF/.test(rejectReason('%PDF-1.4')), 'empty and PDF rejects say what to do next');
  const fail = reconcileBalances(100, 150, 40);
  assert(fail.status === 'FAIL' && fail.message.includes('$140.00') && fail.message.includes('$150.00') && fail.message.includes('off by $10.00'), `FAIL message names expected, ending and gap (got ${fail.message})`);
  assert(/nothing to check against/.test(reconcileBalances(null, null, 5).message) && /cannot be checked/.test(reconcileBalances(1, 2, 1, 2).message), 'N/A and INCOMPLETE messages explain why');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(ui.includes('Rows are missing or extra. Check for left-out rows, a date range that differs from the statement, or pending items'), 'FAIL badge detail says what to check');
  assert(!/Net \(txns\)|did not settle|expected close/.test(ui), 'no old jargon in ui.mjs (Net (txns), did not settle, expected close)');

  console.log('');
  console.log('=== v1.5.1 index pitch line and samples.html ===');
  const idx = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert(idx.includes('The point of this tool is the visible reconcile badge plus an offline, one-click UI.'), 'index.html: pitch line restored exactly');
  assert(idx.includes('href="samples.html"') && !idx.includes('download>'), 'index.html links samples.html; the download list moved out');
  const sp = readFileSync(join(ROOT, 'samples.html'), 'utf8');
  const links = [...sp.matchAll(/href="(samples\/[^"]+)"/g)].map((m) => m[1]);
  assert(links.length === 31 && links.every((l) => existsSync(join(ROOT, l))), `samples.html: 31 sample links, every file exists (got ${links.length})`);
  assert(sp.includes('data-goatcounter="https://qbofixer.goatcounter.com/count"') && readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').includes('/samples.html</loc>'), 'samples.html has GoatCounter and is in the sitemap');
}
