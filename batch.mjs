/**
 * QBO CSV Fixer - multi-file batch to one zip (part of the future unlimited version).
 * Gated by isProUnlocked(): in this build it always refuses, so the free core stays 1 file.
 * Everything runs in the browser; files are never uploaded.
 */
import { processCsv } from './process.mjs';
import { detectPresetScored } from './detect.mjs';
import { buildExportRows, toCsvString, exportFileName, safeText, WATERMARK_SUFFIX } from './export.mjs';
import { makeZip } from './zip.mjs';
import { isProUnlocked, limitsFor, PRO_COMING_SOON } from './license.mjs';

export const PRO_SUFFIX = '_qbo';
export const SUMMARY_NAME = 'batch-summary.csv';

function uniqueName(name, used) {
  let out = name;
  for (let n = 2; used.has(out.toLowerCase()); n++) out = name.replace(/\.csv$/i, '') + '-' + n + '.csv';
  used.add(out.toLowerCase());
  return out;
}

function summaryCsv(report) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = ['File', 'Output', 'Preset', 'Rows', 'Net', 'Reconcile', 'Left out', 'Check', 'Error'];
  const lines = [head.join(',')];
  for (const r of report) {
    lines.push([safeText(r.file), safeText(r.output), r.preset, r.rows, r.net.toFixed(2), r.reconcile, r.leftOut, r.check, safeText(r.error)].map(esc).join(','));
  }
  return lines.join('\n') + '\n';
}

/**
 * Convert several CSV files. files: [{ name, text }].
 * opts.presetId: a preset id, or 'auto' to detect per file. opts.qboId: QBO column layout.
 * opts.unlocked: defaults to isProUnlocked() (false); tests pass true.
 * Returns { ok: false, reason } when locked, else { ok: true, entries, report, zip }.
 * Files that cannot be converted are listed in the report and in batch-summary.csv, not zipped.
 * Ambiguous dates or decimals use the preset default and are flagged in the Check column.
 */
export function convertBatch(files, { presetId = 'auto', qboId = 'date_desc_amount', unlocked = isProUnlocked(), date } = {}) {
  if (!unlocked) return { ok: false, reason: `Batch zip is part of the unlimited version. ${PRO_COMING_SOON}` };
  const lim = limitsFor(true);
  if (!files.length) return { ok: false, reason: 'No files selected.' };
  const used = new Set([SUMMARY_NAME]);
  const entries = [];
  const report = [];
  for (const f of files) {
    const id = presetId === 'auto' ? detectPresetScored(f.text).id : presetId;
    let r;
    try {
      r = processCsv(f.text, id);
    } catch (err) {
      r = { fileError: { message: 'Parse error: ' + (err && err.message ? err.message : String(err)) }, transactions: [] };
    }
    const fatal = r.fileError || r.mappingError;
    const base = { file: f.name, preset: id, output: '', rows: 0, net: 0, reconcile: 'N/A', leftOut: 0, check: '', error: '' };
    if (fatal || !r.transactions.length) {
      report.push({ ...base, error: fatal ? fatal.message : 'No rows could be read from this file.' });
      continue;
    }
    const { header, body } = buildExportRows(r.transactions, qboId);
    const csv = toCsvString(header, body, { watermark: lim.watermark });
    const output = uniqueName(exportFileName(f.name, lim.watermark ? WATERMARK_SUFFIX : PRO_SUFFIX), used);
    entries.push({ name: output, data: csv });
    report.push({
      ...base,
      output,
      rows: r.transactions.length,
      net: r.net,
      reconcile: r.reconcile ? r.reconcile.status : 'N/A',
      leftOut: (r.skippedRows || []).length + (r.leftOutRows || []).length,
      check: [r.dateInfo && r.dateInfo.ambiguous ? 'date format' : '', r.decimalInfo && r.decimalInfo.ambiguous ? 'decimal separator' : '']
        .filter(Boolean)
        .join('; '),
    });
  }
  entries.push({ name: SUMMARY_NAME, data: summaryCsv(report) });
  return { ok: true, entries, report, zip: makeZip(entries, date ? { date } : {}) };
}
