/**
 * Verify suite 22 (v1.5.12): robustness batch. TD Bank and USAA presets, bank text lines below
 * the table, "Account Running Balance" / "Cash Balance" headers.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, detectPresetScored } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { signCheck } from './signcheck.mjs';
import { findBalanceCol } from './runbal.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

const amounts = (r) => r.transactions.map((t) => t.amount).join();
const real = (f) => (existsSync(f) ? decodeBytes(new Uint8Array(readFileSync(f))).text : null);
const R = '/workspace/qbo-real-samples/v1512/';

export function run() {
  console.log('');
  console.log('=== v1.5.12 robustness batch ===');
  const td = readSample('td-bank.csv');
  const d = detectPresetScored(td);
  const r = processCsv(td, d.id);
  assert(d.id === 'td_bank' && d.confidence === 'high', `TD Bank header detects as td_bank, high (got ${d.id} ${d.confidence}; before: Capital One 360, medium)`);
  assert(amounts(r) === '1850,-120,-64.33,-3,-86.14,250' && r.transactions[0].date === '03/27/2026', `TD: Debit out, Credit in, ISO dates to MM/DD/YYYY (got ${amounts(r)})`);
  assert(r.reconcile.status === 'PASS' && r.opening === 2299.87 && r.closing === 4126.4, `TD: Account Running Balance gives PASS 2299.87 -> 4126.40 (got ${r.reconcile.status})`);
  const split = td.replace('CITY WATER UTIL PAYMENT ,64.33,', 'CITY WATER UTIL, PAYMENT ,64.33,');
  const rs = processCsv(split, 'td_bank');
  assert(amounts(rs) === amounts(r) && rs.transactions[2].description === 'CITY WATER UTIL, PAYMENT' && rs.reconcile.status === 'PASS', `TD: unquoted comma in Description joined back, Debit stays money out (got ${amounts(rs)})`);
  assert(processCsv(split, 'generic_bank').reconcile.status === 'FAIL', 'same file on the general layout: shifted Debit read as Credit, badge FAIL (the check catches it)');
  const lines = td.trim().split('\n');
  assert(processCsv(lines.filter((_, i) => i !== 3).join('\n'), 'td_bank').reconcile.status === 'FAIL', 'TD: middle row removed gives FAIL');

  const us = readSample('usaa.csv');
  const u = processCsv(us, detectPreset(us));
  assert(detectPreset(us) === 'usaa', 'USAA header detects as usaa');
  assert(u.transactions.length === 5 && u.net === 1122.18 && u.skippedRows.map((x) => x.reason).join() === 'Status SCHEDULED BILL PAY,Status PENDING', `USAA: Posted only; Scheduled bill pay and Pending left out and listed (got ${u.transactions.length} ${u.net})`);
  assert(!signCheck('usaa', u.transactions, u.reconcile.status), 'USAA checking: no sign warning');
  const card = 'Date,Description,Original Description,Category,Amount\n2026-03-15,Apple,APPLE.COM/BILL,Software,9.99\n2026-03-11,Github,GITHUB INC,Hosting,21.00\n2026-03-02,Amazon,AMAZON MKTPL,Shopping,54.20\n2026-02-20,Payment,USAA CREDIT CARD PAYMENT THANK YOU,Transfer,-450.00\n2026-02-10,Netflix,NETFLIX.COM,Television,22.99\n';
  assert(signCheck('usaa', processCsv(card, 'usaa').transactions, 'N/A')?.rule === 'inverted', 'USAA card export (same layout, purchases positive): sign warning shows');
  const minance = 'Status,Date,Original Description,Split Type,Category,Currency,Amount,User Description,Memo,Classification,Account Name,Simple Description\nposted,09/19/2023,AMAZON,,Refunds,USD,-16.72,,,Personal,Card,Amazon\n';
  assert(detectPreset(minance) !== 'usaa', 'budget-app layout with Original Description is not taken for USAA');

  const fid = 'Run Date,Action,Symbol,Description,Type,Quantity,Amount ($),Cash Balance ($)\n04/01/2025,DIRECT DEPOSIT,,No Description,Cash,,2500.00,7500.00\n04/10/2025,EFT PAID,,No Description,Cash,,-200.00,7300.00\n04/15/2025,DIVIDEND,FCT,FICTCORP,Cash,,12.50,7312.50\n\n"The data in this spreadsheet is provided for informational purposes only."\n"Date downloaded 04/15/2025 3:00 pm"\n';
  const f = processCsv(fid, 'generic_bank');
  assert(f.leftOutRows.length === 0 && f.transactions.length === 3 && f.reconcile.status === 'PASS', `bank text lines below the table: not left out rows, badge PASS from Cash Balance (got ${f.leftOutRows.length} left out, ${f.reconcile.status})`);
  assert(f.notes.some((n) => /^2 text line\(s\) with no date or amount were ignored/.test(n)), 'ignored text lines are named in a note (nothing dropped silently)');
  const one = processCsv('Date,Description,Amount\n03/01/2026,Coffee,-4.50\n03/02/2026,Lunch\n', 'generic_bank');
  assert(one.leftOutRows.length === 1, 'a row with a date but no amount is still left out and listed');
  assert(['Account Running Balance', 'Cash Balance ($)'].every((h) => findBalanceCol(['Date', 'Amount', h], [0, 1]) === 2), 'Account Running Balance and Cash Balance ($) are running-balance columns');

  const t1 = real(R + 'lonelytango-td-3_2024.csv');
  if (t1) assert(processCsv(t1, detectPreset(t1)).reconcile.status === 'PASS', 'real TD file with an unquoted comma (local only): PASS');
  const t2 = real(R + 'adgedenkers-usaa.csv');
  if (t2) assert(processCsv(t2, detectPreset(t2)).skippedRows.length === 7, 'real USAA file (local only): 7 Pending / Scheduled rows left out');
  const html = ['td-bank', 'usaa'].map((s) => readFileSync(join(ROOT, `${s}-csv-to-quickbooks-online.html`), 'utf8'));
  assert(html.every((h) => h.includes('<script data-goatcounter="https://qbofixer.goatcounter.com/count"\n          async src="//gc.zgo.at/count.js"></script>')), 'TD Bank and USAA guides carry the GoatCounter snippet');
  const sm = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  assert(['td-bank', 'usaa'].every((s) => sm.includes(`/${s}-csv-to-quickbooks-online.html</loc>`)), 'both guides in the sitemap');
}
