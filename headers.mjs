/**
 * QBO CSV Fixer - header normalization, fuzzy column lookup, balance-row labels.
 *
 * headerKey() is the fuzzy form used for every header comparison:
 *  - strips BOM / zero-width characters, turns non-breaking spaces into spaces
 *  - lowercases, turns '#' into 'number' and '&' into 'and'
 *  - turns every other punctuation run into one space and trims
 *  - folds common abbreviations: Trans./Txn -> transaction, Post/Posting -> posted,
 *    No./Num -> number, Amt -> amount, Desc -> description, Bal. -> balance, Ref -> reference
 * So "Trans. Date", " TRANSACTION  DATE " and "Transaction_Date" all become "transaction date".
 */

const TOKEN_FOLDS = {
  trans: 'transaction',
  txn: 'transaction',
  tran: 'transaction',
  transactions: 'transaction',
  post: 'posted',
  posting: 'posted',
  no: 'number',
  num: 'number',
  nbr: 'number',
  amt: 'amount',
  desc: 'description',
  descr: 'description',
  bal: 'balance',
  ref: 'reference',
  dt: 'date',
};

export function headerKey(h) {
  const s = String(h ?? '')
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
    .replace(/\u00A0/g, ' ')
    .toLowerCase()
    .replace(/#/g, ' number ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!s) return '';
  return s
    .split(' ')
    .map((t) => TOKEN_FOLDS[t] || t)
    .join(' ');
}

/** v1.1 normalization (kept for callers that want the light form). */
export function normHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ');
}

export function isBalanceLabel(cell) {
  return isOpeningLabel(cell) || isClosingLabel(cell);
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

/** True when every token of `alias` appears, in order and adjacent, among the tokens of `key`. */
function containsTokens(key, alias) {
  return (' ' + key + ' ').includes(' ' + alias + ' ');
}

/**
 * Find a column for a list of aliases (in priority order), comparing headerKey() forms.
 * Exact match first; then a whole-word "contains" match for aliases of 4+ characters,
 * so short aliases like "in" / "out" never grab "Posting Date" or "Running Bal.".
 * `taken` (optional Set of indexes) is skipped so two fields never share a column.
 */
export function findCol(headers, aliases, taken) {
  const keys = headers.map(headerKey);
  const free = (i) => !taken || !taken.has(i);
  const akeys = aliases.map(headerKey).filter(Boolean);
  for (const a of akeys) {
    const i = keys.findIndex((k, j) => k === a && free(j));
    if (i >= 0) return i;
  }
  for (const a of akeys) {
    if (a.length < 4) continue;
    const i = keys.findIndex((k, j) => free(j) && containsTokens(k, a));
    if (i >= 0) return i;
  }
  return -1;
}
