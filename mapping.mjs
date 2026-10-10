/**
 * QBO CSV Fixer - per-preset column mapping, description and signed amount rules.
 * Column aliases live in the preset data (presets-*.mjs); this file applies them.
 */
import { parseAmount } from './parse.mjs';
import { findCol } from './headers.mjs';
import { FIELD_SYNONYMS, mapBySynonyms } from './fields.mjs';
import { PRESETS } from './presets.mjs';

export const NO_COL = -1;

export function baseCols(extra) {
  return Object.assign(
    {
      date: NO_COL,
      dateFallback: NO_COL,
      description: NO_COL,
      amount: NO_COL,
      debit: NO_COL,
      credit: NO_COL,
      fee: NO_COL,
      status: NO_COL,
      balanceImpact: NO_COL,
      checkNumber: NO_COL,
      action: NO_COL,
      descExtras: [],
      viaSynonyms: [],
    },
    extra
  );
}

// Debit/Credit before Amount so a drifted "Debit Amount" header is never taken as Amount.
const SINGLE_FIELDS = ['date', 'dateFallback', 'debit', 'credit', 'amount', 'description', 'fee', 'status', 'balanceImpact', 'checkNumber'];

/** Apply a preset's alias lists to a header row; two fields never share a column. */
function mapByAliases(headers, spec) {
  const out = {};
  const taken = new Set();
  for (const f of SINGLE_FIELDS) {
    if (!spec[f]) continue;
    out[f] = findCol(headers, spec[f], taken);
    if (out[f] >= 0) taken.add(out[f]);
  }
  if (spec.descExtras) {
    out.descExtras = spec.descExtras.map((aliases) => findCol(headers, aliases)).filter((i) => i >= 0);
  }
  return baseCols(out);
}

/**
 * Fill required fields a preset could not find from the generic synonym table
 * (header drift: "Posting Date" for "Date", "Paid out" for "Debit", ...).
 * Every filled field is listed in cols.viaSynonyms so the UI can show it.
 * Presets that flip signs only borrow a single Amount column, never Debit/Credit.
 */
function fillFromSynonyms(headers, cols, preset) {
  const used = new Set(
    [cols.date, cols.description, cols.amount, cols.debit, cols.credit].filter((i) => i >= 0)
  );
  const take = (field) => {
    const i = findCol(headers, FIELD_SYNONYMS[field], used);
    if (i >= 0) {
      cols[field] = i;
      used.add(i);
      cols.viaSynonyms.push(field);
    }
  };
  if (cols.date < 0) take('date');
  if (cols.description < 0 && !cols.descExtras.length) take('description');
  if (cols.amount < 0 && cols.debit < 0 && cols.credit < 0) {
    take('amount');
    if (cols.amount < 0 && !preset.invertAmount) {
      take('debit');
      take('credit');
    }
  }
  return cols;
}

/**
 * v1.5.13: an Action column (Fidelity) is the description fallback for rows whose Description is
 * empty or a placeholder (see buildDescription). Files without an Action column are unchanged.
 */
export function mapColumnsForPreset(headers, presetId) {
  const cols = mapColumnsBase(headers, presetId);
  const a = findCol(headers, ['action']);
  if (a >= 0 && a !== cols.description && !(cols.descExtras || []).includes(a)) cols.action = a;
  return cols;
}

function mapColumnsBase(headers, presetId) {
  const preset = PRESETS[presetId] || PRESETS.generic_bank;

  if (preset.columns === 'synonyms' || !preset.columns) {
    return baseCols(mapBySynonyms(headers));
  }

  if (preset.id === 'wells_fargo') {
    // Header row is optional (users sometimes add one); fall back to positions.
    const byName = mapByAliases(headers, preset.columns);
    if (byName.date >= 0 && byName.amount >= 0 && byName.description >= 0) return byName;
    return baseCols({ date: 0, amount: 1, checkNumber: 3, description: 4, byPosition: true });
  }

  return fillFromSynonyms(headers, mapByAliases(headers, preset.columns), preset);
}

/** Description cells that say nothing; replaced by Action when the file has one (v1.5.13). */
export const PLACEHOLDER_DESC = /^(?:no description|n\/a|-+)$/i;

