/**
 * Verify suite 11 (v1.4): Square transfers and Shopify payouts-list presets, Venmo fee note,
 * file encodings (UTF-16, Windows-1252, BOM) and the adversarial fixtures for Square, Shopify,
 * Etsy and Venmo. Layout sources: VERIFY-presets-v13.md (v1.4 section). Fake names.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, detectPreset, rejectReason, PRESETS } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { assert, readSample, runPresetCase, ROOT } from './verify-lib.mjs';

const bytes = (name) => readFileSync(join(ROOT, 'samples', name));
// Windows-1252 encoder for the characters the fixtures use (the repo stores text fixtures as UTF-8)
const CP = { '\u20ac': 0x80, '\u201c': 0x93, '\u201d': 0x94 };
const toCp1252 = (t) => Buffer.from([...t].map((c) => CP[c] ?? c.charCodeAt(0)));
const ENCODE = {
  'UTF-16 LE': (b) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(b.toString('utf8'), 'utf16le')]),
  'Windows-1252': (b) => toCp1252(b.toString('utf8')),
};
const adv = (name, preset, as) => {
  const raw = bytes('adversarial/' + name);
  const d = decodeBytes(as ? ENCODE[as](raw) : raw);
  return { enc: d.encoding, det: detectPreset(d.text), r: processCsv(d.text, preset) };
};
const amt = (r, part) => (r.transactions.find((t) => t.description.includes(part)) || {}).amount;
const reasons = (r) => r.leftOutRows.map((x) => `${x.sourceRow}:${x.reason}`).join(',');

export function run() {
  const st = runPresetCase({ file: 'square-transfers.csv', preset: 'square_transfers', count: 3, net: -1254.49, outflow: 'Square transfer 3Z4689', outAmt: -1141.86, inflowAmt: 35, firstDate: '03/10/2026', skipped: 0 });
  const sp = runPresetCase({ file: 'shopify-payouts-list.csv', preset: 'shopify_payouts', count: 3, net: -1616.06, outflow: 'Shopify Payments payout (Deposited', outAmt: -1270.82, inflowAmt: 55, firstDate: '03/19/2026', skipped: 2 });

  console.log('');
  console.log('=== v1.4 Square transfers and Shopify payouts list ===');
  assert(amt(st, '3Z4617') === -147.63 && st.transactions[0].description === 'Square transfer 3Z4617 (3 items)', `Square transfers: one line per Deposit ID, 79.36 + 87.75 - 19.48 = 147.63 out of the clearing account (got ${amt(st, '3Z4617')})`);
  assert(amt(st, '3Z4700 (1 item)') === 35 && st.mapping.amount === 'Deposited' && st.mapping.date === 'Deposit Date', 'Square transfers: a refund-only transfer (Square debits the bank) is money in; Deposited and Deposit Date are used');
  assert(sp.mapping.amount === 'Total' && amt(sp, 'Withdrawn') === 55, `Shopify payouts list: Total is used; a Withdrawn payout (-55.00) is money in (got ${sp.mapping.amount}, ${amt(sp, 'Withdrawn')})`);
  assert(sp.skippedRows.map((s) => s.reason).join(',') === 'Status SCHEDULED,Status FAILED', `Shopify payouts list: Scheduled and Failed payouts left out and listed (got ${sp.skippedRows.map((s) => s.reason)})`);
  const shown = PRESETS.square_transfers.slug === 'square' && PRESETS.shopify_payouts.slug === 'shopify' && PRESETS.square_transfers.hint && PRESETS.shopify_payouts.hint;
  assert(shown, 'v1.4 presets link to the existing Square and Shopify guides and have hints');
  const old = ['square.csv', 'shopify-payouts.csv', 'etsy.csv', 'venmo.csv', 'stripe.csv', 'paypal.csv', 'chase-checking.csv'].map((f) => detectPreset(readSample(f)));
  assert(old.join(',') === 'square,shopify,etsy,venmo,stripe,paypal,chase', `older samples still detect as before (got ${old})`);

  console.log('');
  console.log('=== v1.4 file encodings ===');
  const txt = 'Date,Description,Amount\r\n01/13/2026,Caf\u00e9 \u201cNorthwind\u201d \u20ac,-4.50\r\n';
  const le = Buffer.from(txt, 'utf16le');
  const be = Buffer.from(le).swap16();
  const cp = toCp1252(txt);
  const cases = [
    ['UTF-16 LE with BOM', Buffer.concat([Buffer.from([0xff, 0xfe]), le]), 'UTF-16 LE'],
    ['UTF-16 BE with BOM', Buffer.concat([Buffer.from([0xfe, 0xff]), be]), 'UTF-16 BE'],
    ['UTF-16 LE without BOM', le, 'UTF-16 LE'],
    ['Windows-1252 (smart quotes, euro, e acute)', cp, 'Windows-1252'],
    ['UTF-8 with BOM', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(txt)]), 'UTF-8'],
  ];
  for (const [label, b, enc] of cases) {
    const d = decodeBytes(b);
    const r = processCsv(d.text, 'generic_bank');
    const ok = d.encoding === enc && !rejectReason(d.text) && r.transactions.length === 1 && r.transactions[0].description === 'Caf\u00e9 \u201cNorthwind\u201d \u20ac' && r.transactions[0].amount === -4.5;
    assert(ok, `${label}: read as ${enc}, one row with the exact description (got ${d.encoding}, ${r.transactions.map((t) => t.description)})`);
  }
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc0000003010100c9fe92ef0000000049454e44ae426082', 'hex'); // samples/adversarial/not-a-csv.png (kept local; see VERIFY.md)
  assert(!!rejectReason(decodeBytes(png).text), 'a PNG is still rejected as binary after the Windows-1252 fallback');
  let seed = 7;
  const rnd = Buffer.from(Array.from({ length: 4096 }, () => (seed = (seed * 1103515245 + 12345) % 2147483648) % 256));
  assert(!!rejectReason(decodeBytes(rnd).text), 'random binary bytes (zip/xlsx-like) are still rejected');
  const src = ['app.js', 'pro-ui.mjs'].map((f) => readFileSync(join(ROOT, f), 'utf8'));
  assert(src.every((s) => s.includes('readAsArrayBuffer') && s.includes('decodeBytes(') && !s.includes('readAsText')), 'app.js and pro-ui.mjs read bytes and decode them (no readAsText)');

  console.log('');
  console.log('=== v1.4 adversarial: Square, Shopify, Etsy, Venmo ===');
  const s16 = adv('square-encodings.csv', 'square', 'UTF-16 LE');
  assert(s16.enc === 'UTF-16 LE' && s16.det === 'square' && s16.r.transactions.length === 3, `Square file saved as UTF-16 LE (Excel Unicode): detected and read, 3 rows (got ${s16.enc}, ${s16.det}, ${s16.r.transactions.length})`);
  assert(amt(s16.r, 'Mug, large \u201cblue\u201d') === 1115.38 && amt(s16.r, 'Caf\u00e9 bowl') === -38.8 && amt(s16.r, 'Chargeback fee') === -15, 'Square: quoted comma and smart quotes kept; refund with a returned fee nets -38.80; dispute fee -15.00');
  assert(reasons(s16.r) === '5:missing amount' && s16.r.reconcile.status === 'INCOMPLETE' && s16.r.skippedSummary.some((x) => x.label === 'Total'), `Square: empty Net Total listed as left out; "Total" footer is not a row (got ${reasons(s16.r)})`);
  const e12 = adv('etsy-encodings.csv', 'etsy', 'Windows-1252');
  assert(e12.enc === 'Windows-1252' && e12.det === 'etsy' && e12.r.transactions.length === 5, `Etsy file saved as Windows-1252 (Excel CSV): detected and read, 5 rows + 1 pending left out (got ${e12.enc}, ${e12.det}, ${e12.r.transactions.length})`);
  assert(amt(e12.r, 'sent to your bank account') === -1208.35 && amt(e12.r, 'Refund to buyer') === -18 && amt(e12.r, '\u201cCaf\u00e9\u201d mug') === 30, 'Etsy: euro deposit read from Title, euro refund negative, smart quotes kept');
  assert(reasons(e12.r) === '8:missing amount', `Etsy: a row of only "--" is listed as missing amount, not unreadable (got ${reasons(e12.r)})`);
  const sb = adv('shopify-bom-chargeback.csv', 'shopify');
  assert(sb.det === 'shopify' && sb.r.transactions.length === 5 && sb.r.headers[0] === 'Transaction Date', `Shopify UTF-8 BOM: detected, 5 rows, BOM not in the first header (got ${sb.det}, ${sb.r.transactions.length})`);
  assert(amt(sb.r, 'chargeback') === -95 && amt(sb.r, 'refund') === -34.7 && amt(sb.r, '#1019, gift order') === 1164.9, 'Shopify: chargeback with fee -95.00, refund with a negative fee keeps Net -34.70, quoted comma order kept');
  assert(sb.r.transactions.some((t) => t.description === 'adjustment' && t.amount === 15) && amt(sb.r, '#1046') === 56.02, 'Shopify: adjustment with empty Order described by Type; pending charge kept');
  assert(reasons(sb.r) === '7:missing amount' && sb.r.skippedSummary.some((x) => x.label === 'Total'), `Shopify: empty Amount/Fee/Net listed; "Total" footer skipped (got ${reasons(sb.r)})`);
  const ve = adv('venmo-fees.csv', 'venmo');
  assert(ve.r.notes.length === 1 && ve.r.notes[0].includes('2 row(s), $10.72') && ve.r.notes[0].includes('reconcile badge'), `Venmo: non-zero Amount (fee) shows the fee note (got ${JSON.stringify(ve.r.notes)})`);
  assert(amt(ve.r, 'Instant Transfer') === -100 && amt(ve.r, 'Logo, deposit') === 300 && ve.r.reconcile.status === 'PASS', 'Venmo: Amount (total) used as is (fee neither added nor subtracted); balances still checked');
  assert(processCsv(readSample('venmo.csv'), 'venmo').notes.length === 0, 'Venmo: no fee note when every fee is empty or zero');
  const se = adv('square-transfers-edge.csv', 'square_transfers');
  assert(se.det === 'square_transfers' && se.r.transactions.length === 1 && amt(se.r, '3Z4617 (2 items)') === -14.36, `Square transfers: a chargeback lowers the transfer (79.36 - 65.00) (got ${amt(se.r, '3Z4617')})`);
  assert(reasons(se.r) === '4:missing date,5:missing amount' && se.r.reconcile.status === 'INCOMPLETE', `Square transfers: no Deposit Date (not transferred yet) and no Deposited are listed, never merged (got ${reasons(se.r)})`);
}
