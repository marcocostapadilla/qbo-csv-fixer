/**
 * Verify suite 1 (v1 + v1.1): chase-like reconcile FAIL delta $2.00, date ambiguity.
 * 1. chase-like fixture must yield 10 txns, net 2515.45,
 *    opening 1250.47, closing 3767.92, reconcile FAIL delta ~2.00 (v1, unchanged).
 * 2. Date ambiguity (US M/D vs EU D/M) detection and toggle.
 */
import { join } from 'path';
import { processCsv, round2, buildExportRows, toCsvString } from './core.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

export function run() {
  const fixturePath = join(ROOT, 'samples', 'chase-like-messy.csv');
  const text = readSample('chase-like-messy.csv');
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

  // ---------------------------------------------------------------
  // 2. Date ambiguity
  // ---------------------------------------------------------------

  console.log('');
  console.log('=== Date ambiguity (samples/ambiguous-dates.csv) ===');
  {
    const text = readSample('ambiguous-dates.csv');
    const us = processCsv(text, 'generic_bank', { dateOrder: 'mdy' });
    const eu = processCsv(text, 'generic_bank', { dateOrder: 'dmy' });
    const dflt = processCsv(text, 'generic_bank');
    assert(us.dateInfo.ambiguous === true, `ambiguous flag === true (got ${us.dateInfo.ambiguous})`);
    assert(dflt.dateInfo.used === 'mdy', `default order for generic bank === mdy (got ${dflt.dateInfo.used})`);
    assert(us.transactions.length === 3, `3 txns (got ${us.transactions.length})`);
    const usExport = buildExportRows(us.transactions, 'date_desc_amount');
    const euExport = buildExportRows(eu.transactions, 'date_desc_amount');
    assert(usExport.body[0][0] === '03/04/2026', `US mode: 03/04/2026 -> 03/04/2026 (March 4) (got ${usExport.body[0][0]})`);
    assert(euExport.body[0][0] === '04/03/2026', `EU mode: 03/04/2026 -> 04/03/2026 (April 3) (got ${euExport.body[0][0]})`);
    assert(euExport.body[2][0] === '12/11/2026', `EU mode: 11/12/2026 -> 12/11/2026 (got ${euExport.body[2][0]})`);
    const usCsv = toCsvString(usExport.header, usExport.body);
    const euCsv = toCsvString(euExport.header, euExport.body);
    assert(usCsv !== euCsv && euCsv.includes('04/03/2026,NORTHWIND COFFEE,-4.50'), 'toggle changes the export CSV');
  }
  {
    // Chase-like: 9 slash dates all with both parts <= 12, plus one ISO date. Honest answer: ambiguous.
    const r = processCsv(text, 'generic_bank');
    assert(r.dateInfo.ambiguous === true, `chase-like fixture is ambiguous (all slash dates have parts <= 12) (got ${r.dateInfo.ambiguous})`);
    assert(r.dateInfo.used === 'mdy', `chase-like default stays US M/D (got ${r.dateInfo.used})`);
    assert(r.transactions[2].date === '01/04/2026', `chase-like txn[2] date === 01/04/2026 in default US mode (got ${r.transactions[2].date})`);
  }
  {
    // A disambiguating row (day > 12) auto-picks and ignores the toggle; ISO never ambiguous.
    const dmyText = 'Date,Description,Amount\n03/04/2026,A,-1.00\n25/04/2026,B,-2.00\n';
    const r = processCsv(dmyText, 'generic_bank', { dateOrder: 'mdy' });
    assert(r.dateInfo.ambiguous === false && r.dateInfo.used === 'dmy', `25/04/2026 row auto-picks EU D/M, no warning (got ambiguous=${r.dateInfo.ambiguous}, used=${r.dateInfo.used})`);
    assert(r.transactions[0].date === '04/03/2026', `auto D/M: 03/04/2026 -> 04/03/2026 (got ${r.transactions[0].date})`);
    const mdyText = 'Date,Description,Amount\n03/04/2026,A,-1.00\n04/25/2026,B,-2.00\n';
    const r2 = processCsv(mdyText, 'generic_bank', { dateOrder: 'dmy' });
    assert(r2.dateInfo.ambiguous === false && r2.dateInfo.used === 'mdy', `04/25/2026 row auto-picks US M/D (got ambiguous=${r2.dateInfo.ambiguous}, used=${r2.dateInfo.used})`);
    const isoText = 'Date,Description,Amount\n2026-03-04,A,-1.00\n2026-05-06,B,-2.00\n';
    const r3 = processCsv(isoText, 'generic_bank');
    assert(r3.dateInfo.ambiguous === false && r3.transactions[0].date === '03/04/2026', `ISO dates never ambiguous (got ambiguous=${r3.dateInfo.ambiguous}, ${r3.transactions[0].date})`);
  }
}
