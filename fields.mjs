/**
 * QBO CSV Fixer - field synonyms, header-row detection, required-field check.
 * Every name is compared through headerKey() (see headers.mjs), so case, spacing,
 * punctuation, BOM and abbreviations like "Trans." or "Amt" do not matter.
 */
import { headerKey, findCol } from './headers.mjs';
import { parseDateParts } from './dates.mjs';

/** Synonyms per output field, in priority order (first match wins). */
export const FIELD_SYNONYMS = {
  date: [
    'date', 'transaction date', 'posted date', 'date posted', 'value date', 'booking date',
    'effective date', 'completed date', 'created', 'created utc', 'date of transaction', 'datetime',
  ],
  description: [
    'description', 'transaction description', 'memo', 'payee', 'payee name', 'details',
    'transaction details', 'narrative', 'merchant', 'merchant name', 'name', 'particulars',
  ],
  amount: ['amount', 'transaction amount', 'amount usd', 'net amount', 'net', 'value'],
  debit: [
    'debit', 'debits', 'debit amount', 'withdrawal', 'withdrawals', 'withdrawal amount',
    'money out', 'paid out', 'outflow', 'out',
  ],
  credit: [
    'credit', 'credits', 'credit amount', 'deposit', 'deposits', 'deposit amount',
    'money in', 'paid in', 'inflow', 'in',
  ],
};

export const FIELD_LABELS = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount (or Debit / Credit)',
};

/** Which synonym field a single header belongs to, or null. */
export function fieldOfHeader(h) {
  const k = headerKey(h);
  if (!k) return null;
  for (const [field, names] of Object.entries(FIELD_SYNONYMS)) {
    if (names.some((n) => headerKey(n) === k)) return field;
  }
  return null;
}

const EXTRA_HEADER_WORDS = new Set(['type', 'subject', 'gross', 'fee', 'status', 'state', 'category']);

/**
 * Does this row look like a header row? Needs a date-like name and a description-like or
 * money-like name, and no cell that parses as a date (so data rows never qualify).
 */
export function isHeaderRow(row) {
  if (!row || row.length < 2) return false;
  if (row.some((c) => parseDateParts(c) != null)) return false;
  const keys = row.map(headerKey);
  const fields = row.map(fieldOfHeader);
  const hasDate = fields.includes('date') || keys.some((k) => /(^| )date( |$)/.test(k));
  const hasDesc = fields.includes('description') || keys.some((k) => EXTRA_HEADER_WORDS.has(k));
  const hasMoney = fields.some((f) => f === 'amount' || f === 'debit' || f === 'credit');
  return hasDate && (hasDesc || hasMoney);
}

/** Generic mapping from synonyms only (no preset knowledge). */
export function mapBySynonyms(headers) {
  const taken = new Set();
  const out = {};
  for (const field of ['date', 'description', 'amount', 'debit', 'credit']) {
    const i = findCol(headers, FIELD_SYNONYMS[field], taken);
    out[field] = i;
    if (i >= 0) taken.add(i);
  }
  return out;
}

/** Required fields that are not mapped: date, description, and amount or debit/credit. */
export function missingRequired(cols) {
  const missing = [];
  if (!(cols.date >= 0)) missing.push('date');
  if (!(cols.description >= 0) && !(cols.descExtras && cols.descExtras.length)) missing.push('description');
  if (!(cols.amount >= 0) && !(cols.debit >= 0) && !(cols.credit >= 0)) missing.push('amount');
  return missing;
}

/** Human-readable error for unmapped required columns. */
export function mappingErrorMessage(missing, headers) {
  const names = missing.map((m) => FIELD_LABELS[m] || m).join(', ');
  const shown = headers.filter((h) => String(h).trim() !== '');
  const list = shown.length ? shown.map((h) => '"' + String(h).trim() + '"').join(', ') : '(none found)';
  return (
    `Could not find required column(s): ${names}. ` +
    `Headers in this file: ${list}. ` +
    'Pick the matching bank preset, or rename the headers to Date, Description and Amount (or Debit and Credit). Nothing was guessed.'
  );
}
