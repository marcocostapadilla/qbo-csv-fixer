/**
 * QBO CSV Fixer - QBO export rows, CSV writer, free-tier limits.
 *
 * Free watermark: no extra row (a blank-date 0.00 row can make QBO reject the file or import a
 * $0 line). Instead the filename gets WATERMARK_SUFFIX and every description gets
 * WATERMARK_DESC_SUFFIX, with the description capped at MAX_DESC_LEN characters in total.
 *
 * Formula injection: text cells that start with = + - @ tab or CR get a leading apostrophe so
 * Excel / Sheets show them as text. Amount, Debit and Credit cells are never touched.
 */

export const FREE_ROW_LIMIT = 100;
export const WATERMARK_SUFFIX = '_qbo-csv-fixer-free';
export const WATERMARK_DESC_SUFFIX = ' (QBO CSV Fixer free)';
export const MAX_DESC_LEN = 200;
const MONEY_HEADERS = new Set(['Amount', 'Debit', 'Credit']);

/** Neutralize spreadsheet formulas in a text cell. */
export function safeText(v) {
  const s = String(v ?? '');
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Description with the free watermark suffix, capped at MAX_DESC_LEN characters. */
export function watermarkDescription(desc) {
  const room = MAX_DESC_LEN - WATERMARK_DESC_SUFFIX.length;
  const s = String(desc ?? '');
  return (s.length > room ? s.slice(0, room - 3).trimEnd() + '...' : s) + WATERMARK_DESC_SUFFIX;
}

/** Build export rows for a QBO preset */
export function buildExportRows(transactions, qboPresetId) {
  if (qboPresetId === 'date_desc_debit_credit') {
    const header = ['Date', 'Description', 'Debit', 'Credit'];
    const body = transactions.map((t) => {
      const debit = t.amount < 0 ? Math.abs(t.amount).toFixed(2) : '';
      const credit = t.amount > 0 ? t.amount.toFixed(2) : '';
      // zero amounts: leave both empty or put on credit as 0.00
      const d = t.amount === 0 ? '' : debit;
      const c = t.amount === 0 ? '0.00' : credit;
      return [t.date, t.description, d, c];
    });
    return { header, body };
  }
  // default Date / Description / Amount
  const header = ['Date', 'Description', 'Amount'];
  const body = transactions.map((t) => [t.date, t.description, t.amount.toFixed(2)]);
  return { header, body };
}

/**
 * Write CSV text. opts.watermark: add the free suffix to each Description cell (no extra row).
 * Text cells are formula-safe; money cells are written as-is.
 */
export function toCsvString(header, body, opts = {}) {
  const lines = [];
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const descIdx = header.indexOf('Description');
  lines.push(header.map(esc).join(','));
  for (const row of body) {
    const cells = row.map((v, i) => {
      if (MONEY_HEADERS.has(header[i])) return v;
      const text = opts.watermark && i === descIdx ? watermarkDescription(v) : v;
      return safeText(text);
    });
    lines.push(cells.map(esc).join(','));
  }
  return lines.join('\n') + '\n';
}

/** Output file name: input name without any extension, plus the free suffix and .csv. */
export function exportFileName(inputName, suffix = WATERMARK_SUFFIX) {
  let base = String(inputName || 'export').split(/[\\/]/).pop();
  const known = base.replace(/(\.(csv|tsv|txt|text|dat|png|jpe?g|gif|pdf|xlsx?|ods|numbers|json|xml))+$/i, '');
  base = (known !== base ? known : base.replace(/\.[A-Za-z][A-Za-z0-9]{0,4}$/, '')) || 'export';
  return base + suffix + '.csv';
}

export function freeTierAllows(txnCount) {
  return txnCount <= FREE_ROW_LIMIT;
}
