/**
 * Verify suite 3 (v1.2): header drift. Fuzzy header matching (case, spacing, punctuation,
 * BOM, synonyms), preset confidence, and a clear error when required columns are missing.
 * Fixtures: samples/drift/*.csv (fake merchants).
 */
import { processCsv, detectPresetScored, detectionNote } from './core.mjs';
import { headerKey } from './headers.mjs';
import { fieldOfHeader } from './fields.mjs';
import { assert, readSample, printTxns, MMDDYYYY } from './verify-lib.mjs';

const cases = [
  {
    file: 'drift/renamed-headers.csv', what: 'Capital One with renamed headers (Trans. Date, Posting Date, Debit Amount, Credit Amount)',
    preset: 'capital_one', confidence: 'medium', count: 6, net: 183.7, out: ['FABRIKAM OFFICE SUPPLY', -48.9], inn: ['CAPITAL ONE AUTOPAY PYMT', 300],
    firstDate: '04/01/2026', map: { date: 'Trans. Date', debit: 'Debit Amount', credit: 'Credit Amount', amount: null },
  },
  {
    file: 'drift/renamed-generic.csv', what: 'generic bank with Trans. Date / Payee / Paid out / Paid in',
    preset: 'generic_bank', confidence: 'low', count: 6, net: 1517.36, out: ['FABRIKAM UTILITIES', -132.4], inn: ['CONTOSO LTD PAYROLL', 1820],
    firstDate: '01/05/2026', map: { date: 'Trans. Date', description: 'Payee', debit: 'Paid out', credit: 'Paid in' },
  },
  {
    file: 'drift/extra-columns.csv', what: 'Amex with 8 extra columns',
    preset: 'amex', confidence: 'high', count: 5, net: -26.19, out: ['WINGTIP AIRWAYS', -264], inn: ['AUTOPAY PAYMENT', 250],
    firstDate: '02/02/2026', map: { date: 'Date', description: 'Description', amount: 'Amount' },
  },
  {
    file: 'drift/reordered.csv', what: 'Chase card with every column reordered',
    preset: 'chase', confidence: 'high', count: 6, net: 333.86, out: ['ADVENTURE WORKS', -85], inn: ['Payment Thank You', 450],
    firstDate: '03/03/2026', map: { date: 'Transaction Date', description: 'Description', amount: 'Amount' },
  },
  {
    file: 'drift/bom-spacing.csv', what: 'BOM, CRLF, padded headers, Posting Date / Withdrawals / Deposits',
    preset: 'generic_bank', confidence: 'low', count: 5, net: 258.72, out: ['FABRIKAM ELECTRIC', -1210.55], inn: ['CONTOSO PAYROLL', 1500],
    firstDate: '05/01/2026', map: { description: 'DESCRIPTION', debit: 'Withdrawals', credit: 'Deposits' },
  },
];

export function run() {
  console.log('');
  console.log('=== Header drift: fuzzy keys and synonyms ===');
  assert(headerKey('\uFEFF  Trans.  Date ') === 'transaction date', `headerKey("BOM  Trans.  Date ") === "transaction date" (got "${headerKey('\uFEFF  Trans.  Date ')}")`);
  assert(headerKey('Card No.') === headerKey('card_number') && headerKey('Account #') === 'account number', 'Card No. == card_number, Account # -> account number');
  const syn = [
    ['Posting Date', 'date'], ['Posted Date', 'date'], ['Trans. Date', 'date'], ['Transaction Date', 'date'],
    ['Withdrawals', 'debit'], ['Debit', 'debit'], ['Money Out', 'debit'], ['Paid out', 'debit'],
    ['Deposits', 'credit'], ['Credit', 'credit'], ['Money In', 'credit'], ['Paid in', 'credit'],
    ['Memo', 'description'], ['Payee', 'description'], ['Details', 'description'], ['Narrative', 'description'],
  ];
  for (const [h, f] of syn) assert(fieldOfHeader(h) === f, `synonym "${h}" -> ${f} (got ${fieldOfHeader(h)})`);

  for (const c of cases) {
    console.log('');
    console.log(`=== Drift: ${c.what} (samples/${c.file}) ===`);
    const t = readSample(c.file);
    const det = detectPresetScored(t);
    console.log('  ' + detectionNote(det));
    assert(det.id === c.preset && det.confidence === c.confidence, `detected ${c.preset} with ${c.confidence} confidence (got ${det.id}, ${det.confidence}, score ${det.score})`);
    const r = processCsv(t, det.id);
    printTxns(r);
    assert(r.mappingError === null, 'no mapping error');
    for (const [field, header] of Object.entries(c.map)) {
      assert(r.mapping[field] === header, `${field} column === ${JSON.stringify(header)} (got ${JSON.stringify(r.mapping[field])})`);
    }
    assert(r.transactions.length === c.count, `row count === ${c.count} (got ${r.transactions.length})`);
    assert(Math.abs(r.net - c.net) < 0.001, `net === ${c.net.toFixed(2)} (got ${r.net})`);
    const o = r.transactions.find((x) => x.description.includes(c.out[0]));
    assert(o && Math.abs(o.amount - c.out[1]) < 0.001, `money out negative: ${c.out[0]} === ${c.out[1]} (got ${o && o.amount})`);
    const i = r.transactions.find((x) => x.description.includes(c.inn[0]));
    assert(i && Math.abs(i.amount - c.inn[1]) < 0.001, `money in positive: ${c.inn[0]} === ${c.inn[1]} (got ${i && i.amount})`);
    assert(r.transactions.every((x) => MMDDYYYY.test(x.date)) && r.transactions[0].date === c.firstDate, `dates MM/DD/YYYY, first === ${c.firstDate} (got ${r.transactions[0] && r.transactions[0].date})`);
  }

  console.log('');
  console.log('=== Drift: low confidence suggests the closest presets ===');
  {
    const det = detectPresetScored(readSample('drift/renamed-generic.csv'));
    const note = detectionNote(det);
    console.log('  ' + note);
    assert(det.candidates.length >= 1 && /Closest matches: /.test(note), 'low-confidence note lists closest matches');
  }

  console.log('');
  console.log('=== Drift: unmappable required columns give a clear error, no guessing ===');
  {
    const r = processCsv(readSample('drift/unmappable.csv'), 'generic_bank');
    console.log('  ' + (r.mappingError && r.mappingError.message));
    assert(r.mappingError && r.mappingError.missing.join(',') === 'date,description,amount', `missing === date,description,amount (got ${r.mappingError && r.mappingError.missing})`);
    assert(r.transactions.length === 0, 'no rows exported when required columns are missing');
    assert(/"When", "What", "How Much"/.test(r.mappingError.message), "error lists the file's headers");
    const r2 = processCsv('Date,Notes,Amount\n01/02/2026,,4.50\n', 'generic_bank');
    assert(r2.mappingError && r2.mappingError.missing.join(',') === 'description', `a file without any description-like column is refused (got ${r2.mappingError && r2.mappingError.missing})`);
  }
}
