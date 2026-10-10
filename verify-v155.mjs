/**
 * Verify suite 15 (v1.5.5): Navy Federal and Apple Card presets, Amex extended layout,
 * real MIT/Apache fixtures (samples/real/LICENSES.md), detection regression over every fixture.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, detectPresetScored } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

/** Detected preset for every repo fixture after v1.5.5 (changes vs bf64370: the 3 new fixtures and 3 real files). */
const DETECTED = {"real/minance-apple-card.csv": "apple_card","real/minance-amex.csv": "amex","real/imid12-navy-federal.csv": "navy_federal","samples/ambiguous-dates.csv": "generic_bank","samples/amex.csv": "amex","samples/apple-card.csv": "apple_card","samples/bank-of-america-card.csv": "bofa_card","samples/bank-of-america.csv": "bofa","samples/capital-one.csv": "capital_one","samples/chase-checking.csv": "chase","samples/chase-like-messy.csv": "generic_bank","samples/chase-like-qbo-ready.csv": "generic_bank","samples/citi.csv": "citi","samples/discover.csv": "discover","samples/etsy.csv": "etsy","samples/mercury.csv": "mercury","samples/navy-federal.csv": "navy_federal","samples/paypal.csv": "paypal","samples/pnc.csv": "generic_bank","samples/revolut.csv": "revolut","samples/shopify-payouts-list.csv": "shopify_payouts","samples/shopify-payouts.csv": "shopify","samples/square-transfers.csv": "square_transfers","samples/square.csv": "square","samples/stripe.csv": "stripe","samples/toast.csv": "toast","samples/us-bank.csv": "us_bank","samples/venmo.csv": "venmo","samples/wells-fargo.csv": "wells_fargo","samples/wise.csv": "wise","drift/amex-extended.csv": "amex","drift/bom-spacing.csv": "generic_bank","drift/extra-columns.csv": "amex","drift/renamed-generic.csv": "generic_bank","drift/renamed-headers.csv": "capital_one","drift/reordered.csv": "chase","drift/unmappable.csv": "generic_bank","adversarial/baseline-simple.csv": "generic_bank","adversarial/bom.csv": "generic_bank","adversarial/crlf.csv": "generic_bank","adversarial/empty.csv": "generic_bank","adversarial/etsy-encodings.csv": "etsy","adversarial/etsy-pending.csv": "etsy","adversarial/eu-comma-quoted-decimal.csv": "generic_bank","adversarial/eu-semicolon-comma-decimal.csv": "generic_bank","adversarial/formula-injection.csv": "generic_bank","adversarial/header-only.csv": "generic_bank","adversarial/leak-marker.csv": "generic_bank","adversarial/long-description.csv": "generic_bank","adversarial/quoted-commas.csv": "generic_bank","adversarial/shopify-bom-chargeback.csv": "shopify","adversarial/square-encodings.csv": "square","adversarial/square-transfers-edge.csv": "square_transfers","adversarial/tab-delimited.csv": "generic_bank","adversarial/text-month-dates.csv": "generic_bank","adversarial/toast-statuses.csv": "toast","adversarial/trailing-blank-lines.csv": "generic_bank","adversarial/unparseable-amounts.csv": "generic_bank","adversarial/venmo-fees.csv": "venmo","adversarial/xss-description.csv": "generic_bank","real/beanhub-chase-card.csv": "chase","real/beanhub-citi.csv": "citi","real/beanhub-mercury.csv": "mercury","real/schola-square.csv": "square"};

