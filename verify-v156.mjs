/**
 * Verify suite 16 (v1.5.6): sign-sanity warning (signcheck.mjs), Ally and Cash App presets,
 * detection regression over every fixture.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, detectPresetScored } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { signCheck, SIGN_MESSAGES, SIGN_KIND } from './signcheck.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

const DETECTED = {"samples/ally.csv": "ally","samples/ambiguous-dates.csv": "generic_bank","samples/amex.csv": "amex","samples/apple-card.csv": "apple_card","samples/bank-of-america-card.csv": "bofa_card","samples/bank-of-america.csv": "bofa","samples/capital-one.csv": "capital_one","samples/cash-app.csv": "cash_app","samples/chase-checking.csv": "chase","samples/chase-like-messy.csv": "generic_bank","samples/chase-like-qbo-ready.csv": "generic_bank","samples/citi.csv": "citi","samples/discover.csv": "discover","samples/etsy.csv": "etsy","samples/mercury.csv": "mercury","samples/navy-federal.csv": "navy_federal","samples/paypal.csv": "paypal","samples/pnc.csv": "generic_bank","samples/revolut.csv": "revolut","samples/shopify-payouts-list.csv": "shopify_payouts","samples/shopify-payouts.csv": "shopify","samples/square-transfers.csv": "square_transfers","samples/square.csv": "square","samples/stripe.csv": "stripe","samples/toast.csv": "toast","samples/us-bank.csv": "us_bank","samples/venmo.csv": "venmo","samples/wells-fargo.csv": "wells_fargo","samples/wise.csv": "wise","drift/amex-extended.csv": "amex","drift/bom-spacing.csv": "generic_bank","drift/extra-columns.csv": "amex","drift/renamed-generic.csv": "generic_bank","drift/renamed-headers.csv": "capital_one","drift/reordered.csv": "chase","drift/unmappable.csv": "generic_bank","adversarial/baseline-simple.csv": "generic_bank","adversarial/bom.csv": "generic_bank","adversarial/crlf.csv": "generic_bank","adversarial/empty.csv": "generic_bank","adversarial/etsy-encodings.csv": "etsy","adversarial/etsy-pending.csv": "etsy","adversarial/eu-comma-quoted-decimal.csv": "generic_bank","adversarial/eu-semicolon-comma-decimal.csv": "generic_bank","adversarial/formula-injection.csv": "generic_bank","adversarial/header-only.csv": "generic_bank","adversarial/leak-marker.csv": "generic_bank","adversarial/long-description.csv": "generic_bank","adversarial/quoted-commas.csv": "generic_bank","adversarial/shopify-bom-chargeback.csv": "shopify","adversarial/square-encodings.csv": "square","adversarial/square-transfers-edge.csv": "square_transfers","adversarial/tab-delimited.csv": "generic_bank","adversarial/text-month-dates.csv": "generic_bank","adversarial/toast-statuses.csv": "toast","adversarial/trailing-blank-lines.csv": "generic_bank","adversarial/unparseable-amounts.csv": "generic_bank","adversarial/venmo-fees.csv": "venmo","adversarial/xss-description.csv": "generic_bank","real/beanhub-chase-card.csv": "chase","real/beanhub-citi.csv": "citi","real/beanhub-mercury.csv": "mercury","real/imid12-navy-federal.csv": "navy_federal","real/minance-amex.csv": "amex","real/minance-apple-card.csv": "apple_card","real/minance-cash-app.csv": "cash_app","real/schola-square.csv": "square"};

/** Old-build misreads: [fixture, wrong preset (what v1.5.4 picked), right preset, expected rule]. */
const OLD_MISREADS = [
  ['real/imid12-navy-federal.csv', 'chase', 'navy_federal', 'all-positive'],
  ['navy-federal.csv', 'chase', 'navy_federal', 'all-positive'],
  ['real/minance-apple-card.csv', 'generic_bank', 'apple_card', 'inverted'],
  ['apple-card.csv', 'generic_bank', 'apple_card', 'inverted'],
  ['real/minance-amex.csv', 'generic_bank', 'amex', 'inverted'],
  ['drift/amex-extended.csv', 'generic_bank', 'amex', 'inverted'],
];

const allFixtures = () => ['', 'drift', 'adversarial', 'real'].flatMap((d) => readdirSync(join(ROOT, 'samples', d)).filter((f) => f.endsWith('.csv')).map((f) => `${d || 'samples'}/${f}`));
const textOf = (k) => { const [d, f] = k.split('/'); return decodeBytes(new Uint8Array(readFileSync(join(ROOT, 'samples', d === 'samples' ? '' : d, f)))).text; };
const check = (id, r) => signCheck(id, r.transactions, r.reconcile.status);

