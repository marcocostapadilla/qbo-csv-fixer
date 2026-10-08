/**
 * Verify suite 9 (v1.3): processor presets Square, Shopify Payments, Etsy, Venmo.
 * Row count, net, signs, MM/DD/YYYY dates, auto-detect, Debit/Credit balance (runPresetCase),
 * plus each layout's quirk. Layout sources: VERIFY-presets-v13.md. Fake names.
 */
import { PRESETS, processCsv, detectPreset } from './core.mjs';
import { assert, readSample, runPresetCase } from './verify-lib.mjs';

export const v13Cases = [
  { file: 'square.csv', preset: 'square', count: 6, net: 1384.69, outflow: 'Refund | Serving Bowl', outAmt: -40.0, inflowAmt: 91.85, firstDate: '03/06/2026', skipped: 0 },
  { file: 'shopify-payouts.csv', preset: 'shopify', count: 6, net: 204.14, outflow: 'refund | #1031', outAmt: -35.0, inflowAmt: 125.92, firstDate: '03/18/2026', skipped: 0 },
  { file: 'etsy.csv', preset: 'etsy', count: 8, net: 2.59, outflow: 'Refund to buyer for Order #4200000003', outAmt: -18.0, inflowAmt: 38.88, firstDate: '03/31/2026', skipped: 0 },
  { file: 'venmo.csv', preset: 'venmo', count: 6, net: 512.75, outflow: 'Printer paper', outAmt: -42.5, inflowAmt: 650.0, firstDate: '03/02/2026', skipped: 0, reconcile: 'PASS', opening: 1250, closing: 1762.75 },
];

const amt = (r, part) => (r.transactions.find((t) => t.description.includes(part)) || {}).amount;

export function run() {
  const res = {};
  for (const c of v13Cases) res[c.preset] = runPresetCase(c);

  console.log('');
  console.log('=== v1.3 preset quirks ===');
  const sq = res.square;
  assert(sq.mapping.amount === 'Net Total' && amt(sq, 'Ceramic Mug') === 91.85, `Square: Net Total is used (94.40 collected less $2.55 fee = 91.85) (got ${sq.mapping.amount}, ${amt(sq, 'Ceramic Mug')})`);
  assert(amt(sq, 'Wholesale Order 118') === 1115.38 && amt(sq, 'Glaze Sampler') === 25.92, 'Square: "$1,149.00" gross with "($33.62)" fee nets 1115.38; cash sale with $0.00 fee kept at 25.92');
  assert(amt(sq, 'Refund | Serving Bowl') === -40 && sq.leftOutRows.length === 0, 'Square: refund "($40.00)" is money out; no row left out');

  const sh = res.shopify;
  assert(amt(sh, '#1045') === 125.92, `Shopify: Net 125.92 used, fee 4.07 not subtracted twice (got ${amt(sh, '#1045')})`);
  assert(amt(sh, '#1046') === 56.02 && sh.skippedRows.length === 0, 'Shopify: pending-payout charge is kept (a real charge, not yet paid out)');
  assert(amt(sh, 'adjustment') === -15 && sh.transactions[0].date === '03/18/2026', 'Shopify: adjustment keeps its sign; "2026-03-18 10:02:11 -0400" reads as 03/18/2026');

  const et = res.etsy;
  assert(amt(et, 'sent to your bank account') === -12 && et.leftOutRows.length === 0, `Etsy: deposit amount read from Title as money out ("--" cells); nothing left out (got ${amt(et, 'sent to your bank')}, ${et.leftOutRows.length})`);
  assert(amt(et, 'Credit for processing fee') === 0.55 && amt(et, 'Sales tax paid by buyer') === -2.88 && amt(et, 'Listing fee') === -0.2, 'Etsy: fee credit positive, sales tax and listing fee negative');
  const etHdr = 'Date,Type,Title,Info,Currency,Amount,"Fees & Taxes",Net\n';
  const gbp = processCsv(etHdr + '"01 January, 2024",Deposit,"£1,208.35 sent to your bank account",,GBP,--,--,--\n"16 January, 2024",Deposit,"Returned deposit",,GBP,£0.33,--,£0.33\n', 'etsy');
  assert(gbp.transactions.map((t) => t.amount).join(',') === '-1208.35,0.33' && gbp.transactions[0].date === '01/01/2024', `Etsy: GBP deposit "£1,208.35" -> -1208.35; a returned deposit keeps its own Net (got ${gbp.transactions.map((t) => t.amount)})`);

  const ve = res.venmo;
  assert(ve.headerRowIndex === 2 && ve.leftOutRows.length === 0, `Venmo: title and "Account Activity" lines skipped, header on line 3, balance and disclaimer lines not read as rows (got header ${ve.headerRowIndex}, left out ${ve.leftOutRows.length})`);
  assert(amt(ve, 'Invoice 1042') === 650 && amt(ve, 'Standard Transfer') === -500, 'Venmo: "+ $650.00" in, "- $500.00" transfer to bank out');
  const lines = readSample('venmo.csv').split('\n').filter((l) => !l.includes('Coffee for client meeting'));
  const short = processCsv(lines.join('\n'), 'venmo');
  assert(short.reconcile.status === 'FAIL' && Math.abs(short.reconcile.delta) === 14.75, `Venmo: a missing row breaks the Beginning/Ending Balance check (FAIL, delta 14.75) (got ${short.reconcile.status} ${short.reconcile.delta})`);

  console.log('');
  console.log('=== v1.3 preset metadata and cross-detection ===');
  for (const id of ['square', 'shopify', 'etsy', 'venmo']) {
    assert(PRESETS[id] && PRESETS[id].slug && PRESETS[id].sample && PRESETS[id].hint, `preset ${id} has a how-to slug, sample and hint`);
  }
  const files = ['chase-checking.csv', 'bank-of-america.csv', 'wells-fargo.csv', 'amex.csv', 'capital-one.csv', 'citi.csv', 'us-bank.csv', 'discover.csv', 'mercury.csv', 'revolut.csv', 'paypal.csv', 'stripe.csv', 'wise.csv'];
  const want = ['chase', 'bofa', 'wells_fargo', 'amex', 'capital_one', 'citi', 'us_bank', 'discover', 'mercury', 'revolut', 'paypal', 'stripe', 'wise'];
  const got = files.map((f) => detectPreset(readSample(f)));
  assert(got.join(',') === want.join(','), `older preset samples still detect as before (got ${got.join(',')})`);
}
