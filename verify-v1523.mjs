/** v1.5.23: the free-limit sentence shows once, in the note next to Download. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assert, ROOT } from './verify-lib.mjs';

export function run() {
  console.log('');
  console.log('=== v1.5.23 free-limit sentence once ===');
  const app = readFileSync(join(ROOT, 'app.js'), 'utf8');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(!/free version converts up to/.test(app), 'app.js no longer puts the free-limit sentence in the red banner');
  assert(ui.includes('this file has ${n} rows and the free version converts up to ${FREE_ROW_LIMIT}, so Download is off. Download a shorter date range from your bank and convert each part. Unlimited version coming soon.'), 'the note next to Download keeps every part: row count, limit, Download off, what to do, unlimited version');
  assert(/if \(reveal && r\.transactions\.length\) revealResults/.test(app), 'over-limit files scroll to step 3, where the note is');
  assert(app.length < 10000 && ui.length < 10000, `app.js (${app.length}) and ui.mjs (${ui.length}) are under 10,000 bytes`);
  assert(/import { setupSampleButton(, loadDemoFromUrl)? } from '.\/samplebtn.mjs';/.test(app) && app.includes('setupSampleButton(loadText);'), 'sample button moved to samplebtn.mjs');
}
