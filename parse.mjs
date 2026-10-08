/**
 * QBO CSV Fixer - CSV text and money parsing.
 */

/** Parse a CSV string into rows of string cells (handles quoted fields). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const s = String(text).replace(/^\uFEFF/, '');

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
    } else if (ch === ',') {
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

/** Parse money: ($14.99) -> -14.99, 12.50 -> 12.50, empty -> null */
export function parseAmount(raw) {
  if (raw == null) return null;
  let t = String(raw).trim();
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) {
    neg = true;
    t = t.slice(1, -1).trim();
  }
  t = t.replace(/[$,\s]/g, '');
  if (t.startsWith('-')) {
    neg = !neg;
    t = t.slice(1);
  }
  if (t.startsWith('+')) t = t.slice(1);
  if (!t || !/^-?\d+(\.\d+)?$/.test(t) && !/^\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return neg ? -Math.abs(n) : n;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}