export function run() {
  console.log('');
  console.log('=== v1.5.6 sign-sanity warning ===');
  for (const [file, wrong, right, rule] of OLD_MISREADS) {
    const t = readSample(file);
    const a = processCsv(t, wrong), b = processCsv(t, right);
    const wa = check(wrong, a), wb = check(right, b);
    assert(wa && wa.rule === rule && wa.message === SIGN_MESSAGES[rule], `${file} read as ${wrong} (old build): warning "${rule}" (got ${wa ? wa.rule : 'none'})`);
    assert(!wb, `${file} read as ${right}: no warning (got ${wb ? wb.rule : 'none'})`);
    assert(a.transactions.map((x) => x.amount).join() === processCsv(t, wrong).transactions.map((x) => x.amount).join(), `${file}: the check never changes a sign`);
  }
  const hits = [], seen = {};
  for (const k of allFixtures()) {
    const t = textOf(k), id = detectPreset(t);
    let r; try { r = processCsv(t, id); } catch { continue; }
    seen[r.reconcile.status] = (seen[r.reconcile.status] || 0) + 1;
    if (check(id, r)) hits.push(`${k} (${id})`);
  }
  assert(!hits.length, `false positives: every fixture through its detected preset, 0 warnings (${JSON.stringify(seen)}; hits: ${hits.join(', ') || 'none'})`);
  // PASS / FAIL / INCOMPLETE never warn, even with an all-positive file.
  const allPos = [{ description: 'A', amount: 5 }, { description: 'B', amount: 6 }, { description: 'C', amount: 7 }];
  for (const st of ['PASS', 'FAIL', 'INCOMPLETE']) assert(signCheck('chase', allPos, st) === null, `badge ${st}: never warns`);
  assert(signCheck('chase', allPos, 'N/A')?.rule === 'all-positive', 'badge N/A, 3 positive rows on a bank layout: warns');
  assert(signCheck('chase', allPos.slice(0, 2), 'N/A') === null, 'fewer than 3 rows: no warning');
  for (const id of ['square', 'shopify', 'toast', 'etsy', 'stripe', 'paypal', 'venmo', 'square_transfers', 'shopify_payouts']) assert(!SIGN_KIND[id] && signCheck(id, allPos, 'N/A') === null, `${id}: one-way files are normal, no check`);
  const pass = processCsv(readSample('bank-of-america.csv'), 'bofa');
  assert(pass.reconcile.status === 'PASS' && !check('bofa', pass), 'a PASS file (Bank of America sample) shows no warning');
  assert(Object.values(SIGN_MESSAGES).every((m) => m.split('. ').length === 2 && !m.includes('\u2014') && m.includes('pick your bank in step 2 above')), 'messages: 2 sentences, point to the bank list, no em dash');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8'), ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(/<p id="resultsBank"[^>]*><\/p>\s*<p id="signWarning" class="date-warning hidden" role="alert">/.test(html) && ui.includes("els.signWarning.classList.toggle('hidden', !sw)") && !/downloadBtn[^\n]*sw/.test(ui), 'UI: warning sits under "Read as:" at the top of step 3 and never blocks the download');

  console.log('');
  console.log('=== v1.5.6 Ally and Cash App ===');
  for (const [file, preset, rows, net, first] of [
    ['ally.csv', 'ally', 7, 483.32, '03/20/2026'],
    ['cash-app.csv', 'cash_app', 6, -722.05, '03/20/2026'],
    ['real/minance-cash-app.csv', 'cash_app', 8, -308.85, '06/07/2023'],
  ]) {
    const t = readSample(file), d = detectPresetScored(t), r = processCsv(t, d.id);
    assert(d.id === preset && d.confidence === 'high' && r.transactions.length === rows && Math.abs(r.net - net) < 0.001 && r.transactions[0].date === first && !r.leftOutRows.length,
      `${file}: ${preset} high, ${rows} rows, net ${net}, first date ${first} (got ${d.id} ${d.confidence}, ${r.transactions.length}, ${r.net}, ${r.transactions[0] && r.transactions[0].date})`);
  }
  const ca = processCsv(readSample('cash-app.csv'), 'cash_app');
  assert(ca.transactions.some((x) => x.amount === 98.25 && x.description === 'Cash Out | Instant deposit') && ca.skippedRows.length === 1, 'Cash App: Net Amount (after fee), Type | Notes | Name, FAILED row skipped');

  console.log('');
  console.log('=== v1.5.6 detection regression (every fixture in samples/) ===');
  const bad = Object.entries(DETECTED).filter(([k, want]) => detectPreset(textOf(k)) !== want).map(([k]) => k);
  const all = allFixtures();
  assert(!bad.length && all.every((k) => k in DETECTED), `all ${all.length} fixtures detect as recorded (${bad.join('; ') || 'ok'})`);
}
