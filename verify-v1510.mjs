/**
 * Verify suite 20 (v1.5.10): robustness fixes. Capital One 360 (unsigned Transaction Amount,
 * sign from Transaction Type) was read by the general layout as all money in.
 */
import { processCsv, detectPreset } from './core.mjs';
import { signCheck } from './signcheck.mjs';
import { assert } from './verify-lib.mjs';

const C360 = 'Account Number,Transaction Description,Transaction Date,Transaction Type,Transaction Amount,Balance\n'
  + '1122,Debit Card Purchase - CORNER CAFE,11/27/25,Debit,21,405.12\n'
  + '1122,Withdrawal to My Savings XXXXXXX1234,11/26/25,Debit,175,426.12\n'
  + '1122,Deposit from ACME PAYROLL,11/26/25,Credit,504.48,601.12\n'
  + '1122,Digital Card Purchase - HARDWARE STORE,11/25/25,Debit,23.52,96.64\n'
  + '1122,Withdrawal from CITY UTIL BILLS,11/25/25,Debit,271.73,120.16\n';

export function run() {
  console.log('');
  console.log('=== v1.5.10 robustness fixes ===');
  const id = detectPreset(C360);
  const r = processCsv(C360, id);
  assert(id === 'capital_one_360', `Capital One 360 header detects as capital_one_360 (got ${id})`);
  assert(r.transactions.map((t) => t.amount).join() === '-21,-175,504.48,-23.52,-271.73', `Debit rows negative, Credit rows positive (got ${r.transactions.map((t) => t.amount).join()})`);
  assert(r.transactions[0].date === '11/27/2025', 'MM/DD/YY dates read as US');
  assert(r.reconcile.status === 'PASS' && r.opening === 391.89 && r.closing === 405.12, `Balance column chains: PASS 391.89 -> 405.12 (got ${r.reconcile.status} ${r.opening} ${r.closing})`);
  assert(!signCheck(id, r.transactions, 'N/A'), 'no sign warning on the right preset');
  const old = processCsv(C360, 'generic_bank');
  assert(old.transactions.every((t) => t.amount > 0) && signCheck('generic_bank', old.transactions, 'N/A')?.rule === 'all-positive', 'read with the general layout (old build): all positive, sign warning shows');
  const already = C360.replace(',Debit,21,', ',Debit,-21,');
  assert(processCsv(already, 'capital_one_360').transactions[0].amount === -21, 'an amount already written negative is not flipped back');
}
