/**
 * Verify suite 26 (v1.5.16): clearer unrecognized-bank path. Unsigned Amount + DR/CR Type column.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset } from './core.mjs';
import { TYPE_NOTE } from './typenote.mjs';
import { assert, ROOT } from './verify-lib.mjs';

const DRCR = 'Date,Details,Amount,Type\n03/27/2026,ACME PAYROLL,1850.00,CR\n03/25/2026,CORNER CAFE,8.75,DR\n03/24/2026,GROCERS,86.14,DR\n03/15/2026,RENT MARCH,900.00,DR\n';
const note = (t) => (processCsv(t, detectPreset(t) || 'generic_bank').notes || []).find((n) => n.startsWith(TYPE_NOTE));

export function run() {
  console.log('');
  console.log('=== v1.5.16 unrecognized bank: unsigned Amount with a DR/CR column ===');
  const r = processCsv(DRCR, 'generic_bank');
  assert(detectPreset(DRCR) === 'generic_bank' && r.transactions.every((t) => t.amount > 0), 'DR/CR file on the general layout: amounts unchanged (no auto re-mapping)');
  assert(note(DRCR) === 'Check before you upload: Amount has no minus signs, and the "Type" column marks 3 row(s) as DR (money out). The general layout does not read that column, so those rows are exported as money in. Do not upload this file as it is. In a spreadsheet, put a minus sign before each DR amount, save as CSV and drop it here again.', 'clear warning names the column, the count and the fix');
  assert(note(DRCR.replace(/,CR\n/g, ',Credit\n').replace(/,DR\n/g, ',Debit\n')).includes('marks 3 row(s) as DEBIT'), 'Debit / Credit words work the same way');
  assert(!note(DRCR.replace('8.75,DR', '-8.75,DR')), 'no warning when Amount already has minus signs');
  assert(!note(DRCR.replace(/,DR\n/g, ',CR\n')), 'no warning when every row is CR (money in)');
  assert(!note('Date,Description,Amount,Type\n03/01/2026,Coffee,-4.50,DEBIT_CARD\n03/02/2026,Pay,100.00,ACH_CREDIT\n'), 'Chase-like Type values (DEBIT_CARD, ACH_CREDIT) are not taken for DR/CR');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(ui.includes('els.signWarning.textContent = tn || (sw ? sw.message : \'\');') && ui.includes('.filter((x) => !x.startsWith(TYPE_NOTE))'), 'shown in the warning slot at the top of step 3, not repeated below');
}
