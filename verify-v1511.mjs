/**
 * Verify suite 21 (v1.5.11): the running-balance check needs 3+ exported rows (2 links).
 */
import { existsSync, readFileSync } from 'node:fs';
import { processCsv, detectPreset } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { assert, readSample } from './verify-lib.mjs';

const H = 'Date,Description,Amount,Balance\n';
const run = (t, id) => processCsv(t, id || detectPreset(t) || 'generic_bank');

export function run1511() {
  console.log('');
  console.log('=== v1.5.11 running balance needs 3 rows ===');
  const two = run(H + '01/02/2026,Deposit,500.00,1500.00\n01/03/2026,Coffee,-4.50,1495.50\n');
  assert(two.reconcile.status === 'N/A' && two.runningBalance === null, `2 rows that chain: N/A, too little to judge (got ${two.reconcile.status})`);
  const three = run(H + '01/02/2026,Deposit,500.00,1500.00\n01/03/2026,Coffee,-4.50,1495.50\n01/05/2026,Rent,-900.00,595.50\n');
  assert(three.reconcile.status === 'PASS' && three.opening === 1000 && three.closing === 595.5, `3 rows that chain: PASS 1000.00 -> 595.50 (got ${three.reconcile.status})`);
  const broken = run(H + '01/02/2026,Deposit,500.00,1500.00\n01/03/2026,Coffee,-4.50,1495.50\n01/05/2026,Rent,-900.00,700.00\n');
  assert(broken.reconcile.status === 'N/A', `3 rows, 1 of 2 links chains (below 2/3): N/A (got ${broken.reconcile.status})`);
  const sofi2 = run('Date,Description,Type,Amount,Current balance,Status\n2026-01-03,Coffee,Debit,-4.50,95.50,Posted\n2026-01-02,Deposit,Deposit,100.00,100.00,Posted\n', 'sofi');
  assert(sofi2.reconcile.status === 'N/A', 'SoFi with 2 rows: N/A');
  const bofa = run(readSample('bank-of-america.csv'));
  assert(bofa.reconcile.status === 'PASS' && bofa.runningBalance === null, 'explicit Beginning/Ending rows unaffected: BofA sample PASS');
  const venmo = run(readSample('venmo.csv'));
  assert(venmo.reconcile.status === 'PASS', 'explicit balance columns unaffected: Venmo sample PASS');
  const real = '/workspace/qbo-real-samples/ledgerautosync-paypal.csv';
  if (existsSync(real)) {
    const r = run(decodeBytes(new Uint8Array(readFileSync(real))).text);
    assert(r.reconcile.status === 'N/A', `real ledger-autosync PayPal (2 rows, local only): N/A (got ${r.reconcile.status})`);
  }
}
export { run1511 as run };
