/**
 * Verify suite 28 (v1.5.18): line breaks flattened on export, general-layout hint.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, buildExportRows, toCsvString } from './core.mjs';
import { flatText } from './export.mjs';
import { PRESETS } from './presets.mjs';
import { assert, ROOT } from './verify-lib.mjs';

const T = (desc, amount = -5) => [{ date: '03/02/2026', description: desc, amount }];

export function run() {
  console.log('');
  console.log('=== v1.5.18 flatten line breaks on export ===');
  assert(flatText('A\r\nB\nC\rD\tE') === 'A B C D E', 'CRLF, LF, CR and tab each become one space');
  assert(flatText('  NORTHWIND   COFFEE \n\n  TO GO  ') === 'NORTHWIND   COFFEE TO GO', 'v1.5.19: spaces around a line break fold into the one space; inner double spaces stay; ends trimmed');
  assert(flatText('MULTI\n  LINE') === 'MULTI LINE' && flatText('POS  DEBIT  1234') === 'POS  DEBIT  1234', 'v1.5.19: MULTI\\n  LINE -> MULTI LINE; a cell with no line break keeps its double spaces');
  for (const id of ['date_desc_amount', 'date_desc_debit_credit']) {
    const { header, body } = buildExportRows(T('LINE ONE\r\nLINE\tTWO'), id);
    const csv = toCsvString(header, body);
    assert(body[0][1] === 'LINE ONE LINE TWO' && csv.split('\n').length === 3 && !/\r|\t/.test(csv), `${id}: one line per row, no CR or tab in the file`);
  }
  const g = buildExportRows(T('\n  =SUM(A1:A2)\n'), 'date_desc_amount');
  assert(toCsvString(g.header, g.body).split('\n')[1] === "03/02/2026,'=SUM(A1:A2),-5.00", 'formula guard still applies after flattening (leading newline and spaces trimmed, then the apostrophe)');
  const h = buildExportRows(T('\t+1 555 0100'), 'date_desc_amount');
  assert(toCsvString(h.header, h.body).split('\n')[1] === "03/02/2026,'+1 555 0100,-5.00", 'a tab-led "+" cell: flattened, then guarded');
  const amt = buildExportRows([{ date: '03/02/2026', description: 'X', amount: -1234.5 }], 'date_desc_debit_credit').body[0];
  assert(amt[0] === '03/02/2026' && amt[2] === '1234.50' && amt[3] === '', 'dates and amounts untouched');
  const qc = processCsv(readFileSync(join(ROOT, 'samples/adversarial/quoted-commas.csv'), 'utf8'), 'generic_bank');
  assert(buildExportRows(qc.transactions, 'date_desc_amount').body.map((r) => r[1]).join('|') === 'LANTERN KITCHEN, LLC|ACME "TOOLS", INC, SPRINGFIELD|MULTI LINE MEMO|PAYROLL, NORTHWIND', 'quoted-commas.csv exports MULTI LINE MEMO');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(/const \{ header, body \} = buildExportRows\(r\.transactions, qboId\);/.test(ui), 'the preview is drawn from the export rows, so it matches the download');

  assert(ui.includes('</code>; nothing is added to descriptions') && !ui.includes('descriptions are untouched'), 'v1.5.19: free-version note says nothing is added to descriptions');
  const wu = readFileSync(join(ROOT, 'wrongui.mjs'), 'utf8');
  assert(ui.includes("const near = (els.detectNote.textContent.match(/Closest match: .+?\\.(?= Check the preview)/) || [''])[0];") && ui.includes("${near ? near + ' ' : ''}Check the columns"), 'walk: step 3 repeats the closest-match names (the page scrolls there, past step 2)');
  assert(wu.includes("(h || select).focus({ preventScroll: true })"), 'walk: after the general-layout button, focus lands on the step 3 heading, not <body>');
  console.log('');
  console.log('=== v1.5.18 general-layout hint ===');
  assert(PRESETS.generic_bank.hint === 'For any bank that is not in the list. Reads a date column, a description column, and either one signed amount column or separate money out and money in columns (Debit / Credit, Withdrawals / Deposits). If the file has opening and ending balance rows or a running balance column, they feed the balance check.', 'hint describes the any-bank fallback in plain words');
}
