/**
 * Verify suite 14 (v1.5.4): Bank of America credit card preset (sources in VERIFY-presets-v154.md),
 * detection regression over every fixture in samples/, and the scroll-to-results code path.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, detectPresetScored, PRESETS } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

/** Detected preset for every repo fixture, recorded after v1.5.4 (only bank-of-america-card.csv changed vs 9bbd214). */
const DETECTED = {"samples/ambiguous-dates.csv": "generic_bank","samples/amex.csv": "amex","samples/bank-of-america-card.csv": "bofa_card","samples/bank-of-america.csv": "bofa","samples/capital-one.csv": "capital_one","samples/chase-checking.csv": "chase","samples/chase-like-messy.csv": "generic_bank","samples/chase-like-qbo-ready.csv": "generic_bank","samples/citi.csv": "citi","samples/discover.csv": "discover","samples/etsy.csv": "etsy","samples/mercury.csv": "mercury","samples/paypal.csv": "paypal","samples/pnc.csv": "generic_bank","samples/revolut.csv": "revolut","samples/shopify-payouts-list.csv": "shopify_payouts","samples/shopify-payouts.csv": "shopify","samples/square-transfers.csv": "square_transfers","samples/square.csv": "square","samples/stripe.csv": "stripe","samples/toast.csv": "toast","samples/us-bank.csv": "us_bank","samples/venmo.csv": "venmo","samples/wells-fargo.csv": "wells_fargo","samples/wise.csv": "wise","drift/bom-spacing.csv": "generic_bank","drift/extra-columns.csv": "amex","drift/renamed-generic.csv": "generic_bank","drift/renamed-headers.csv": "capital_one","drift/reordered.csv": "chase","drift/unmappable.csv": "generic_bank","adversarial/baseline-simple.csv": "generic_bank","adversarial/bom.csv": "generic_bank","adversarial/crlf.csv": "generic_bank","adversarial/empty.csv": "generic_bank","adversarial/etsy-encodings.csv": "etsy","adversarial/etsy-pending.csv": "etsy","adversarial/eu-comma-quoted-decimal.csv": "generic_bank","adversarial/eu-semicolon-comma-decimal.csv": "generic_bank","adversarial/formula-injection.csv": "generic_bank","adversarial/header-only.csv": "generic_bank","adversarial/leak-marker.csv": "generic_bank","adversarial/long-description.csv": "generic_bank","adversarial/quoted-commas.csv": "generic_bank","adversarial/shopify-bom-chargeback.csv": "shopify","adversarial/square-encodings.csv": "square","adversarial/square-transfers-edge.csv": "square_transfers","adversarial/tab-delimited.csv": "generic_bank","adversarial/text-month-dates.csv": "generic_bank","adversarial/toast-statuses.csv": "toast","adversarial/trailing-blank-lines.csv": "generic_bank","adversarial/unparseable-amounts.csv": "generic_bank","adversarial/venmo-fees.csv": "venmo","adversarial/xss-description.csv": "generic_bank","real/beanhub-chase-card.csv": "chase","real/beanhub-citi.csv": "citi","real/beanhub-mercury.csv": "mercury","real/schola-square.csv": "square"};

export function run() {
  console.log('');
  console.log('=== v1.5.4 Bank of America credit card (samples/bank-of-america-card.csv) ===');
  const t = readSample('bank-of-america-card.csv');
  const d = detectPresetScored(t);
  const r = processCsv(t, d.id);
  const amt = (s) => (r.transactions.find((x) => x.description.includes(s)) || {}).amount;
  assert(d.id === 'bofa_card' && d.confidence === 'high', `detected as Bank of America (credit card), high (got ${d.id} ${d.confidence})`);
  assert(r.transactions.length === 7 && Math.abs(r.net - -3.34) < 0.001 && r.reconcile.status === 'N/A' && !r.leftOutRows.length, `7 rows, net -3.34, badge N/A (got ${r.transactions.length}, ${r.net}, ${r.reconcile.status})`);
  assert(amt('TAILSPIN') === -318.4 && amt('PAYMENT - THANK YOU') === 500 && amt('RETURN') === 42.18, 'charges money out (-318.40), payment +500.00 and refund +42.18 money in');
  assert(r.transactions[0].date === '03/02/2026' && r.transactions[1].description === 'CONTOSO OFFICE SUPPLY', 'Posted Date as date, Payee as description (address with a comma not merged)');
  assert(PRESETS.bofa_card.label === 'Bank of America (credit card)' && PRESETS.bofa_card.slug === 'bank-of-america', 'label and how-to slug (shares the Bank of America guide)');

  console.log('');
  console.log('=== v1.5.4 detection regression (every fixture in samples/) ===');
  const bad = [];
  for (const [k, want] of Object.entries(DETECTED)) {
    const [dir, f] = k.split('/');
    const p = join(ROOT, 'samples', dir === 'samples' ? '' : dir, f);
    const got = detectPreset(decodeBytes(new Uint8Array(readFileSync(p))).text);
    if (got !== want) bad.push(`${k}: ${got} (want ${want})`);
  }
  const all = ['', 'drift', 'adversarial', 'real'].flatMap((d) => readdirSync(join(ROOT, 'samples', d)).filter((f) => f.endsWith('.csv')).map((f) => `${d || 'samples'}/${f}`));
  assert(!bad.length && all.length >= Object.keys(DETECTED).length, `all ${Object.keys(DETECTED).length} fixtures recorded at v1.5.4 still detect the same (${bad.join('; ') || 'ok'})`);

  console.log('');
  console.log('=== v1.5.4 scroll to results ===');
  const ui = readFileSync(join(ROOT, 'ui.mjs'), 'utf8');
  const app = readFileSync(join(ROOT, 'app.js'), 'utf8');
  const idx = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert(idx.includes('<h2 id="resultsHeading" tabindex="-1">'), 'results heading can take focus (tabindex -1)');
  assert(/prefers-reduced-motion: reduce/.test(ui) && /behavior: reduce \? 'auto' : 'smooth'/.test(ui) && /box\.top >= 0 && box\.bottom <= window\.innerHeight\) return/.test(ui), 'smooth unless reduced motion; no scroll when already visible');
  assert(/if \(reveal && r\.transactions\.length && allowed\) revealResults/.test(app) && /reprocess\(\{ reveal: true, focus: false \}\)/.test(app), 'no scroll when the message is the top banner; preset change scrolls but keeps focus on the list');
}
