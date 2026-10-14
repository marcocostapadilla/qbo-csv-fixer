/** v1.5.24: sign fix demo (sign-fix-demo.html). Every number on the page comes from the real code. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, fmtMoney } from './core.mjs';
import { assert, ROOT } from './verify-lib.mjs';

const read = (f) => readFileSync(join(ROOT, f), 'utf8');

export function run() {
  console.log('');
  console.log('=== v1.5.24 sign fix demo ===');
  const page = read('sign-fix-demo.html');
  const res = {};
  for (const k of ['before', 'after']) {
    const t = read(`samples/demo/sign-fix-${k}.csv`);
    const p = detectPreset(t) || 'generic_bank';
    res[k] = processCsv(t, p);
    const shown = [...page.matchAll(new RegExp(`<table id="demo${k[0].toUpperCase() + k.slice(1)}">(.*?)</table>`, 'g'))][0][1];
    const amts = [...shown.matchAll(/<td class="num[^"]*">([^<]+)<\/td>/g)].map((m) => m[1]).join('|');
    assert(amts === res[k].transactions.map((x) => x.amount.toFixed(2)).join('|'), `${k}: table amounts match the tool (${amts})`);
  }
  const b = res.before, a = res.after;
  assert(b.reconcile.status === 'FAIL' && b.opening === 1500 && b.closing === 2087.45 && Math.abs(b.net - 4296.75) < 0.005 && Math.abs(b.reconcile.delta + 3709.3) < 0.005, 'before: net 4296.75, FAIL, off by -3709.30');
  assert(page.includes(`Net change ${fmtMoney(b.net)}. Reconcile: FAIL.`) && page.includes(`is ${fmtMoney(b.reconcile.expectedClosing)}, but the file's ending balance is ${fmtMoney(b.closing)} (off by ${fmtMoney(b.reconcile.delta)})`), 'before: page text uses the real numbers');
  assert(a.reconcile.status === 'PASS' && a.opening === 1500 && a.closing === 2087.45 && Math.abs(a.net - 587.45) < 0.005, 'after: net 587.45, PASS');
  assert(page.includes(`Net change ${fmtMoney(a.net)}. Reconcile: PASS.`) && page.includes(`ending balance (${fmtMoney(a.closing)})`), 'after: page text uses the real numbers');
  assert(page.includes('never flips signs on its own') && !page.includes('\u2014'), 'page says the tool never flips signs; no em dash');
  assert(read('index.html').includes('<a href="sign-fix-demo.html">Sign fix demo</a>') && read('sitemap.xml').includes('sign-fix-demo.html'), 'linked from index and in the sitemap');
  const sb = read('samplebtn.mjs');
  assert(sb.includes("export const DEMOS = ['sign-fix-before', 'sign-fix-after'];") && read('app.js').includes('loadDemoFromUrl(loadText);'), '?demo= loads only the two example files');
  for (const f of ['index.html', 'sign-fix-demo.html', 'app.js', 'samplebtn.mjs']) assert(read(f).length <= 10240, `${f} is 10 KB or less`);
}
