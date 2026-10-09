/**
 * QBO CSV Fixer - QBO export rows, CSV writer, free-tier limits.
 *
 * Free watermark: filename only (WATERMARK_SUFFIX). No extra row (a blank-date 0.00 row can make
 * QBO reject the file or import a $0 line) and no description suffix: descriptions are exported
 * exactly as read, so QBO bank rules keyed on exact descriptions keep matching.
 *
 * Formula injection: text cells that start with = + - @ tab or CR get a leading apostrophe so
 * Excel / Sheets show them as text. Amount, Debit and Credit cells are never touched.
 */

export const FREE_ROW_LIMIT = 100;
export const WATERMARK_SUFFIX = '_qbo-csv-fixer-free';
const MONEY_HEADERS = new Set(['Amount', 'Debit', 'Credit']);

/** Neutralize spreadsheet formulas in a text cell. */
export function safeText(v) {
  const s = String(v ?? '');
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Build export rows for a QBO preset */
export function buildExportRows(transactions, qboPresetId) {
  if (qboPresetId === 'date_desc_debit_credit') {
    const header = ['Date', 'Description', 'Debit', 'Credit'];
    const body = transactions.map((t) => {
      const debit = t.amount < 0 ? Math.abs(t.amount).toFixed(2) : '';
      const credit = t.amount > 0 ? t.amount.toFixed(2) : '';
      // v1.5: Intuit asks for cells that only contain zero to be left blank
      return [t.date, t.description, debit, credit];
    });
    return { header, body };
  }
  // default Date / Description / Amount
  const header = ['Date', 'Description', 'Amount'];
  const body = transactions.map((t) => [t.date, t.description, t.amount === 0 ? '' : t.amount.toFixed(2)]);
  return { header, body };
}

/**
 * Write CSV text. Free and Pro write the same cells (the free watermark is the filename only).
 * Text cells are formula-safe; money cells are written as-is.
 */
export function toCsvString(header, body) {
  const lines = [];
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  lines.push(header.map(esc).join(','));
  for (const row of body) {
    const cells = row.map((v, i) => (MONEY_HEADERS.has(header[i]) ? v : safeText(v)));
    lines.push(cells.map(esc).join(','));
  }
  return lines.join('\n') + '\n';
}

/** Output file name: input name without any extension, plus the suffix (free: WATERMARK_SUFFIX) and .csv. */
export function exportFileName(inputName, suffix = WATERMARK_SUFFIX) {
  let base = String(inputName || 'export').split(/[\\/]/).pop();
  const known = base.replace(/(\.(csv|tsv|txt|text|dat|png|jpe?g|gif|pdf|xlsx?|ods|numbers|json|xml))+$/i, '');
  base = (known !== base ? known : base.replace(/\.[A-Za-z][A-Za-z0-9]{0,4}$/, '')) || 'export';
  return base + suffix + '.csv';
}

export function freeTierAllows(txnCount) {
  return txnCount <= FREE_ROW_LIMIT;
}

/**
 * v1.5: Intuit's stated rules for Banking > Upload from file (sources in VERIFY.md):
 * 350 KB or less, up to 1,000 lines per upload, and a Debit/Credit file with only money out
 * can fail. The free row cap (100) keeps the first two out of reach; they are checked anyway.
 */
export const QBO_MAX_BYTES = 350 * 1024;
export const QBO_MAX_ROWS = 1000;
export function qboLimitNotes(header, body) {
  const notes = [];
  const bytes = new TextEncoder().encode(toCsvString(header, body)).length;
  if (body.length > QBO_MAX_ROWS) notes.push(`QuickBooks Online takes up to ${QBO_MAX_ROWS} lines per upload; this export has ${body.length}. Upload it in smaller date ranges.`);
  if (bytes > QBO_MAX_BYTES) notes.push(`QuickBooks Online takes files of 350 KB or less; this export is ${Math.ceil(bytes / 1024)} KB. Upload it in smaller date ranges.`);
  const ci = header.indexOf('Credit');
  if (ci >= 0 && body.length && body.every((r) => !r[ci])) notes.push('This Debit/Credit file has money out only. QuickBooks can reject that; pick the Date / Description / Amount layout instead.');
  return notes;
}
