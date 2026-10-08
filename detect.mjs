/**
 * QBO CSV Fixer - guess the input preset from a file's header / shape.
 */
import { parseCsv } from './parse.mjs';
import { parseDateParts } from './dates.mjs';
import { normHeader } from './headers.mjs';

export function looksLikeAmount(cell) {
  const t = String(cell ?? '').trim();
  return t !== '' && /^[($+-]*\$?[\d,]+(\.\d+)?\)?$/.test(t.replace(/\s/g, ''));
}

/** True when a row looks like a Wells Fargo headerless data row. */
export function isWellsFargoDataRow(row) {
  return (
    row.length >= 5 &&
    parseDateParts(row[0]) != null &&
    looksLikeAmount(row[1]) &&
    /^\*?$/.test(String(row[2] ?? '').trim())
  );
}

/**
 * Guess the input preset from the file's header / shape.
 * Returns a PRESETS id; 'generic_bank' when nothing specific matches.
 */
export function detectPreset(text) {
  const rows = parseCsv(text).slice(0, 25);
  if (!rows.length) return 'generic_bank';
  const allNorms = rows.map((r) => r.map(normHeader));
  const has = (norms, ...names) => names.every((n) => norms.includes(n));

  // Bank of America summary block or its transaction header
  for (const n of allNorms) {
    if (n[0] === 'description' && n.includes('summary amt.')) return 'bofa';
    if (has(n, 'date', 'description', 'amount', 'running bal.')) return 'bofa';
  }
  if (isWellsFargoDataRow(rows[0]) && rows.slice(0, 5).every((r) => isWellsFargoDataRow(r))) return 'wells_fargo';

  for (const n of allNorms) {
    if (has(n, 'started date', 'completed date', 'state') && n.includes('amount')) return 'revolut';
    if (n.includes('transferwise id') || has(n, 'payment reference', 'running balance')) return 'wise';
    if (has(n, 'card no.', 'debit', 'credit') && (n.includes('posted date') || n.includes('transaction date'))) {
      return 'capital_one';
    }
    if (n.includes('card member') && n.includes('amount')) return 'amex';
    if (has(n, 'gross', 'fee', 'net') && (n.includes('timezone') || n.includes('balance impact') || n.includes('transaction id'))) {
      return 'paypal';
    }
    if (n.includes('created (utc)') || (has(n, 'id', 'type', 'source', 'amount', 'fee', 'net'))) return 'stripe';
    if (has(n, 'details', 'posting date', 'description', 'amount')) return 'chase';
    if (has(n, 'transaction date', 'post date', 'description', 'category', 'type', 'amount')) return 'chase';
  }
  return 'generic_bank';
}
