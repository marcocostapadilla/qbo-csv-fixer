/**
 * Verify suite 19 (v1.5.9): running-balance check (runbal.mjs) for any bank layout with a
 * running-balance column and no Beginning/Ending balance rows.
 */
import { existsSync, readFileSync } from 'node:fs';
import { processCsv, detectPreset } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { findBalanceCol, chainBalances, CHAIN_SHARE, MIN_LINKS } from './runbal.mjs';
import { join } from 'node:path';
import { assert, readSample, ROOT } from './verify-lib.mjs';

const SCHWAB = '"Date","Status","Type","CheckNumber","Description","Withdrawal","Deposit","RunningBalance"\n'
  + '"08/17/2022","Posted","DEPOSIT","","Deposit Mobile Banking","","$20.00","$878.47"\n'
  + '"08/14/2022","Posted","ATM","","ATM WITHDRAWAL","$103.00","","$858.47"\n'
  + '"08/09/2022","Posted","CHECK","558","Check Paid #558","$75.00","","$961.47"\n'
  + '"08/04/2022","Posted","ACH","","ACH TRANSFER","$57.27","","$1,036.47"\n';
const GEN = 'Date,Description,Amount,Balance\n01/02/2026,Opening deposit,500.00,1500.00\n01/03/2026,Coffee,-4.50,1495.50\n01/05/2026,Rent,-900.00,595.50\n01/09/2026,Refund,25.00,620.50\n01/12/2026,Groceries,-60.25,560.25\n';
const run = (t, id) => processCsv(t, id || detectPreset(t) || 'generic_bank');
const drop = (t, n) => t.trim().split('\n').filter((_, i) => i !== n).join('\n') + '\n';

export function run159() {
  console.log('');
  console.log('=== v1.5.9 running-balance check ===');
  assert(CHAIN_SHARE === 2 / 3 && MIN_LINKS === 1, 'threshold: 2 of 3 row-to-row links must chain, in one clear direction');
  const keys = ['Balance', 'Running Balance', 'RunningBalance', 'Running Bal.', 'Current balance', 'Ledger Balance', 'Balance (USD)'];
  assert(keys.every((h) => findBalanceCol(['Date', 'Amount', h], [0, 1]) === 2), `fuzzy headers found: ${keys.join(', ')}`);
  assert(['Available Balance', 'Beginning Balance', 'Ending Balance', 'Balance Impact', 'Pending Balance'].every((h) => findBalanceCol(['Date', 'Amount', h], [0, 1]) === -1), 'not a running balance: Available, Beginning, Ending, Balance Impact, Pending');

  const w = run(readSample('wise.csv'));
  assert(w.reconcile.status === 'PASS' && w.runningBalance && w.closing === 1210.55, `Wise (Running Balance): PASS, closing 1210.55 (got ${w.reconcile.status} ${w.closing})`);
  assert(/missing first or last row/.test(w.reconcile.message), 'PASS text says a missing first or last row would not show');
  const s = run(SCHWAB);
  assert(s.reconcile.status === 'PASS' && s.opening === 1093.74 && s.closing === 878.47 && s.runningBalance.order === 'newest-first', `Schwab layout (RunningBalance, Withdrawal/Deposit, newest first): PASS 1093.74 -> 878.47 (got ${s.reconcile.status} ${s.opening} ${s.closing})`);
  const real = '/workspace/qbo-real-samples/csv2ofx-schwab.csv';
  if (existsSync(real)) {
    const rs = run(decodeBytes(new Uint8Array(readFileSync(real))).text);
    assert(rs.reconcile.status === 'PASS' && rs.net === -215.27, `real Schwab file (local only): PASS, net -215.27 (got ${rs.reconcile.status} ${rs.net})`);
  }
  const so = run(readSample('sofi.csv'));
  assert(so.reconcile.status === 'PASS' && so.opening === 1903 && so.closing === 3311.14 && so.skippedRows.length === 1, `SoFi still PASS through the general rule, pending row left out (got ${so.reconcile.status})`);
  const bofa = readSample('bank-of-america.csv');
  const b1 = run(bofa);
  assert(b1.reconcile.status === 'PASS' && b1.runningBalance === null && b1.opening === 3410.22 && b1.closing === 4898.75 && b1.net === 1488.53, 'BofA checking with summary block: explicit balance rows win, nothing counted twice');
  const noSum = bofa.split('\n').slice(bofa.split('\n').findIndex((l) => l.startsWith('Date,Description'))).join('\n');
  const b2 = run(noSum, 'bofa');
  assert(b2.reconcile.status === 'PASS' && b2.opening === 3410.22 && b2.closing === 4898.75 && b2.net === 1488.53 && b2.transactions.length === 7, `BofA without summary block (Running Bal.): Beginning row is the opening, closing from the column, PASS (got ${b2.reconcile.status} ${b2.closing})`);

  const g = run(GEN);
  assert(g.reconcile.status === 'PASS' && g.opening === 1000 && g.closing === 560.25, 'general layout, oldest first: PASS 1000.00 -> 560.25');
  const gm = run(drop(GEN, 3));
  assert(gm.reconcile.status === 'FAIL' && gm.reconcile.delta === -900 && /running balance column/.test(gm.reconcile.message), `middle row removed: FAIL, delta -900 (got ${gm.reconcile.status} ${gm.reconcile.delta})`);
  assert(run(drop(SCHWAB, 2)).reconcile.status === 'N/A', 'Schwab layout (4 rows), middle row removed: 1 of 2 links chain, below 2/3: N/A, not PASS');
  const sofiCut = readSample('sofi.csv').trim().split('\n').filter((_, i) => i !== 4).join('\n');
  assert(run(sofiCut, 'sofi').reconcile.status === 'FAIL', 'SoFi, middle row removed: FAIL');
  const gl = run(drop(GEN, 5));
  assert(gl.reconcile.status === 'PASS', 'last row removed: still PASS (known limit, stated in the PASS text)');
  const lines = GEN.trim().split('\n');
  const shuffled = [lines[0], lines[3], lines[1], lines[5], lines[2], lines[4]].join('\n');
  assert(run(shuffled).reconcile.status === 'N/A', 'shuffled rows: chain broken, N/A (never PASS)');
  const rev = [lines[0], ...lines.slice(1).reverse()].join('\n');
  const gr = run(rev);
  assert(gr.reconcile.status === 'PASS' && gr.runningBalance.order === 'newest-first' && gr.opening === 1000, 'same rows newest first: order read from the chain, PASS');
  const bad = 'Date,Description,Amount,Balance\n01/02/2026,A,10.00,100.00\n01/03/2026,B,-4.50,73.10\n01/05/2026,C,-9.00,512.00\n01/09/2026,D,25.00,40.00\n';
  assert(run(bad).reconcile.status === 'N/A' && run(bad).runningBalance === null, 'balance column that does not chain: N/A');
  const plain = run(readSample('chase-like-qbo-ready.csv'));
  assert(plain.runningBalance === null && plain.reconcile.status === 'N/A', 'file without a balance column: unchanged (N/A)');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(ui.includes('r.runningBalance &&') && ui.includes('so a missing first or last row would not show here.'), 'badge detail on screen names the running balance column and the first/last row limit');
  assert(chainBalances([{ amt: 5, bal: 5 }]) === null, 'one row: nothing to chain, N/A');
  assert(chainBalances([{ amt: 10, bal: 110 }, { amt: 5, bal: 115 }, { amt: 1, bal: 999 }, { amt: 2, bal: 3 }]) === null, '1 of 3 links chain: below 2/3, N/A');
}
export { run159 as run };
