/**
 * Verify suite 8 (v1.3): cleanup from the v1.2 browser report.
 * - Download is disabled (attribute + styling) whenever a file is rejected or has no rows.
 * - The "closest bank matches" detect note is hidden next to a file error (header-only, empty, binary).
 * The DOM itself is covered by the browser suite; here: the pure gates and the shipped markup.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, readSample, ROOT } from './verify-lib.mjs';
import { processCsv, detectPresetScored, detectionNote } from './core.mjs';
import { canDownload } from './license.mjs';
import { showDetectNoteFor } from './detect.mjs';

const src = (f) => readFileSync(join(ROOT, f), 'utf8');

export function run() {
  console.log('');
  console.log('=== v1.3 cleanup: Download gate and detect note ===');
  const headerOnly = readSample('adversarial/header-only.csv');
  const ho = processCsv(headerOnly);
  const hoNote = detectionNote(detectPresetScored(headerOnly));
  assert(ho.fileError && ho.fileError.kind === 'no-rows', `header-only file is a file error (got ${ho.fileError && ho.fileError.kind})`);
  assert(/Closest matches/.test(hoNote) && showDetectNoteFor(ho) === false, 'header-only: the closest-matches note exists but is hidden next to the error');
  assert(canDownload(ho) === false && canDownload(ho, true) === false, 'header-only: Download disabled (free and unlocked)');

  const empty = processCsv('');
  const binary = processCsv('\u0089PNG\r\n\u001a\n\u0000\u0000\u0000\rIHDR\u0000\u0000');
  assert(empty.fileError && binary.fileError && !canDownload(empty) && !canDownload(binary), 'empty and binary files: Download disabled');
  assert(!showDetectNoteFor(empty) && !showDetectNoteFor(binary), 'empty and binary files: no detect note');

  const prose = processCsv('Dear customer,\nyour statement is attached.\nThanks');
  assert(prose.mappingError && !canDownload(prose), 'missing required columns: Download disabled');
  assert(showDetectNoteFor(prose) === true, 'missing required columns: preset suggestions stay visible (they help)');

  const allBad = processCsv('Date,Description,Amount\n01/05/2026,COFFEE,abc\n01/06/2026,TEA,??\n');
  assert(allBad.transactions.length === 0 && allBad.leftOutRows.length === 2 && !canDownload(allBad), 'every row unreadable: nothing to download, Download disabled');

  const ok = processCsv(readSample('chase-checking.csv'), 'chase');
  assert(canDownload(ok) === true && showDetectNoteFor(ok) === true, 'valid file: Download enabled, detect note shown');
  const rows = ['Date,Description,Amount'];
  for (let i = 1; i <= 101; i++) rows.push(`01/${String((i % 28) + 1).padStart(2, '0')}/2026,ROW ${i},-1.00`);
  const big = processCsv(rows.join('\n'));
  assert(big.transactions.length === 101 && !canDownload(big) && canDownload(big, true), '101 rows: Download disabled on free tier, allowed when unlocked');

  const html = src('index.html');
  const btn = (html.match(/<button[^>]*id="downloadBtn"[^>]*>/) || [''])[0];
  assert(/\sdisabled[\s>]/.test(btn) && /aria-disabled="true"/.test(btn), 'index.html: Download button ships disabled (attribute + aria-disabled)');
  const css = src('styles.css');
  const rule = (css.match(/#downloadBtn:disabled\s*\{[^}]*\}/) || [''])[0];
  assert(/background:/.test(rule) && /cursor:\s*not-allowed/.test(rule) && /opacity:/.test(rule), 'styles.css: disabled Download has its own grey background, opacity and not-allowed cursor');
  const ui = src('ui.mjs');
  const hide = (ui.match(/export function hideResults\(\)\s*\{[^}]*\}/) || [''])[0];
  assert(/setDownloadEnabled\(false\)/.test(hide) && /setDownloadEnabled\(canDownload\(r\)\)/.test(ui), 'ui.mjs: hideResults disables Download; renderResults uses canDownload');
  const app = src('app.js');
  assert(/if \(!showDetectNoteFor\(r\)\) setDetectNote\(''\)/.test(app) && /if \(!canDownload\(r\)\) return;/.test(app), 'app.js: clears the detect note on file errors; download handler re-checks canDownload');
}
