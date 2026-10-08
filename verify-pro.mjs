/**
 * Verify suite 6 (v1.2): inert Pro features. zip.mjs (STORE zip, CRC-32), license hook,
 * free limits while isProUnlocked() is false, batch zip and saved profiles when forced on.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, readSample, ROOT } from './verify-lib.mjs';
import { readZip, pythonZipTest, memStorage } from './verify-zip-lib.mjs';
import { crc32, makeZip } from './zip.mjs';
import { isProUnlocked, limitsFor, tierAllows, FREE_LIMITS } from './license.mjs';
import { convertBatch, SUMMARY_NAME } from './batch.mjs';
import { listProfiles, saveProfile, loadProfile, deleteProfile, PROFILES_KEY } from './profiles.mjs';
import { processCsv, buildExportRows, toCsvString, WATERMARK_DESC_SUFFIX } from './core.mjs';

export function run() {
  console.log('');
  console.log('=== zip.mjs (STORE, CRC-32) ===');
  const enc = new TextEncoder();
  assert(crc32(enc.encode('123456789')) === 0xcbf43926, 'CRC-32 check value of "123456789" is CBF43926');
  assert(crc32(new Uint8Array(0)) === 0, 'CRC-32 of empty input is 0');
  const files = [
    { name: 'a.csv', data: 'Date,Description,Amount\n01/02/2026,X,1.00\n' },
    { name: 'empty.txt', data: '' },
    { name: 'caf\u00e9-\u20ac.csv', data: 'Description\nNa\u00efve \u20ac\n' },
  ];
  const zip = makeZip(files, { date: new Date(2026, 9, 8, 21, 30, 10) });
  let read = [];
  try {
    read = readZip(zip);
  } catch (e) {
    assert(false, 'zip parses: ' + e.message);
  }
  assert(read.length === 3, `central directory lists 3 entries (got ${read.length})`);
  assert(read.every((e, i) => e.name === files[i].name && e.text === files[i].data), 'names (incl. UTF-8) and contents round-trip');
  assert(read.every((e) => e.crcOk), 'every stored CRC-32 matches the data');
  assert(zip[0] === 0x50 && zip[1] === 0x4b && zip[2] === 3 && zip[3] === 4, 'file starts with a local file header (PK\\x03\\x04)');
  const py = pythonZipTest(zip);
  if (py === null) console.log('  NOTE: python3 not found, skipped python3 -m zipfile -t');
  else assert(py, 'python3 -m zipfile -t accepts the zip');
  const empty = makeZip([]);
  assert(empty.length === 22 && readZip(empty).length === 0, 'empty zip is a valid 22-byte end record');

  console.log('');
  console.log('=== license hook and free limits (isProUnlocked() === false) ===');
  assert(isProUnlocked() === false, 'isProUnlocked() returns false in this build');
  const free = limitsFor();
  assert(free === FREE_LIMITS && free.files === 1 && free.rows === 100 && free.watermark === true, 'default limits: 1 file, 100 rows, watermark on');
  assert(tierAllows(100) && !tierAllows(101) && !tierAllows(10, 2), 'free tier: 100 rows ok, 101 rows refused, 2 files refused');
  assert(tierAllows(5000, 20, true) && limitsFor(true).watermark === false, 'forced on: no row or file cap, no watermark');
  const lockedBatch = convertBatch([{ name: 'chase-checking.csv', text: readSample('chase-checking.csv') }]);
  assert(lockedBatch.ok === false && /coming soon/.test(lockedBatch.reason) && !lockedBatch.zip, 'batch zip refused while locked (no zip built)');
  const st = memStorage();
  const lockedSave = saveProfile('Client A', { preset: 'citi', qbo: 'date_desc_amount' }, { storage: st });
  assert(lockedSave.ok === false && st.m.size === 0, 'saving a profile refused while locked; nothing written to storage');
  assert(listProfiles({ storage: st }).length === 0 && loadProfile('Client A', { storage: st }).ok === false, 'list/load return nothing while locked');

  console.log('');
  console.log('=== batch zip (forced on) ===');
  const inputs = ['chase-checking.csv', 'amex.csv', 'citi.csv', 'mercury.csv'].map((n) => ({ name: n, text: readSample(n) }));
  inputs.push({ name: 'chase-checking.csv', text: readSample('chase-checking.csv') });
  inputs.push({ name: 'empty.csv', text: '' });
  const b = convertBatch(inputs, { unlocked: true });
  assert(b.ok === true, 'batch converts when forced on');
  const z = readZip(b.zip);
  const names = z.map((e) => e.name);
  const want = ['chase-checking_qbo.csv', 'amex_qbo.csv', 'citi_qbo.csv', 'mercury_qbo.csv', 'chase-checking_qbo-2.csv', SUMMARY_NAME];
  assert(names.join(',') === want.join(','), `zip entries ${want.join(', ')} (got ${names.join(', ')})`);
  assert(z.every((e) => e.crcOk), 'batch zip CRCs all valid');
  const py2 = pythonZipTest(b.zip);
  if (py2 !== null) assert(py2, 'python3 -m zipfile -t accepts the batch zip');
  const presets = b.report.map((r) => r.preset).join(',');
  assert(presets === 'chase,amex,citi,mercury,chase,generic_bank', `per-file auto-detect (got ${presets})`);
  const citi = processCsv(readSample('citi.csv'), 'citi');
  const { header, body } = buildExportRows(citi.transactions, 'date_desc_amount');
  assert(z[2].text === toCsvString(header, body, { watermark: false }), 'citi_qbo.csv equals the single-file export without watermark');
  assert(z.slice(0, 5).every((e) => !e.text.includes(WATERMARK_DESC_SUFFIX.trim())), 'no free watermark in Pro batch files');
  const sum = z[5].text.split('\n');
  assert(sum[0] === 'File,Output,Preset,Rows,Net,Reconcile,Left out,Check,Error', 'summary header row');
  assert(/^citi\.csv,citi_qbo\.csv,citi,6,430\.12,/.test(sum[3]) && /^mercury\.csv,mercury_qbo\.csv,mercury,5,1191\.01,N\/A,2,/.test(sum[4]), 'summary rows carry preset, rows, net, left-out count');
  assert(/^empty\.csv,,generic_bank,0,0\.00,N\/A,0,,/.test(sum[6]) && b.report[5].error.length > 0, 'unreadable file listed with its error, not zipped');
  const dd = convertBatch([{ name: 'x.csv', text: readSample('citi.csv') }], { unlocked: true, presetId: 'citi', qboId: 'date_desc_debit_credit' });
  assert(readZip(dd.zip)[0].text.startsWith('Date,Description,Debit,Credit\n'), 'batch honours the QBO layout choice');

  console.log('');
  console.log('=== saved profiles (forced on, in-memory storage) ===');
  const on = { storage: memStorage(), unlocked: true };
  const p1 = { preset: 'citi', qbo: 'date_desc_debit_credit', dateOrder: 'mdy', decimal: null };
  assert(saveProfile('  Client   A ', p1, on).ok, 'save "Client A"');
  assert(saveProfile('Wise EU', { preset: 'wise', qbo: 'date_desc_amount', dateOrder: 'dmy', decimal: ',' }, on).ok, 'save "Wise EU"');
  assert(listProfiles(on).join('|') === 'Client A|Wise EU', `list sorted (got ${listProfiles(on).join('|')})`);
  const l1 = loadProfile('client a', on);
  assert(l1.ok && JSON.stringify(l1.profile) === JSON.stringify(p1), 'load by name (case-insensitive) returns the saved settings');
  assert(saveProfile('CLIENT A', { preset: 'amex', qbo: 'date_desc_amount' }, on).ok && loadProfile('Client A', on).profile.preset === 'amex', 'saving the same name overwrites');
  assert(listProfiles(on).length === 2, 'overwrite keeps 2 profiles');
  assert(!saveProfile('', p1, on).ok && !saveProfile('Bad', { preset: 'nope', qbo: 'date_desc_amount' }, on).ok, 'empty name and unknown preset refused');
  assert(saveProfile('__proto__', p1, on).ok && loadProfile('__proto__', on).ok && {}.preset === undefined, 'odd names stored safely (no prototype pollution)');
  assert(deleteProfile('Wise EU', on).ok && !loadProfile('Wise EU', on).ok, 'delete removes the profile');
  assert(!deleteProfile('missing', on).ok, 'deleting a missing profile reports it');
  on.storage.setItem(PROFILES_KEY, '{not json');
  assert(listProfiles(on).length === 0, 'corrupt storage reads as no profiles (no crash)');

  console.log('');
  console.log('=== UI stays inert ===');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const ids = ['batchInput', 'batchBtn', 'profileName', 'profileSave', 'profileSelect', 'profileLoad', 'profileDelete'];
  const disabled = ids.filter((id) => new RegExp(`id="${id}"[^>]*\\sdisabled`).test(html));
  assert(disabled.length === ids.length, `Pro controls ship disabled in index.html (${disabled.length}/${ids.length})`);
  assert(/Unlimited version coming soon/.test(html.split('id="proCard"')[1] || ''), 'Pro card shows the neutral coming-soon note');
}
