/**
 * QBO CSV Fixer - header normalization, column lookup, balance-row labels.
 */

export function normHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ');
}

export function isBalanceLabel(cell) {
  const t = String(cell || '').trim().toLowerCase();
  return (
    /^(beginning|opening)\s+balance/.test(t) ||
    /^(ending|closing)\s+balance/.test(t) ||
    t === 'beginning balance' ||
    t === 'ending balance' ||
    t === 'opening balance' ||
    t === 'closing balance'
  );
}

export function isOpeningLabel(cell) {
  const t = String(cell || '').trim().toLowerCase();
  return /^(beginning|opening)\s+balance/.test(t);
}

export function isClosingLabel(cell) {
  const t = String(cell || '').trim().toLowerCase();
  return /^(ending|closing)\s+balance/.test(t);
}

export function lastNonEmpty(row) {
  for (let i = row.length - 1; i >= 0; i--) {
    const v = String(row[i] ?? '').trim();
    if (v !== '') return v;
  }
  return '';
}

/**
 * Column index helpers from header row.
 * Exact alias match first; partial "contains" match only for aliases of 4+ chars,
 * so short aliases like "in" / "out" cannot grab "Posting Date" or "Running Bal.".
 */
export function findCol(headers, aliases) {
  const norms = headers.map(normHeader);
  for (const a of aliases) {
    const i = norms.indexOf(a);
    if (i >= 0) return i;
  }
  for (const a of aliases) {
    if (a.length < 4) continue;
    const i = norms.findIndex((h) => h.includes(a));
    if (i >= 0) return i;
  }
  return -1;
}
