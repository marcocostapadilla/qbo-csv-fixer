/**
 * v1.5.16: the general layout reads Amount as signed. Some unrecognized banks export Amount
 * unsigned and say the direction in another column (Type = DR / CR, or Debit / Credit). The
 * general layout cannot know that, so every row would be money in. No guessing: say so clearly.
 */
import { findCol } from './headers.mjs';

export const TYPE_NOTE = 'Check before you upload:';
const DIR = new Set(['dr', 'cr', 'debit', 'credit']);
const OUT = new Set(['dr', 'debit']);

export function unsignedTypeNote(rows, headers) {
  const a = findCol(headers, ['amount', 'transaction amount']);
  if (a < 0 || rows.length < 2) return [];
  const amts = rows.map((r) => String(r[a] ?? '').trim()).filter(Boolean);
  if (!amts.length || amts.some((v) => /^[-(]|-$|\)$/.test(v))) return [];
  for (let c = 0; c < headers.length; c++) {
    if (c === a) continue;
    const vals = rows.map((r) => String(r[c] ?? '').trim().toLowerCase()).filter(Boolean);
    if (vals.length < 2 || !vals.every((v) => DIR.has(v))) continue;
    const outs = vals.filter((v) => OUT.has(v)).length;
    if (!outs) continue;
    const name = headers[c] || `column ${c + 1}`;
    const word = vals.find((v) => OUT.has(v)).toUpperCase();
    return [`${TYPE_NOTE} Amount has no minus signs, and the "${name}" column marks ${outs} row(s) as ${word} (money out). The general layout does not read that column, so those rows are exported as money in. Do not upload this file as it is. In a spreadsheet, put a minus sign before each ${word} amount, save as CSV and drop it here again.`];
  }
  return [];
}
