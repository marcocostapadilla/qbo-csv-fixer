#!/usr/bin/env node
/**
 * Node verification for QBO CSV Fixer. Runs every suite and prints one summary line.
 * 1. verify-v11.mjs: chase-like fixture 10 txns, net 2515.45, reconcile FAIL delta $2.00;
 *    date ambiguity (US M/D vs EU D/M) detection and toggle.
 * 2. verify-presets.mjs: named bank presets (row count, net, signs, dates, auto-detect).
 * 3. verify-drift.mjs: header drift (fuzzy headers, synonyms, confidence, unmapped error).
 * 4. verify-adversarial.mjs: parsing fixes (decimals, amounts, dates, delimiters, rejects,
 *    left-out rows, formula injection, watermark, filename).
 * 5. verify-presets-v12.mjs: Citi, U.S. Bank, PNC, Discover, Mercury presets.
 */
import { stats } from './verify-lib.mjs';
import { run as runV11 } from './verify-v11.mjs';
import { run as runPresets } from './verify-presets.mjs';
import { run as runDrift } from './verify-drift.mjs';
import { run as runAdversarial } from './verify-adversarial.mjs';
import { run as runV12Presets } from './verify-presets-v12.mjs';

runV11();
runPresets();
runDrift();
runAdversarial();
runV12Presets();

console.log('');
console.log(`SUMMARY: ${stats.passed} passed, ${stats.failed} failed.`);
if (stats.failed === 0) {
  console.log('ALL ASSERTIONS PASSED. Reconcile badge MUST show FAIL with Δ $2.00 on the chase-like fixture.');
  process.exit(0);
} else {
  console.log(`FAILED: ${stats.failed} assertion(s).`);
  process.exit(1);
}
