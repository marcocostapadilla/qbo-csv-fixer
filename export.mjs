/**
 * QBO CSV Fixer - QBO export rows, CSV writer, free-tier limits.
 */

export const FREE_ROW_LIMIT = 100;
export const WATERMARK_SUFFIX = '_qbo-csv-fixer-free';

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
  const body = transactions.map((t) => [
    t.date,
    t.description,
    t.amount.toFixed(2),
  ]);
  return { header, body };
}

export function toCsvString(header, body, opts = {}) {
  const lines = [];
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  lines.push(header.map(esc).join(','));
  for (const row of body) {
    lines.push(row.map(esc).join(','));
  }
  if (opts.watermark) {
    // Watermark row: comment-like marker in Description-compatible shape
    if (header.length === 3) {
      lines.push(['', 'WATERMARK: QBO CSV Fixer free tier', '0.00'].map(esc).join(','));
    } else if (header.length === 4) {
      lines.push(['', 'WATERMARK: QBO CSV Fixer free tier', '', '0.00'].map(esc).join(','));
    } else {
      lines.push(header.map((_, i) => (i === 1 ? 'WATERMARK: QBO CSV Fixer free tier' : '')).map(esc).join(','));
    }
  }
  return lines.join('\n') + '\n';
}

export function freeTierAllows(txnCount) {
  return txnCount <= FREE_ROW_LIMIT;
}
