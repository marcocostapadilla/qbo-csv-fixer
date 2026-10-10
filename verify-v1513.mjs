/**
 * Verify suite 23 (v1.5.13): Action column as description fallback (Fidelity "No Description").
 */
import { existsSync, readFileSync } from 'node:fs';
import { processCsv, detectPreset } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { signCheck } from './signcheck.mjs';
import { PLACEHOLDER_DESC } from './mapping.mjs';
import { assert } from './verify-lib.mjs';

const FID = 'Run Date,Action,Symbol,Description,Type,Quantity,Amount ($),Cash Balance ($)\n'
  + '04/01/2025,DIRECT DEPOSIT ACME PAYROLL (Cash),,No Description,Cash,,2500.00,7500.00\n'
  + '04/03/2025,YOU BOUGHT FICTCORP COM (FCT) (Cash),FCT,FICTCORP COM,Cash,10,-500.00,7000.00\n'
  + '04/05/2025,DIVIDEND RECEIVED FICTCORP (Cash),FCT,,Cash,,12.50,7012.50\n'
  + '04/10/2025,ELECTRONIC FUNDS TRANSFER PAID (Cash),,no description,Cash,,-200.00,6812.50\n';
const R = '/workspace/qbo-real-samples/v1512/';
const real = (f) => (existsSync(R + f) ? decodeBytes(new Uint8Array(readFileSync(R + f))).text : null);

export function run() {
  console.log('');
  console.log('=== v1.5.13 Action column as description fallback ===');
  const r = processCsv(FID, detectPreset(FID) || 'generic_bank');
  const d = r.transactions.map((t) => t.description);
  assert(d.join('|') === 'DIRECT DEPOSIT ACME PAYROLL (Cash)|FICTCORP COM|DIVIDEND RECEIVED FICTCORP (Cash)|ELECTRONIC FUNDS TRANSFER PAID (Cash)', `Fidelity-like: No Description and empty cells take Action; real Description kept (got ${d.join('|')})`);
  assert(r.transactions.map((t) => t.amount).join() === '2500,-500,12.5,-200' && r.reconcile.status === 'PASS', 'amounts and PASS badge unchanged by the fallback');
  assert(r.mapping.description === 'Description' && r.mapping.descriptionFallback === 'Action', `Columns used note names the fallback (got ${r.mapping.description} / ${r.mapping.descriptionFallback})`);
  const noAction = processCsv(FID.replace('Run Date,Action,', 'Run Date,Note,'), 'generic_bank');
  assert(noAction.transactions[0].description === 'No Description' && noAction.transactions[2].description === '(no description)', 'without an Action column nothing changes');
  const realDesc = processCsv('Date,Action,Description,Amount\n03/01/2026,Transfer,Rent March,-900.00\n03/02/2026,Card,Coffee shop,-4.50\n', 'generic_bank');
  assert(realDesc.transactions.map((t) => t.description).join('|') === 'Rent March|Coffee shop', 'real descriptions win over Action');
  assert(['No Description', 'N/A', '-', 'n/a'].every((x) => PLACEHOLDER_DESC.test(x)) && !PLACEHOLDER_DESC.test('No Description Co'), 'placeholders: No Description, N/A, dashes (whole cell only)');
  assert(signCheck('generic_bank', r.transactions, 'N/A') === signCheck('generic_bank', noAction.transactions, 'N/A'), 'signcheck result unchanged by the new descriptions');
  for (const [f, n] of [['ericyan-fidelity.csv', 3], ['redstreet-fidelity-cma.csv', 11]]) {
    const t = real(f);
    if (!t) continue;
    const x = processCsv(t, detectPreset(t) || 'generic_bank');
    assert(!x.transactions.some((y) => /^no description$|^\(no description\)$/i.test(y.description)), `real ${f} (local only): no "No Description" left (${n} rows now show Action text)`);
  }
}
