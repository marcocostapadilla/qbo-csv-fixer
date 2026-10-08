/**
 * Verify suite 4 (v1.2 parsing fixes): adversarial fixtures from the live browser test suite.
 * samples/adversarial/*.csv. Comma decimals, trailing minus / CR / currency amounts, text-month
 * dates, semicolon and tab delimiters, empty / header-only / binary / prose rejects,
 * left-out rows and INCOMPLETE reconcile, formula injection, output filename.
 */
import {
  processCsv, toCsvString, buildExportRows, exportFileName, parseAmount, parseCsv,
} from './core.mjs';
import { assert, readSample, printTxns } from './verify-lib.mjs';

const BASE = [-4.5, 1200, -89.1];
const EU = [-12.5, 1234.56, -89.1];
// Bytes of samples/adversarial/not-a-csv.png (a 1x1 PNG), decoded as UTF-8 the way FileReader.readAsText does.
const PNG_HEX = '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc0000003010100c9fe92ef0000000049454e44ae426082';

const amounts = (r) => r.transactions.map((t) => t.amount);
const same = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 0.001);

function check(file, preset, want) {
  console.log('');
  console.log(`=== Adversarial ${file} ===`);
  const r = processCsv(readSample('adversarial/' + file), preset);
  printTxns(r);
  if (want.amounts) assert(same(amounts(r), want.amounts), `amounts === ${want.amounts.join(', ')} (got ${amounts(r).join(', ')})`);
  if (want.dates) assert(r.transactions.map((t) => t.date).join(',') === want.dates.join(','), `dates === ${want.dates.join(', ')} (got ${r.transactions.map((t) => t.date).join(', ')})`);
  if (want.delimiter) assert(r.delimiter === want.delimiter, `delimiter sniffed === ${JSON.stringify(want.delimiter)} (got ${JSON.stringify(r.delimiter)})`);
  if (want.decimal) assert(r.decimalInfo.used === want.decimal && !r.decimalInfo.ambiguous, `decimal separator === "${want.decimal}", not ambiguous (got "${r.decimalInfo.used}", ambiguous ${r.decimalInfo.ambiguous})`);
  if (want.amounts) assert(r.leftOutRows.length === 0 && !r.fileError && !r.mappingError, `no rows left out, no error (left out ${r.leftOutRows.length})`);
  if (want.error) {
    const e = r.fileError || r.mappingError;
    assert(e && want.error.test(e.message) && r.transactions.length === 0, `clear error ${want.error} and 0 rows (got ${e && e.message})`);
  }
  return r;
}

