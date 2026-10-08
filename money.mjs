/**
 * QBO CSV Fixer - money parsing and per-file decimal convention.
 *
 * parseAmount handles: ($14.99) and -14.99 and 14.99- (trailing minus), +14.99,
 * CR / DR suffixes or prefixes (CR = money in, DR = money out, unless a preset says otherwise),
 * currency symbols ($ € £ ¥ ₹ ...) and ISO codes (USD, EUR, ...), spaces, apostrophe and
 * thousands separators, and comma decimals when the file uses them (opts.decimal = ',').
 * Anything else returns null; callers list such rows as "left out", never drop them silently.
 */

const CURRENCY_SYMBOLS = /[$€£¥₹₩₽₺₪₫฿₱₦]/g;
const CURRENCY_CODE = /^(USD|EUR|GBP|CAD|AUD|NZD|CHF|JPY|CNY|INR|MXN|BRL|SEK|NOK|DKK|PLN|CZK|HUF|ZAR|SGD|HKD)\b|\b(USD|EUR|GBP|CAD|AUD|NZD|CHF|JPY|CNY|INR|MXN|BRL|SEK|NOK|DKK|PLN|CZK|HUF|ZAR|SGD|HKD)$/i;

/**
 * Strip everything around the digits. Returns { body, sign, crdr } or null for empty input.
 * body keeps only digits and the separators . and , ; sign is -1 or +1.
 */
export function splitAmount(raw) {
  if (raw == null) return null;
  let t = String(raw).replace(/[\u00A0\u202F]/g, ' ').trim();
  if (!t) return null;
  let sign = 1;
  let crdr = null;
  const cd = t.match(/^(CR|DR)\b\.?\s*|\s*\b(CR|DR)\.?$/i);
  if (cd) {
    crdr = (cd[1] || cd[2]).toUpperCase();
    t = t.replace(cd[0], '').trim();
  }
  t = t.replace(CURRENCY_CODE, '').trim();
  if (/^\(.*\)$/.test(t)) {
    sign = -sign;
    t = t.slice(1, -1).trim();
  }
  t = t.replace(CURRENCY_SYMBOLS, '').trim();
  if (/^[-\u2212]/.test(t)) {
    sign = -sign;
    t = t.slice(1).trim();
  } else if (t.startsWith('+')) {
    t = t.slice(1).trim();
  }
  if (/-$/.test(t)) {
    sign = -sign;
    t = t.slice(0, -1).trim();
  }
  t = t.replace(CURRENCY_SYMBOLS, '').replace(/[\s']/g, '');
  return { body: t, sign, crdr };
}

/**
 * Parse money. opts.decimal: '.' (default) or ','. opts.crdr: sign for CR / DR suffixes,
 * default { CR: 1, DR: -1 }. Returns a number or null when the cell is empty or unreadable.
 */
export function parseAmount(raw, opts = {}) {
  const parts = splitAmount(raw);
  if (!parts) return null;
  let t = parts.body;
  if (opts.decimal === ',') {
    t = t.replace(/\./g, '').replace(',', '.');
  } else {
    t = t.replace(/,/g, '');
  }
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  let sign = parts.sign;
  if (parts.crdr) {
    const map = opts.crdr || { CR: 1, DR: -1 };
    sign = map[parts.crdr] < 0 ? -1 : 1;
    if (parts.sign < 0) sign = -sign;
  }
  return sign < 0 ? -Math.abs(n) : n;
}

/** One value's vote: '.', ',', 'either' (like 1,250 or 1.250) or null (no separator). */
function decimalVote(body) {
  const hasDot = body.includes('.');
  const hasComma = body.includes(',');
  if (hasDot && hasComma) return body.lastIndexOf(',') > body.lastIndexOf('.') ? ',' : '.';
  if (!hasDot && !hasComma) return null;
  const sep = hasDot ? '.' : ',';
  const other = hasDot ? ',' : '.';
  const groups = body.split(sep);
  if (groups.length > 2) return other; // 1,234,567 or 1.234.567: separators are thousands
  const tail = groups[1];
  if (tail.length === 3 && /^\d{1,3}$/.test(groups[0])) return 'either';
  return sep;
}

/**
 * Decide the decimal separator for a file from its raw amount cells.
 * Returns { decimal: '.'|',', ambiguous, conflict, dotVotes, commaVotes, eitherCount }.
 * ambiguous: no value proves the convention but some could be read both ways (1,250 / 1.250).
 * conflict: some values only work with '.', others only with ','.
 * When ambiguous or in conflict the default is '.', and the UI must ask the user.
 */
export function detectDecimal(rawValues) {
  let dotVotes = 0;
  let commaVotes = 0;
  let eitherCount = 0;
  for (const raw of rawValues) {
    const p = splitAmount(raw);
    if (!p || !/^[\d.,]+$/.test(p.body)) continue;
    const v = decimalVote(p.body);
    if (v === '.') dotVotes++;
    else if (v === ',') commaVotes++;
    else if (v === 'either') eitherCount++;
  }
  const conflict = dotVotes > 0 && commaVotes > 0;
  if (conflict) return { decimal: '.', ambiguous: true, conflict, dotVotes, commaVotes, eitherCount };
  if (commaVotes > 0) return { decimal: ',', ambiguous: false, conflict, dotVotes, commaVotes, eitherCount };
  if (dotVotes > 0) return { decimal: '.', ambiguous: false, conflict, dotVotes, commaVotes, eitherCount };
  return { decimal: '.', ambiguous: eitherCount > 0, conflict, dotVotes, commaVotes, eitherCount };
}
