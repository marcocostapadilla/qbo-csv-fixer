/**
 * v1.5.17: a picked preset (user or deep link) that cannot read this file. Said plainly instead of
 * a silent fallback: the preset's own money column is not in the file (it was only filled from the
 * general synonyms), required columns are missing, or nothing could be converted.
 */
import { PRESETS } from './presets.mjs';

const MONEY = ['amount', 'debit', 'credit'];
const GENERAL = new Set(['generic_bank']);

export function presetMismatch(r, presetId) {
  const p = PRESETS[presetId];
  if (!p || GENERAL.has(presetId) || !p.columns || p.columns === 'synonyms' || !r || r.fileError) return null;
  const via = (r.mapping && r.mapping.viaSynonyms) || [];
  const missing = r.mappingError ? r.mappingError.missing || [] : [];
  const money = MONEY.filter((f) => p.columns[f]);
  const moneyBorrowed = money.length > 0 && !money.some((f) => r.columns && r.columns[f] >= 0 && !via.includes(f));
  const none = !r.mappingError && !r.transactions.length;
  if (!moneyBorrowed && !missing.length && !none) return null;
  const need = [...new Set([...missing, ...via.filter((f) => MONEY.includes(f) || missing.length), ...(moneyBorrowed ? money : [])])]
    .map((f) => p.columns[f] && p.columns[f][0]).filter(Boolean).map((h) => `"${h.replace(/\b\w/g, (c) => c.toUpperCase())}"`);
  const why = need.length ? `it needs the column(s) ${need.join(' and ')}, which this file doesn't have` : 'no rows in this file could be converted with it';
  return `${p.label} can't read this file: ${why}. Try "${PRESETS.generic_bank.label}" in the list, or the bank the file came from.`;
}
