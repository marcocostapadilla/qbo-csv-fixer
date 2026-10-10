/**
 * Verify suite 25 (v1.5.15): Fidelity preset, clearer left-out notes, grouped bank list.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { clip } from './headers.mjs';
import { skippedText } from './skipnote.mjs';
import { groupPresets } from './groups.mjs';
import { PRESETS } from './presets.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

const list = (rows, fmt) => rows.map(fmt).join('; ');
const R = '/workspace/qbo-real-samples/v1512/';

export function run() {
  console.log('');
  console.log('=== v1.5.15 Fidelity, left-out notes, grouped list ===');
  const fid = readSample('fidelity.csv');
  const f = processCsv(fid, detectPreset(fid));
  assert(detectPreset(fid) === 'fidelity', 'Fidelity sample detects as fidelity');
  assert(f.transactions.length === 6 && f.net === 1494.36 && f.reconcile.status === 'PASS' && f.leftOutRows.length === 0, `Fidelity: 6 rows, net 1494.36, PASS from Cash Balance ($), nothing left out (got ${f.transactions.length} ${f.net} ${f.reconcile.status})`);
  assert(f.transactions[0].description === 'DIRECT DEPOSIT ACME PAYROLL (Cash)' && f.transactions[2].description === 'CONTOSO INDEX FUND', 'Fidelity: Action text for "No Description", real Description kept');
  assert(f.notes.some((n) => n.startsWith('3 text line(s) with no date or amount were ignored')), 'Fidelity: disclaimer lines ignored and named');
  for (const [file, n, net] of [['ericyan-fidelity.csv', 5, 2361.85], ['redstreet-fidelity-cma.csv', 11, -7671.75]]) {
    if (!existsSync(R + file)) continue;
    const t = decodeBytes(new Uint8Array(readFileSync(R + file))).text;
    const x = processCsv(t, detectPreset(t));
    assert(detectPreset(t) === 'fidelity' && x.transactions.length === n && x.net === net, `real ${file} (local only): fidelity, ${n} rows, net ${net}`);
  }
  const plain = 'Run Date,Account,Account Number,Action,Symbol,Description,Type,Price,Quantity,Commission,Fees,Accrued Interest,Amount,Settlement Date\n01/02/2026,"Individual","X1","JOURNALED (Cash)",,"No Description",Cash,,0,,,,10.01,\n';
  assert(detectPreset(plain) === 'fidelity', 'Fidelity variant with Account columns and no ($) detects');

  assert(clip('The data in this spreadsheet is provided for informational purposes only.') === 'The data in this spreadsheet is provided for informational\u2026', 'footer example ends on a whole word plus an ellipsis');
  assert(clip('short line') === 'short line', 'short footer line kept whole, no ellipsis');

  const rows = (...r) => r.map((reason, i) => ({ sourceRow: i + 2, reason }));
  const usaa = skippedText(rows('Status SCHEDULED BILL PAY', 'Status PENDING'), list);
  assert(usaa === 'Left out 2 row(s) on purpose. Not posted yet (pending or scheduled): row 2 (Status SCHEDULED BILL PAY); row 3 (Status PENDING). They show up in a later export once they post.', `USAA: scheduled rows are "not posted yet", never called pending (got ${usaa})`);
  const toast = skippedText(rows('Status DENIED', 'Status VOIDED'), list);
  assert(toast.includes('Did not move money (failed, cancelled, declined, voided or memo lines): row 2 (Status DENIED); row 3 (Status VOIDED). That is expected.') && !toast.includes('Not posted yet'), 'Toast denied/voided: did not move money');
  const mixed = skippedText(rows('State PENDING', 'State REVERTED', 'Balance Impact Memo'), list);
  assert(mixed.includes('Not posted yet (pending or scheduled): row 2 (State PENDING).') && mixed.includes('row 3 (State REVERTED); row 4 (Balance Impact Memo)'), 'mixed reasons split into the two lists');
  for (const [file, id, want] of [['shopify-payouts.csv', 'shopify_payouts', 'Not posted yet'], ['shopify-payouts-list.csv', 'shopify_payouts', 'Did not move money'], ['toast.csv', 'toast', 'Did not move money'], ['cash-app.csv', 'cash_app', 'Did not move money']]) {
    if (!existsSync(join(ROOT, 'samples', file))) continue;
    const r = processCsv(readSample(file), id);
    assert(r.skippedRows.length && skippedText(r.skippedRows, list).includes(want), `${file}: left-out note says "${want}"`);
  }

  const groups = groupPresets(PRESETS);
  const ids = groups.flatMap(([, l]) => l.map((p) => p.id));
  assert(ids.length === Object.keys(PRESETS).length && new Set(ids).size === ids.length && !groups.some(([g]) => g === 'Other'), `bank list: every preset in exactly one group, no "Other" (${groups.map(([g, l]) => `${g} ${l.length}`).join(', ')})`);
  assert(groups[0][1][0].id === 'generic_bank', 'generic layout stays the first option');
  assert(readFileSync(join(ROOT, 'app.js'), 'utf8').includes("fillSelect(els.processorPreset, PRESETS, fromUrl || 'generic_bank', true);"), 'bank select is filled with optgroups (native select)');
}
