/**
 * Verify suite 18 (v1.5.8): usefulness prompt (useful.mjs) after a download.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { USEFUL_KEY, wasAsked, markAsked, usefulEvent, sendUseful } from './useful.mjs';
import { assert, ROOT } from './verify-lib.mjs';

const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

export function run() {
  console.log('');
  console.log('=== v1.5.8 usefulness prompt ===');
  const ev = usefulEvent('yes', 'index');
  assert(JSON.stringify(ev) === JSON.stringify({ path: 'useful-yes/index', title: 'Useful: yes', event: true }), 'Yes event: path useful-yes/index, title "Useful: yes", event true');
  assert(usefulEvent('no', 'index').path === 'useful-no/index', 'No event: path useful-no/index');
  const calls = [];
  assert(sendUseful('yes', 'index', { count: (v) => calls.push(v) }) === true && calls.length === 1 && calls[0].path === 'useful-yes/index', 'sent through goatcounter.count when it is there');
  assert(sendUseful('yes', 'index', undefined) === false && sendUseful('no', 'index', {}) === false && sendUseful('no', 'index', { count: 'x' }) === false, 'GoatCounter missing or blocked: skipped silently, no throw');
  assert(sendUseful('no', 'index', { count() { throw new Error('x'); } }) === false, 'a throwing count() is swallowed');
  const st = memStore();
  assert(!wasAsked(st), 'fresh visit: not asked yet');
  markAsked(st);
  assert(wasAsked(st) && st.getItem(USEFUL_KEY) === '1' && USEFUL_KEY === 'qbofixer-useful-asked', 'after showing once: asked (sessionStorage key qbofixer-useful-asked)');
  let ok = true;
  try { markAsked(throwing); ok = wasAsked(throwing) === false; } catch { ok = false; }
  assert(ok, 'sessionStorage throwing (private mode): no error');

  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const app = readFileSync(join(ROOT, 'app.js'), 'utf8');
  const src = readFileSync(join(ROOT, 'useful.mjs'), 'utf8');
  assert(/id="downloadBtn"[^\n]*\n\s*<span id="useful" class="useful hidden">Was this useful\? <button type="button" id="usefulYes">Yes<\/button> <button type="button" id="usefulNo">No<\/button><\/span>/.test(html), 'markup: hidden inline prompt right next to the Download button, real buttons');
  assert(/<p id="usefulThanks" class="hint" aria-live="polite"><\/p>/.test(html) && src.includes("'Thanks, that helps.'"), 'thanks line in an aria-live polite region');
  assert(/saveBlob\([^\n]*\);\n\s*offerUseful\(\);\n\}/.test(app) && app.includes("setupUseful('index')"), 'prompt offered only after a download (end of downloadExport)');
  assert(!/document\.cookie|localStorage|fetch\(|XMLHttpRequest|<dialog|alert\(/.test(src), 'no cookies, no localStorage, no own network calls, no modal');
  assert(html.includes('<script data-goatcounter="https://qbofixer.goatcounter.com/count"\n          async src="//gc.zgo.at/count.js"></script>'), 'GoatCounter snippet unchanged');
}
