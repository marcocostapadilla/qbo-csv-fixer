/** v1.5.21: ui.mjs split (warnings.mjs, bankline.mjs) and the messy-sample line in step 3. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bankLine, MESSY_SAMPLE } from './bankline.mjs';
import { PRESETS } from './presets.mjs';
import { assert, ROOT } from './verify-lib.mjs';

export function run() {
  console.log('');
  console.log('=== v1.5.21 ui split and messy-sample line ===');
  for (const f of ['ui.mjs', 'warnings.mjs', 'bankline.mjs', 'app.js']) assert(readFileSync(join(ROOT, f)).length < 10240, `${f} is under 10 KB`);
  assert(readFileSync(join(ROOT, 'ui.mjs')).length < 10000, 'ui.mjs is under 10,000 bytes after the split');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(ui.includes("from './warnings.mjs'") && ui.includes('renderDateWarning(els, r)') && ui.includes('bankLine(o, els.detectNote.textContent, els.fileName.textContent)'), 'ui.mjs uses warnings.mjs and bankline.mjs');
  const gen = { value: 'generic_bank', textContent: PRESETS.generic_bank.label };
  assert(MESSY_SAMPLE === PRESETS.generic_bank.sample.split('/').pop() + ' (sample)', 'messy-sample label matches the general-layout sample file the button loads');
  const s = bankLine(gen, '', MESSY_SAMPLE);
  assert(s.startsWith('This is the general-layout sample, made messy on purpose') && s.includes('the badge says FAIL') && !s.includes('Bank not recognized'), 'general-layout sample: step 3 says the FAIL is on purpose');
  assert(bankLine(gen, '', 'my-bank.csv').startsWith('Bank not recognized'), 'a real file read with the general layout still says Bank not recognized');
  assert(bankLine(gen, 'Could not tell. Closest match: Ally. Check the preview against your statement before you pick it.', 'x.csv').includes('Closest match: Ally.'), 'closest-match names still repeat in step 3');
  assert(bankLine({ value: 'chase', textContent: 'Chase' }, '', MESSY_SAMPLE).startsWith('Read as: Chase.'), 'a picked bank keeps the Read as line');
}
