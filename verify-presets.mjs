/**
 * Verify suite 2 (v1.1): named bank presets. Row count, net, sign convention,
 * normalized dates, auto-detect. Layout sources: VERIFY.md.
 */
import { PRESETS, detectPreset } from './core.mjs';
import { assert, readSample, runPresetCase } from './verify-lib.mjs';

// ---------------------------------------------------------------
// 3. Named bank presets
// ---------------------------------------------------------------
export const presetCases = [
  { file: 'chase-checking.csv', preset: 'chase', count: 6, net: 1760.0, outflow: 'CHECK 1043', outAmt: -250.0, inflowAmt: 2150.0, firstDate: '01/16/2026' },
  { file: 'bank-of-america.csv', preset: 'bofa', count: 7, net: 1488.53, outflow: 'MAPLE STREET', outAmt: -86.14, inflowAmt: 2500.0, firstDate: '02/02/2026', reconcile: 'PASS', opening: 3410.22, closing: 4898.75 },
  { file: 'wells-fargo.csv', preset: 'wells_fargo', count: 6, net: 930.8, outflow: 'MAPLE STREET', outAmt: -54.21, inflowAmt: 1850.0, firstDate: '01/02/2026' },
  { file: 'amex.csv', preset: 'amex', count: 6, net: -68.3, outflow: 'FABRIKAM AIRLINES', outAmt: -412.8, inflowAmt: 500.0, firstDate: '01/03/2026' },
  { file: 'capital-one.csv', preset: 'capital_one', count: 6, net: 452.26, outflow: 'MAPLE STREET', outAmt: -94.17, inflowAmt: 650.0, firstDate: '03/02/2026' },
  { file: 'revolut.csv', preset: 'revolut', count: 6, net: 313.34, outflow: 'Contoso Travel', outAmt: -61.86, inflowAmt: 500.0, firstDate: '01/02/2026', skipped: 2 },
  { file: 'paypal.csv', preset: 'paypal', count: 5, net: 10.79, outflow: 'Fabrikam Hosting', outAmt: -29.0, inflowAmt: 115.33, firstDate: '01/04/2026', skipped: 1 },
  { file: 'stripe.csv', preset: 'stripe', count: 6, net: 43.39, outflow: 'STRIPE PAYOUT', outAmt: -237.83, inflowAmt: 242.45, firstDate: '02/02/2026' },
  { file: 'wise.csv', preset: 'wise', count: 5, net: 821.11, outflow: 'Sent money to Jane Doe', outAmt: -450.0, inflowAmt: 1500.0, firstDate: '02/27/2026' },
];

export function run() {
  for (const c of presetCases) runPresetCase(c);

console.log('');
console.log('=== Preset metadata ===');
for (const id of ['chase', 'bofa', 'wells_fargo', 'amex', 'capital_one', 'revolut', 'paypal', 'stripe', 'wise']) {
  assert(PRESETS[id] && PRESETS[id].slug && PRESETS[id].sample, `preset ${id} has a how-to slug and sample`);
}
assert(detectPreset(readSample('chase-like-messy.csv')) === 'generic_bank', `chase-like fixture auto-detects as generic_bank (got ${detectPreset(readSample('chase-like-messy.csv'))})`);
}
