/**
 * Verify suite 5 (v1.2): presets Citi, U.S. Bank, PNC, Discover, Mercury.
 * Row count, net, signs (money out negative), dates normalized to MM/DD/YYYY, auto-detect,
 * plus each preset's quirk. Layout sources: VERIFY-presets-v12.md. Fixtures use fake merchants.
 */
import { PRESETS, processCsv, detectPreset } from './core.mjs';
import { assert, readSample, runPresetCase } from './verify-lib.mjs';

export const v12Cases = [
  { file: 'citi.csv', preset: 'citi', count: 6, net: 430.12, outflow: 'FABRIKAM HOME GOODS BEAVERTON', outAmt: -132.88, inflowAmt: 650.0, firstDate: '04/25/2026', skipped: 1 },
  { file: 'us-bank.csv', preset: 'us_bank', count: 6, net: 1596.19, outflow: 'CHECK 2041', outAmt: -400.0, inflowAmt: 2150.0, firstDate: '01/05/2026' },
  { file: 'pnc.csv', preset: 'pnc', detectAs: 'generic_bank', count: 6, net: 715.15, outflow: 'FABRIKAM INSURANCE', outAmt: -1120.45, inflowAmt: 1875.0, firstDate: '02/02/2026' },
  { file: 'discover.csv', preset: 'discover', count: 7, net: 98.29, outflow: 'NORTHWIND GROCERY', outAmt: -84.16, inflowAmt: 300.0, firstDate: '03/02/2026' },
  { file: 'mercury.csv', preset: 'mercury', count: 5, net: 1191.01, outflow: 'Fabrikam Payroll', outAmt: -2650.0, inflowAmt: 4200.0, firstDate: '05/22/2026', skipped: 2 },
];

export function run() {
  const results = {};
  for (const c of v12Cases) results[c.preset] = runPresetCase(c);

  console.log('');
  console.log('=== v1.2 preset quirks ===');
  const citi = results.citi;
  assert(citi.skippedRows[0].reason === 'Status PENDING' && citi.skippedRows[0].sourceRow === 2, `Citi: Pending row 2 left out and listed (got ${JSON.stringify(citi.skippedRows[0])})`);
  const ret = citi.transactions.find((t) => t.description.includes('RETURN'));
  const pay = citi.transactions.find((t) => t.description.includes('ONLINE PAYMENT'));
  assert(ret.amount === 32.88 && pay.amount === 650, `Citi: Credit is money in whether written positive (32.88) or negative (-650.00) (got ${ret.amount}, ${pay.amount})`);
  const disc = results.discover;
  const purchase = disc.transactions.find((t) => t.description.includes('LITWARE RESTAURANT'));
  const refund = disc.transactions.find((t) => t.description.includes('REFUND'));
  assert(purchase.amount === -46.35 && refund.amount === 19.99, `Discover: positive purchase 46.35 -> -46.35, negative refund -19.99 -> 19.99 (got ${purchase.amount}, ${refund.amount})`);
  const merc = results.mercury;
  assert(merc.skippedRows.map((s) => s.reason).join(',') === 'Status PENDING,Status FAILED', `Mercury: Pending and Failed rows left out (got ${merc.skippedRows.map((s) => s.reason)})`);
  assert(merc.transactions[0].date === '05/22/2026' && merc.dateInfo.detected === 'mdy', `Mercury: MM-DD-YYYY read as month first (got ${merc.transactions[0].date}, ${merc.dateInfo.detected})`);
  const usb = results.us_bank;
  assert(usb.transactions[0].description === 'NORTHWIND COFFEE ROASTERS', `U.S. Bank: Name column is the description (got ${usb.transactions[0].description})`);
  const pncAsGeneric = processCsv(readSample('pnc.csv'), 'generic_bank');
  assert(Math.abs(pncAsGeneric.net - 715.15) < 0.001, `PNC file read with the generic map gives the same net (got ${pncAsGeneric.net})`);
  assert(detectPreset(readSample('pnc.csv')) === 'generic_bank', 'PNC is not auto-detected (its headers are generic), never a false "PNC" claim');

  console.log('');
  console.log('=== v1.2 preset metadata and cross-detection ===');
  for (const id of ['citi', 'us_bank', 'pnc', 'discover', 'mercury']) {
    assert(PRESETS[id] && PRESETS[id].slug && PRESETS[id].sample && PRESETS[id].hint, `preset ${id} has a how-to slug, sample and hint`);
  }
  const others = ['chase-checking.csv', 'bank-of-america.csv', 'wells-fargo.csv', 'amex.csv', 'capital-one.csv', 'revolut.csv', 'paypal.csv', 'stripe.csv', 'wise.csv'];
  const expect = ['chase', 'bofa', 'wells_fargo', 'amex', 'capital_one', 'revolut', 'paypal', 'stripe', 'wise'];
  const got = others.map((f) => detectPreset(readSample(f)));
  assert(got.join(',') === expect.join(','), `older preset samples still detect as before (got ${got.join(',')})`);
}
