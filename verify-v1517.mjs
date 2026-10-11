/**
 * Verify suite 27 (v1.5.17): wrong-preset message, closest-match wording, encoding/delimiter pass.
 * Fixtures: samples/adversarial/v1517 (UTF-8); variants are built by adv1517.mjs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { sniffDelimiter } from './parse.mjs';
import { detectionNote, detectPresetScored } from './detect.mjs';
import { presetMismatch } from './wrongpreset.mjs';
import { VARIANTS, rowsOf } from './adv1517.mjs';
import { assert, ROOT } from './verify-lib.mjs';

const EXPECT = {
  'bank-of-america.csv': ['bofa', 7, 1488.53, 'PASS', '02/02/2026'],
  'capital-one.csv': ['capital_one', 6, 452.26, 'N/A', '03/02/2026'],
  'chase-checking.csv': ['chase', 6, 1760, 'PASS', '01/16/2026'],
  'revolut.csv': ['revolut', 6, 313.34, 'PASS', '01/02/2026'],
  'wells-fargo.csv': ['wells_fargo', 6, 930.8, 'N/A', '01/02/2026'],
  'wise.csv': ['wise', 5, 821.11, 'PASS', '02/27/2026'],
};
const DRCR = 'Date,Details,Amount,Type\n03/27/2026,ACME PAYROLL,1850.00,CR\n03/25/2026,CORNER CAFE,8.75,DR\n03/24/2026,GROCERS,86.14,DR\n';

export function run() {
  console.log('');
  console.log('=== v1.5.17 encoding / delimiter matrix (6 documented formats x 10 variants) ===');
  for (const [f, [id, n, net, badge, d0]] of Object.entries(EXPECT)) {
    const base = readFileSync(join(ROOT, 'samples/adversarial/v1517', f), 'utf8');
    const ok = [];
    for (const [v, make] of Object.entries(VARIANTS)) {
      const t = decodeBytes(new Uint8Array(make(base))).text;
      const r = processCsv(t, detectPreset(t) || 'generic_bank');
      if (detectPreset(t) === id && r.transactions.length === n && r.net === net && r.reconcile.status === badge
        && r.transactions[0].date === d0 && r.transactions.some((x) => /Café\r?\nRef 2/.test(x.description))) ok.push(v);
      else console.log(`    ${f} / ${v}: ${detectPreset(t)} ${r.transactions.length} ${r.net} ${r.reconcile.status}`);
    }
    assert(ok.length === 10, `${f}: ${id}, ${n} rows, net ${net}, ${badge}, dates and the quoted "Café" newline+comma cell in all 10 variants`);
  }
  const boSemi = VARIANTS.semicolon(readFileSync(join(ROOT, 'samples/adversarial/v1517/bank-of-america.csv'), 'utf8')).toString();
  assert(sniffDelimiter(boSemi) === ';' && rowsOf('a,"1,2"\n').length === 1, 'semicolon file with 3,410.22 amounts in its summary block is read as semicolon (was comma)');
  assert(sniffDelimiter('Date,Description,Amount\n01/02/2026,"Coffee; to go",-4.50\n') === ',', 'comma file with a semicolon inside a quoted cell stays comma');

  console.log('');
  console.log('=== v1.5.17 wrong preset, closest-match wording ===');
  const c360 = processCsv(DRCR, 'capital_one_360');
  assert(presetMismatch(c360, 'capital_one_360') === 'Capital One 360 (checking or savings) can\'t read this file: it needs the column(s) "Transaction Amount", which this file doesn\'t have. Try "General layout (any bank)" in the list, or the bank the file came from.', 'Capital One 360 on a DR/CR file: plain message naming the missing column');
  assert(/^Venmo .*can't read this file: it needs the column\(s\) "Amount \(Total\)"/.test(presetMismatch(processCsv(DRCR, 'venmo'), 'venmo') || ''), 'Venmo (required column missing) names it too');
  assert(presetMismatch(processCsv(DRCR, 'generic_bank'), 'generic_bank') === null, 'the general layout never gets this message');
  const chase = readFileSync(join(ROOT, 'samples/chase-checking.csv'), 'utf8');
  assert(presetMismatch(processCsv(chase, 'chase'), 'chase') === null, 'the right preset: no message');
  const note = detectionNote(detectPresetScored('Date,Description,Amount,Balance\n03/27/2026,Pay,1850.00,2410.55\n03/25/2026,Cafe,-8.75,560.55\n'));
  assert(/^Could not tell which bank this file is from, so the general layout is used\. Closest match: [^.%]+ or [^.%]+\. Check the preview against your statement before you pick it\.$/.test(note) && !/%|header match/.test(note), `closest match lists up to 2 names, no percentages (${note})`);
  const app = readFileSync(join(ROOT, 'app.js'), 'utf8');
  const wu = readFileSync(join(ROOT, 'wrongui.mjs'), 'utf8');
  assert(app.includes('const wrong = presetMismatch(r, processorId);') && /if \(wrong\) \{\s*setDetectNote\(''\);\s*showError\(wrong\);\s*hideResults\(\);\s*return;/.test(app), 'UI: wrong preset shows the message and hides the old result');
  assert(wu.includes("btn.type = 'button'") && wu.includes("select.value = 'generic_bank'") && wu.includes("insertAdjacentElement('afterend'"), 'UI: one real button switches the select to the general layout');
  assert(wu.includes("scrollIntoView({ block: 'start' })") && !/\.focus\(/.test(wu), 'UI: the message scrolls into view on a phone; focus is not moved');
}
