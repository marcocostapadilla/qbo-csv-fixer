/**
 * QBO CSV Fixer - date parsing, US/EU order detection, MM/DD/YYYY output.
 */

/**
 * Split a raw date cell into parts.
 * Returns { kind: 'iso', y, m, d } for YYYY-MM-DD (never ambiguous),
 * { kind: 'pair', a, b, y } for A/B/YYYY style (A/B could be M/D or D/M),
 * or null when it does not look like a date.
 * Trailing times ("2026-01-03 10:12:45", "2026-01-03T10:12:45Z") are ignored.
 */
export function parseDateParts(raw) {
  if (raw == null) return null;
  let t = String(raw).trim();
  if (!t) return null;
  // Drop a trailing time component
  t = t.replace(/[T\s]+\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?\s*(Z|[AaPp][Mm]|[+-]\d{2}:?\d{2})?$/, '').trim();

  let m = t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) {
    return { kind: 'iso', y: m[1], m: Number(m[2]), d: Number(m[3]) };
  }
  m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let year = m[3];
    if (year.length === 2) {
      const y = Number(year);
      year = String(y >= 70 ? 1900 + y : 2000 + y);
    } else if (year.length === 3) {
      return null;
    }
    return { kind: 'pair', a: Number(m[1]), b: Number(m[2]), y: year };
  }
  return null;
}

/**
 * Decide whether A/B dates in a file are US M/D or EU D/M.
 * - Only 'pair' dates count; ISO dates are never ambiguous.
 * - If any first component > 12, the file is D/M. If any second component > 12, it is M/D.
 * - If every first and second component is <= 12, the file is ambiguous.
 * Returns { ambiguous, detected: 'mdy'|'dmy'|null, conflict, pairCount, isoCount }.
 */
export function detectDateOrder(rawDates) {
  let pairCount = 0;
  let isoCount = 0;
  let firstOver12 = false;
  let secondOver12 = false;
  for (const raw of rawDates) {
    const p = parseDateParts(raw);
    if (!p) continue;
    if (p.kind === 'iso') {
      isoCount++;
      continue;
    }
    pairCount++;
    if (p.a > 12) firstOver12 = true;
    if (p.b > 12) secondOver12 = true;
  }
  if (pairCount === 0) {
    return { ambiguous: false, detected: null, conflict: false, pairCount, isoCount };
  }
  if (firstOver12 && secondOver12) {
    // Mixed file: cannot be a single order. Flag it so the UI warns.
    return { ambiguous: true, detected: null, conflict: true, pairCount, isoCount };
  }
  if (firstOver12) return { ambiguous: false, detected: 'dmy', conflict: false, pairCount, isoCount };
  if (secondOver12) return { ambiguous: false, detected: 'mdy', conflict: false, pairCount, isoCount };
  return { ambiguous: true, detected: null, conflict: false, pairCount, isoCount };
}

/**
 * Normalize dates to MM/DD/YYYY for QBO.
 * order: 'mdy' (US, default) or 'dmy' (EU) for A/B/YYYY dates. ISO is unaffected.
 * Returns the trimmed input unchanged when it does not look like a date.
 */
export function normalizeDate(raw, order = 'mdy') {
  if (raw == null) return '';
  const t = String(raw).trim();
  if (!t) return '';
  const p = parseDateParts(t);
  if (!p) return t;
  if (p.kind === 'iso') return pad2(p.m) + '/' + pad2(p.d) + '/' + p.y;
  const month = order === 'dmy' ? p.b : p.a;
  const day = order === 'dmy' ? p.a : p.b;
  return pad2(month) + '/' + pad2(day) + '/' + p.y;
}

function pad2(n) {
  const s = String(n);
  return s.length === 1 ? '0' + s : s;
}