export function buildDescription(row, cols) {
  if (cols.descExtras && cols.descExtras.length > 1) {
    const parts = [];
    for (const i of cols.descExtras) {
      const v = String(row[i] ?? '').trim();
      if (v && !parts.some((x) => x.includes(v))) parts.push(v);
    }
    if (parts.length) return parts.join(' | ');
  }
  let d = cols.description >= 0 ? String(row[cols.description] ?? '').trim() : '';
  if (cols.action >= 0 && (!d || PLACEHOLDER_DESC.test(d))) d = String(row[cols.action] ?? '').trim() || d;
  if (cols.checkNumber >= 0) {
    const chk = String(row[cols.checkNumber] ?? '').trim();
    if (chk && !d.includes(chk)) d = d ? `${d} (check ${chk})` : `CHECK ${chk}`;
  }
  return d;
}

/**
 * Signed amount from Debit/Credit preferred when present; else Amount column.
 * Debit = money out (negative). Credit = money in (positive).
 * Parentheses, trailing minus, CR/DR and comma decimals are handled by parseAmount (money.mjs).
 * Returns null when no money cell can be read (the caller lists the row as left out).
 */
export function signedAmountFromRow(row, cols, numOpts = {}) {
  const hasDebitCol = cols.debit >= 0;
  const hasCreditCol = cols.credit >= 0;

  if (hasDebitCol || hasCreditCol) {
    const d = parseAmount(hasDebitCol ? row[cols.debit] : '', numOpts);
    const c = parseAmount(hasCreditCol ? row[cols.credit] : '', numOpts);
    // If Amount column empty (typical chase-like), build from D/C
    const a = parseAmount(cols.amount >= 0 ? row[cols.amount] : '', numOpts);

    if (d != null && d !== 0) {
      // Debit column value: treat as outflow. If already negative via (), keep it negative.
      return d > 0 ? -d : d;
    }
    if (c != null && c !== 0) {
      return c < 0 ? -c : c; // credit positive
    }
    // Both empty but Amount filled
    if (a != null) return a;
    // Both zero/empty
    if (d === 0 || c === 0) return 0;
    return null;
  }

  if (cols.amount >= 0) {
    return parseAmount(row[cols.amount], numOpts);
  }
  return null;
}

/** Row filter by status columns. Returns null to keep, or a skip reason string. */
export function statusSkipReason(row, cols, presetId) {
  const preset = PRESETS[presetId] || {};
  if (preset.keepStatus && cols.status >= 0) {
    const st = String(row[cols.status] ?? '').trim();
    if (st && !preset.keepStatus.includes(st.toLowerCase())) return `${preset.statusLabel || 'State'} ${st.toUpperCase()}`;
  }
  // v1.4: deny-list (Shopify payouts list: scheduled, failed, ... never reached the bank)
  if (preset.skipStatus && cols.status >= 0) {
    const st = String(row[cols.status] ?? '').trim();
    if (preset.skipStatus.includes(st.toLowerCase())) return `${preset.statusLabel || 'Status'} ${st.toUpperCase()}`;
  }
  if (presetId === 'paypal') {
    if (cols.balanceImpact >= 0) {
      const bi = String(row[cols.balanceImpact] ?? '').trim().toLowerCase();
      if (bi === 'memo') return 'Balance Impact Memo';
    } else if (cols.status >= 0) {
      const st = String(row[cols.status] ?? '').trim().toLowerCase();
      if (st && !['completed', 'refunded', 'reversed'].includes(st)) return `Status ${row[cols.status]}`;
    }
  }
  return null;
}

/** Which header feeds each output field (for the visible "Columns used" note). */
export function describeMapping(headers, cols) {
  const name = (i) => (i >= 0 ? (cols.byPosition ? `column ${i + 1}` : headers[i] || `column ${i + 1}`) : null);
  return {
    date: name(cols.date),
    description: cols.descExtras && cols.descExtras.length > 1 ? cols.descExtras.map(name).join(' + ') : name(cols.description) + (cols.action >= 0 && cols.description >= 0 ? ` (${name(cols.action)} when empty)` : ''),
    amount: name(cols.amount),
    debit: name(cols.debit),
    credit: name(cols.credit),
    viaSynonyms: cols.viaSynonyms || [],
    byPosition: !!cols.byPosition,
  };
}
