#!/usr/bin/env node
/**
 * Node verification for QBO CSV Fixer. Runs every suite and prints one summary line.
 * 1. verify-v11.mjs: chase-like fixture 10 txns, net 2515.45, reconcile FAIL delta $2.00;
 *    date ambiguity (US M/D vs EU D/M) detection and toggle.
 * 2. verify-presets.mjs: named bank presets (row count, net, signs, dates, auto-detect).
 * 3. verify-drift.mjs: header drift (fuzzy headers, synonyms, confidence, unmapped error).
 * 4. verify-adversarial.mjs: parsing fixes (decimals, amounts, dates, delimiters, rejects,
 *    left-out rows, formula injection, filename).
 * 5. verify-presets-v12.mjs: Citi, U.S. Bank, PNC, Discover, Mercury presets.
 * 6. verify-pro.mjs: inert Pro features (zip writer, license hook, free limits, batch, profiles).
 * 7. verify-license.mjs: license hook wired but off (mocked fetch: valid, invalid, refunded,
 *    chargebacked, network error; flag false never fetches).
 * 8. verify-ui-gates.mjs: Download disabled on rejected files; no detect note next to a file error.
 * 9. verify-presets-v13.mjs: Square, Shopify Payments, Etsy, Venmo presets.
 * 10. verify-watermark.mjs: free watermark is the filename only (no description suffix).
 * 11. verify-v14.mjs: Square transfers, Shopify payouts list, Venmo fee note, file encodings,
 *     adversarial Square / Shopify / Etsy / Venmo fixtures.
 */
import { stats } from './verify-lib.mjs';
import { run as runV11 } from './verify-v11.mjs';
import { run as runPresets } from './verify-presets.mjs';
import { run as runDrift } from './verify-drift.mjs';
import { run as runAdversarial } from './verify-adversarial.mjs';
import { run as runV12Presets } from './verify-presets-v12.mjs';
import { run as runPro } from './verify-pro.mjs';
import { run as runLicense } from './verify-license.mjs';
import { run as runUiGates } from './verify-ui-gates.mjs';
import { run as runV13Presets } from './verify-presets-v13.mjs';
import { run as runWatermark } from './verify-watermark.mjs';
import { run as runV14 } from './verify-v14.mjs';

runV11();
runPresets();
runDrift();
runAdversarial();
runV12Presets();
runPro();
await runLicense();
runUiGates();
runV13Presets();
runWatermark();
runV14();

console.log('');
console.log(`SUMMARY: ${stats.passed} passed, ${stats.failed} failed.`);
if (stats.failed === 0) {
  console.log('ALL ASSERTIONS PASSED. Reconcile badge MUST show FAIL with Δ $2.00 on the chase-like fixture.');
  process.exit(0);
} else {
  console.log(`FAILED: ${stats.failed} assertion(s).`);
  process.exit(1);
}
