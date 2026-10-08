/**
 * Verify suite 10 (v1.3.1): the free watermark is the filename only.
 * - Free exports carry no description suffix and no extra row; every Description cell equals the
 *   source description (formula guard aside), for every preset sample and both QBO layouts.
 * - The chase-like free export equals samples/chase-like-qbo-ready.csv byte for byte.
 * - Free filename ends with _qbo-csv-fixer-free.csv; Pro (forced on) uses _qbo.csv.
 * - No shipped page, doc or module still mentions the old description tag.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { assert, readSample, ROOT } from './verify-lib.mjs';
import { PRESETS, processCsv, buildExportRows, toCsvString, parseCsv, safeText, exportFileName, WATERMARK_SUFFIX } from './core.mjs';
import { limitsFor, isProUnlocked } from './license.mjs';
import { PRO_SUFFIX } from './batch.mjs';

const OLD_TAG = 'QBO CSV Fixer' + ' free)';
const src = (f) => readFileSync(join(ROOT, f), 'utf8');
const freeName = (name) => exportFileName(name, limitsFor(isProUnlocked()).watermark ? WATERMARK_SUFFIX : PRO_SUFFIX);

export function run() {
  console.log('');
  console.log('=== v1.3.1 free watermark: filename only ===');

  const r = processCsv(readSample('chase-like-messy.csv'), 'generic_bank');
  const { header, body } = buildExportRows(r.transactions, 'date_desc_amount');
  const csv = toCsvString(header, body);
  assert(csv === readSample('chase-like-qbo-ready.csv'), 'chase-like free export equals samples/chase-like-qbo-ready.csv exactly');
  assert(freeName('chase-like-messy.csv') === 'chase-like-messy_qbo-csv-fixer-free.csv', `free filename has ${WATERMARK_SUFFIX} (got ${freeName('chase-like-messy.csv')})`);
  assert(limitsFor(true).watermark === false && exportFileName('chase-like-messy.csv', PRO_SUFFIX) === 'chase-like-messy_qbo.csv', 'Pro (forced on) filename has no free suffix');

  let rows = 0;
  const bad = [];
  for (const [id, p] of Object.entries(PRESETS)) {
    if (!p.sample) continue;
    const res = processCsv(readSample(p.sample.replace(/^samples\//, '')), id);
    for (const layout of ['date_desc_amount', 'date_desc_debit_credit']) {
      const ex = buildExportRows(res.transactions, layout);
      const out = parseCsv(toCsvString(ex.header, ex.body), ',').filter((x) => x.length > 1);
      const descs = out.slice(1).map((x) => x[1]);
      const want = res.transactions.map((t) => safeText(t.description));
      rows += descs.length;
      if (out.length !== res.transactions.length + 1 || descs.some((d, i) => d !== want[i])) bad.push(`${id}/${layout}`);
    }
  }
  assert(bad.length === 0 && rows > 0, `every sample export: descriptions equal the source, no suffix, no extra row (${rows} rows checked; mismatches: ${bad.join(', ') || 'none'})`);

  const long = processCsv(readSample('adversarial/long-description.csv'), 'generic_bank');
  const lx = buildExportRows(long.transactions, 'date_desc_amount');
  const ld = parseCsv(toCsvString(lx.header, lx.body), ',').slice(1).filter((x) => x.length > 1).map((x) => x[1]);
  assert(ld.length === long.transactions.length && ld.every((d, i) => d === long.transactions[i].description) && Math.max(...ld.map((d) => d.length)) > 200, 'long descriptions are exported unchanged (no cap, no suffix)');

  assert(/toCsvString\(header, body\);/.test(src('app.js')) && /toCsvString\(header, body\);/.test(src('batch.mjs')), 'single and batch export paths write cells without a watermark option');
  const files = readdirSync(ROOT).filter((f) => !f.startsWith('.') && /\.(html|md|mjs|js|xml)$/.test(f));
  const hits = files.filter((f) => src(f).includes(OLD_TAG));
  assert(hits.length === 0, `no shipped file mentions the old description tag (${files.length} files; hits: ${hits.join(', ') || 'none'})`);
}
