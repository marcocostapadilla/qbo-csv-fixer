/**
 * QBO CSV Fixer - public API (browser + Node).
 * Thin re-export of the readable modules so app.js and verify.mjs import one file.
 */
export { parseCsv, sniffDelimiter, rejectReason } from './parse.mjs';
export { parseAmount, detectDecimal } from './money.mjs';
export { parseDateParts, detectDateOrder, normalizeDate } from './dates.mjs';
export { PRESETS, QBO_PRESETS } from './presets.mjs';
export { detectPreset, detectPresetScored, detectionNote } from './detect.mjs';
export { FIELD_SYNONYMS, mappingErrorMessage } from './fields.mjs';
export { processCsv } from './process.mjs';
export { RECONCILE_TOLERANCE, round2, reconcileBalances, fmtMoney } from './reconcile.mjs';
export {
  FREE_ROW_LIMIT,
  WATERMARK_SUFFIX,
  WATERMARK_DESC_SUFFIX,
  MAX_DESC_LEN,
  buildExportRows,
  toCsvString,
  safeText,
  watermarkDescription,
  exportFileName,
  freeTierAllows,
} from './export.mjs';
