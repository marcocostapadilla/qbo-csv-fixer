/**
 * QBO CSV Fixer - CSV text parsing with delimiter sniffing.
 * Money parsing lives in money.mjs (re-exported here for older imports).
 */
export { parseAmount } from './money.mjs';

export const DELIMITERS = [',', ';', '\t', '|'];

/** Count each candidate delimiter outside quotes, per line, for the first non-empty lines. */
function delimiterCounts(s, maxLines = 12) {
  const lines = [];
  let counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQuotes = false;
  let nonEmpty = false;
  for (let i = 0; i < s.length && lines.length < maxLines; i++) {
    const ch = s[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === '\n') {
      if (nonEmpty) lines.push(counts);
      counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
      nonEmpty = false;
    } else if (!inQuotes && ch in counts) counts[ch]++;
    if (!inQuotes && ch.trim() && ch !== '\r') nonEmpty = true;
  }
  if (nonEmpty && lines.length < maxLines) lines.push(counts);
  return lines;
}

/**
 * Guess the delimiter: the candidate found on the most lines with the most consistent count.
 * Comma wins ties, so plain US files never change behavior.
 */
export function sniffDelimiter(text) {
  const s = String(text ?? '').replace(/^\uFEFF/, '');
  const lines = delimiterCounts(s);
  if (!lines.length) return ',';
  let best = ',';
  let bestScore = -1;
  for (const d of DELIMITERS) {
    const per = lines.map((c) => c[d]);
    const withD = per.filter((n) => n > 0);
    if (!withD.length) continue;
    const mode = withD.sort((a, b) => withD.filter((x) => x === b).length - withD.filter((x) => x === a).length)[0];
    const consistent = per.filter((n) => n === mode).length;
    const score = consistent * 100 + per.filter((n) => n > 0).length;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Parse a CSV string into rows of string cells (handles quoted fields, embedded newlines,
 * doubled quotes, CRLF and a leading BOM). delimiter: ',' ';' '\t' '|' or undefined to sniff.
 */
export function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const s = String(text ?? '').replace(/^\uFEFF/, '');
  const delim = delimiter || sniffDelimiter(s);

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\r') {
      // skip; handle \r\n via \n
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/**
 * Reject input that is not CSV text at all. Returns null when fine, else a message.
 * Binary files (PNG, PDF, XLSX) read as text carry NUL bytes, replacement characters or
 * many control characters.
 */
export function rejectReason(text) {
  const s = String(text ?? '').replace(/^\uFEFF/, '');
  if (!s.trim()) return 'This file is empty, so there is nothing to convert. Download the transactions from your bank again as a CSV file.';
  const sample = s.slice(0, 4096);
  let bad = 0;
  for (const ch of sample) {
    const c = ch.charCodeAt(0);
    if (c === 0 || c === 0xfffd || (c < 32 && c !== 9 && c !== 10 && c !== 13)) bad++;
  }
  if (sample.startsWith('%PDF')) return 'This is a PDF, and this tool reads CSV files only. In your bank\'s download screen, choose CSV instead of PDF.';
  if (bad > 0 && bad / sample.length > 0.01) {
    return 'This file is not CSV text (it looks like an image, PDF or Excel workbook), so it cannot be read. Download a CSV from your bank, or in Excel use File > Save As > CSV.';
  }
  return null;
}
