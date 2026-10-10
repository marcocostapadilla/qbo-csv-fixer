/**
 * Verify suite 17 (v1.5.7): SoFi preset (balances from Current balance), Ally / Cash App / SoFi guides,
 * detection regression over every fixture.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, detectPresetScored } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { assert, readSample, ROOT } from './verify-lib.mjs';

const DETECTED = {"samples/ally.csv": "ally","samples/ambiguous-dates.csv": "generic_bank","samples/amex.csv": "amex","samples/apple-card.csv": "apple_card","samples/bank-of-america-card.csv": "bofa_card","samples/bank-of-america.csv": "bofa","samples/capital-one.csv": "capital_one","samples/capital-one-360.csv": "capital_one_360","samples/td-bank.csv": "td_bank","samples/usaa.csv": "usaa","samples/cash-app.csv": "cash_app","samples/chase-checking.csv": "chase","samples/chase-like-messy.csv": "generic_bank","samples/chase-like-qbo-ready.csv": "generic_bank","samples/citi.csv": "citi","samples/discover.csv": "discover","samples/etsy.csv": "etsy","samples/mercury.csv": "mercury","samples/navy-federal.csv": "navy_federal","samples/paypal.csv": "paypal","samples/pnc.csv": "generic_bank","samples/revolut.csv": "revolut","samples/shopify-payouts-list.csv": "shopify_payouts","samples/shopify-payouts.csv": "shopify","samples/sofi.csv": "sofi","samples/square-transfers.csv": "square_transfers","samples/square.csv": "square","samples/stripe.csv": "stripe","samples/toast.csv": "toast","samples/us-bank.csv": "us_bank","samples/venmo.csv": "venmo","samples/wells-fargo.csv": "wells_fargo","samples/wise.csv": "wise","drift/amex-extended.csv": "amex","drift/bom-spacing.csv": "generic_bank","drift/extra-columns.csv": "amex","drift/renamed-generic.csv": "generic_bank","drift/renamed-headers.csv": "capital_one","drift/reordered.csv": "chase","drift/unmappable.csv": "generic_bank","adversarial/baseline-simple.csv": "generic_bank","adversarial/bom.csv": "generic_bank","adversarial/crlf.csv": "generic_bank","adversarial/empty.csv": "generic_bank","adversarial/etsy-encodings.csv": "etsy","adversarial/etsy-pending.csv": "etsy","adversarial/eu-comma-quoted-decimal.csv": "generic_bank","adversarial/eu-semicolon-comma-decimal.csv": "generic_bank","adversarial/formula-injection.csv": "generic_bank","adversarial/header-only.csv": "generic_bank","adversarial/leak-marker.csv": "generic_bank","adversarial/long-description.csv": "generic_bank","adversarial/quoted-commas.csv": "generic_bank","adversarial/shopify-bom-chargeback.csv": "shopify","adversarial/square-encodings.csv": "square","adversarial/square-transfers-edge.csv": "square_transfers","adversarial/tab-delimited.csv": "generic_bank","adversarial/text-month-dates.csv": "generic_bank","adversarial/toast-statuses.csv": "toast","adversarial/trailing-blank-lines.csv": "generic_bank","adversarial/unparseable-amounts.csv": "generic_bank","adversarial/venmo-fees.csv": "venmo","adversarial/xss-description.csv": "generic_bank","real/beanhub-chase-card.csv": "chase","real/beanhub-citi.csv": "citi","real/beanhub-mercury.csv": "mercury","real/imid12-navy-federal.csv": "navy_federal","real/minance-amex.csv": "amex","real/minance-apple-card.csv": "apple_card","real/minance-cash-app.csv": "cash_app","real/schola-square.csv": "square"};
const GUIDES = ['ally', 'cash-app', 'sofi'];

export function run() {
  console.log('');
  console.log('=== v1.5.7 SoFi (balances from Current balance) ===');
  const t = readSample('sofi.csv');
  const d = detectPresetScored(t);
  const r = processCsv(t, d.id);
  assert(d.id === 'sofi' && d.confidence === 'high', `sofi.csv detects as sofi (got ${d.id} ${d.confidence})`);
  assert(r.transactions.length === 6 && r.skippedRows.length === 1 && r.opening === 1903 && r.closing === 3311.14 && r.net === 1408.14 && r.reconcile.status === 'PASS',
    `newest first: opening 1903.00 (oldest balance minus its amount), closing 3311.14, net 1408.14, PASS, pending row skipped (got ${r.opening}, ${r.closing}, ${r.net}, ${r.reconcile.status})`);
  const lines = t.trim().split('\n');
  const cut = processCsv(lines.filter((_, i) => i !== 4).join('\n'), 'sofi');
  assert(cut.reconcile.status === 'FAIL' && cut.reconcile.delta === -40, `a removed middle row (Zelle -40.00) gives FAIL with delta -40 (got ${cut.reconcile.status} ${cut.reconcile.delta})`);
  const asc = processCsv([lines[0], ...lines.slice(1).reverse()].join('\n'), 'sofi');
  assert(asc.reconcile.status === 'PASS' && asc.opening === 1903 && asc.closing === 3311.14, `oldest-first order is read from the balances: same opening, closing, PASS (got ${asc.opening}, ${asc.closing}, ${asc.reconcile.status})`);
  const nob = processCsv(t.replace(/,\d+\.\d\d,Posted/g, ',,Posted'), 'sofi');
  assert(nob.reconcile.status === 'N/A', `no balances in the column: badge N/A, never a fake PASS (got ${nob.reconcile.status})`);

  console.log('');
  console.log('=== v1.5.7 guides: Ally, Cash App, SoFi ===');
  const footer = (h) => (h.match(/      <p>All guides: .*?<\/p>/) || [''])[0];
  const ref = footer(readFileSync(join(ROOT, 'chase-csv-to-quickbooks-online.html'), 'utf8'));
  for (const g of GUIDES) {
    const h = readFileSync(join(ROOT, `${g}-csv-to-quickbooks-online.html`), 'utf8');
    const preset = { ally: 'ally', 'cash-app': 'cash_app', sofi: 'sofi' }[g];
    assert(h.includes(`index.html?preset=${preset}`) && h.includes(`samples/${preset === 'cash_app' ? 'cash-app' : preset}.csv`) && footer(h) === ref && h.includes('data-goatcounter="https://qbofixer.goatcounter.com/count"') && !h.includes('\u2014') && h.length <= 10240,
      `${g} guide: preset link, sample link, shared footer, GoatCounter, no em dash, <= 10 KB`);
    assert(ref.includes(`href="${g}-csv-to-quickbooks-online.html"`), `shared footer links the ${g} guide`);
  }
  const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html') && footer(readFileSync(join(ROOT, f), 'utf8')));
  assert(pages.length === 28 && pages.every((f) => footer(readFileSync(join(ROOT, f), 'utf8')) === ref), `the same 'All guides' footer on all ${pages.length} pages that carry it (26 guides, comparison, samples)`);
  const idx = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const sm = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  assert(['navy-federal', 'apple-card', ...GUIDES].every((g) => idx.includes(`href="${g}-csv-to-quickbooks-online.html"`) && sm.includes(`/${g}-csv-to-quickbooks-online.html</loc>`)), 'index guide list and sitemap include Navy Federal, Apple Card, Ally, Cash App, SoFi');

  console.log('');
  console.log('=== v1.5.7 detection regression (every fixture in samples/) ===');
  const textOf = (k) => { const [dir, f] = k.split('/'); return decodeBytes(new Uint8Array(readFileSync(join(ROOT, 'samples', dir === 'samples' ? '' : dir, f)))).text; };
  const bad = Object.entries(DETECTED).filter(([k, want]) => detectPreset(textOf(k)) !== want).map(([k]) => k);
  const all = ['', 'drift', 'adversarial', 'real'].flatMap((dd) => readdirSync(join(ROOT, 'samples', dd)).filter((f) => f.endsWith('.csv')).map((f) => `${dd || 'samples'}/${f}`));
  assert(!bad.length && all.every((k) => k in DETECTED), `all ${all.length} fixtures detect as recorded (${bad.join('; ') || 'ok'})`);
}