export function run() {
  for (const f of ['baseline-simple.csv', 'bom.csv', 'crlf.csv', 'trailing-blank-lines.csv']) check(f, 'generic_bank', { amounts: BASE });
  check('eu-comma-quoted-decimal.csv', 'generic_bank', { amounts: EU, decimal: ',', dates: ['01/13/2026', '01/14/2026', '01/15/2026'] });
  check('eu-semicolon-comma-decimal.csv', 'generic_bank', { amounts: EU, decimal: ',', delimiter: ';', dates: ['01/13/2026', '01/14/2026', '01/15/2026'] });
  check('tab-delimited.csv', 'generic_bank', { amounts: BASE, delimiter: '\t' });
  check('unparseable-amounts.csv', 'generic_bank', { amounts: [-12.5, 300, 45, -10] });
  check('text-month-dates.csv', 'generic_bank', { amounts: BASE, dates: ['01/13/2026', '01/13/2026', '01/15/2026'] });
  const qc = check('quoted-commas.csv', 'generic_bank', { amounts: [-78.4, -15, 22, 1250] });
  assert(qc.transactions[2].description === 'MULTI\nLINE MEMO' && qc.transactions[1].description === 'ACME "TOOLS", INC, SPRINGFIELD', 'quoted commas, doubled quotes and embedded newline kept');
  const xss = check('xss-description.csv', 'generic_bank', { amounts: [-1, 2] });
  assert(xss.transactions[1].description === '<script>window.__xss=2</script>', 'HTML kept as plain text in data (UI escapes it)');
  check('leak-marker.csv', 'generic_bank', { amounts: [-4.5, 1200] });
  check('empty.csv', 'generic_bank', { error: /empty/i });
  check('header-only.csv', 'generic_bank', { error: /no transaction rows/i });
  check('not-a-csv.txt', 'generic_bank', { error: /could not find required column/i });
  {
    const png = new TextDecoder('utf-8').decode(Uint8Array.from(PNG_HEX.match(/../g).map((h) => parseInt(h, 16))));
    const r = processCsv(png, 'generic_bank');
    assert(r.fileError && /not CSV text/.test(r.fileError.message) && !r.transactions.length, `PNG bytes rejected as binary (got ${r.fileError && r.fileError.message})`);
  }

  console.log('');
  console.log('=== Formula injection on export; free watermark is the filename only ===');
  {
    const r = processCsv(readSample('adversarial/formula-injection.csv'), 'generic_bank');
    const { header, body } = buildExportRows(r.transactions, 'date_desc_amount');
    const csv = toCsvString(header, body);
    const lines = csv.trim().split('\n');
    console.log(csv);
    assert(lines.length === 1 + r.transactions.length, `no extra row: ${lines.length} lines for ${r.transactions.length} rows`);
    assert(lines.slice(1).every((l) => /^\d\d\/\d\d\/\d{4},/.test(l)), 'every exported row has a date (no blank-date row)');
    assert(lines[1].startsWith('01/13/2026,"\'=HYPERLINK(') && lines[2].includes(",'+SUM(1+1)") && lines[3].includes(",'@cmd"), 'descriptions starting with = + @ get a leading apostrophe');
    assert(lines[1].endsWith(',-1.00') && lines[2].endsWith(',2.00'), 'amount cells untouched (no apostrophe on -1.00)');
    assert(lines.slice(1).every((l) => !/free\)/.test(l)), 'no description suffix on free exports');
    const dc = buildExportRows([{ date: '01/02/2026', description: '-REFUND', amount: -5 }], 'date_desc_debit_credit');
    assert(toCsvString(dc.header, dc.body) === "Date,Description,Debit,Credit\n01/02/2026,'-REFUND,5.00,\n", 'leading minus in text is neutralized; Debit 5.00 unchanged');
    const long = processCsv(readSample('adversarial/long-description.csv'), 'generic_bank');
    const lcsv = toCsvString(...Object.values(buildExportRows(long.transactions, 'date_desc_amount')));
    const descs = parseCsv(lcsv, ',').slice(1).filter((x) => x.length > 1).map((x) => x[1]);
    assert(descs.length === long.transactions.length && descs.every((d, i) => d === long.transactions[i].description), `long descriptions exported unchanged (max ${Math.max(...descs.map((d) => d.length))} chars)`);
  }

  console.log('');
  console.log('=== Left-out rows are listed and make the badge INCOMPLETE ===');
  {
    const t = 'Beginning balance,,100.00\nDate,Description,Amount\n01/02/2026,GOOD,-10.00\n01/03/2026,BAD AMOUNT,abc\nFoo 13 2026,BAD DATE,-5.00\n01/05/2026,NO AMOUNT,\nEnding balance,,90.00\n';
    const r = processCsv(t, 'generic_bank');
    const lo = r.leftOutRows.map((x) => `${x.sourceRow}:${x.reason}`).join(', ');
    console.log('  left out: ' + lo + ' | badge ' + r.reconcile.status + ': ' + r.reconcile.message);
    assert(r.transactions.length === 1 && lo === '4:unreadable amount, 5:unreadable date, 6:missing amount', `3 rows left out with row number and reason (got ${lo})`);
    assert(r.leftOutRows[0].amounts[0] === 'abc' && r.leftOutRows[1].date === 'Foo 13 2026', 'left-out entries carry the raw values');
    assert(r.reconcile.status === 'INCOMPLETE', `balances would PASS (100 - 10 = 90) but badge is INCOMPLETE (got ${r.reconcile.status})`);
  }

  console.log('');
  console.log('=== Decimal separator ambiguity and amount formats ===');
  {
    const t = 'Date,Description,Amount\n01/13/2026,A,"1,250"\n01/14/2026,B,"-2,500"\n';
    const r = processCsv(t, 'generic_bank');
    assert(r.decimalInfo.ambiguous === true && r.decimalInfo.used === '.' && same(amounts(r), [1250, -2500]), `"1,250" is ambiguous; default dot read gives 1250 (got ${amounts(r)})`);
    const r2 = processCsv(t, 'generic_bank', { decimal: ',' });
    assert(same(amounts(r2), [1.25, -2.5]), `toggle to comma decimal gives 1.25 (got ${amounts(r2)})`);
    const r3 = processCsv('Date,Description,Amount\n01/13/2026,A,"1,250"\n01/14/2026,B,12.50\n', 'generic_bank', { decimal: ',' });
    assert(r3.decimalInfo.ambiguous === false && r3.decimalInfo.used === '.', 'a proving value (12.50) overrides the toggle');
    const cases = [['12.50-', -12.5], ['300.00 CR', 300], ['45.00 DR', -45], ['€45.00', 45], ['USD 1,234.50', 1234.5], ['($14.99)', -14.99], ['abc', null], ['1e3', null]];
    for (const [v, n] of cases) assert(parseAmount(v) === n, `parseAmount(${JSON.stringify(v)}) === ${n} (got ${parseAmount(v)})`);
  }

  console.log('');
  console.log('=== Output filename ===');
  for (const [n, out] of [['not-a-csv.txt', 'not-a-csv_qbo-csv-fixer-free.csv'], ['Statement.CSV.txt', 'Statement_qbo-csv-fixer-free.csv'], ['chase.csv', 'chase_qbo-csv-fixer-free.csv'], ['my.bank.2026.csv', 'my.bank.2026_qbo-csv-fixer-free.csv']]) {
    assert(exportFileName(n) === out, `${n} -> ${out} (got ${exportFileName(n)})`);
  }
}