const CASES = [
  // file, preset, rows, net, amounts by description part
  ['navy-federal.csv', 'navy_federal', 7, 24.93, { 'NORTHWIND COFFEE': -4.85, PAYROLL: 2450, REFUND: 18.4, TAILSPIN: -1025.5 }],
  ['apple-card.csv', 'apple_card', 6, 164.86, { 'NORTHWIND COFFEE': -6.4, 'ACH DEPOSIT': 300, 'DAILY CASH': 1.25 }],
  ['drift/amex-extended.csv', 'amex', 4, 302.87, { 'NORTHWIND COFFEE': -6.75, AUTOPAY: 500 }],
  ['real/minance-apple-card.csv', 'apple_card', 8, -239.99, { 'CY CHINESE': -120, 'ACH DEPOSIT': 37.99 }],
  ['real/minance-amex.csv', 'amex', 8, -221.31, { AUTOPAY: 125.25, 'FOODTOWN': -81.35 }],
  ['real/imid12-navy-federal.csv', 'navy_federal', 10, 25.67, { Kroger: -5.28 }],
];

export function run() {
  console.log('');
  console.log('=== v1.5.5 Navy Federal, Apple Card, Amex extended ===');
  for (const [file, preset, rows, net, amts] of CASES) {
    const t = readSample(file);
    const d = detectPresetScored(t);
    const r = processCsv(t, d.id);
    const bad = Object.entries(amts).filter(([k, v]) => (r.transactions.find((x) => x.description.includes(k)) || {}).amount !== v);
    assert(d.id === preset && d.confidence === 'high' && r.transactions.length === rows && Math.abs(r.net - net) < 0.001 && !r.leftOutRows.length && !bad.length,
      `${file}: ${preset} high, ${rows} rows, net ${net}, signs ok (got ${d.id} ${d.confidence}, ${r.transactions.length}, ${r.net}, wrong ${bad.map((b) => b[0]).join(',') || 'none'})`);
  }
  const nf = processCsv(readSample('navy-federal.csv').replace('18.40,Credit', '18.40,Pending'), 'navy_federal');
  assert(nf.transactions.length === 6 && nf.leftOutRows.map((x) => `${x.sourceRow}:${x.reason}`).join() === '6:missing amount', `Navy Federal: an unknown indicator is never guessed; the row is left out and listed (got ${JSON.stringify(nf.leftOutRows.map((x) => x.reason))})`);
  assert(processCsv(readSample('navy-federal.csv'), 'navy_federal').transactions[0].date === '03/02/2026', 'Navy Federal uses Posting Date');

  console.log('');
  console.log('=== v1.5.5 detection regression (every fixture in samples/) ===');
  const bad = [];
  for (const [k, want] of Object.entries(DETECTED)) {
    const [dir, f] = k.split('/');
    const got = detectPreset(decodeBytes(new Uint8Array(readFileSync(join(ROOT, 'samples', dir === 'samples' ? '' : dir, f)))).text);
    if (got !== want) bad.push(`${k}: ${got} (want ${want})`);
  }
  const all = ['', 'drift', 'adversarial', 'real'].flatMap((d) => readdirSync(join(ROOT, 'samples', d)).filter((f) => f.endsWith('.csv')).map((f) => `${d || 'samples'}/${f}`));
  assert(!bad.length && all.every((k) => k in DETECTED), `all ${all.length} fixtures detect as recorded (${bad.join('; ') || 'ok'})`);

  console.log('');
  console.log('=== v1.5.5 360 px first-visit fixes ===');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  assert(html.indexOf('id="downloadBtn"') < html.indexOf('class="table-wrap"') && html.indexOf('id="tierNote"') < html.indexOf('class="table-wrap"'), 'index: Download button and free-version note sit above the preview table');
  assert(/<h2 id="resultsHeading"[^>]*>3\. Check, then download<\/h2>\s*<p id="resultsBank"/.test(html) && ui.includes('Bank not recognized, so the file was read with the general layout') && ui.includes('Wrong bank? Pick another in step 2 above.'), 'step 3 says which bank was used (or that none was recognized) right under its heading');
  assert(/button, \.btn, label\.field select, \.date-toggle label \{ min-height: 44px; \}/.test(css) && /footer a, \.guide-links a, \.samples a, \.breadcrumb a \{[^}]*min-height: 44px/.test(css), 'styles: buttons, selects, date choices and list links are at least 44 px tall');
}
