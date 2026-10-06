/**
 * QBO CSV Fixer - shared parse / map / reconcile logic (browser + Node).
 */

export const FREE_ROW_LIMIT = 100;
export const WATERMARK_SUFFIX = '_qbo-csv-fixer-free';
export const RECONCILE_TOLERANCE = 0.01;

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

/**
 * Normalize dates to MM/DD/YYYY for QBO.
 * Accepts MM/DD/YYYY, M/D/YY, YYYY-MM-DD, etc.
 */
export function normalizeDate(raw) {
  if (raw == null) return '';
  const t = String(raw).trim();
  if (!t) return '';

  // ISO-like YYYY-MM-DD
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return pad2(m[2]) + '/' + pad2(m[3]) + '/' + m[1];
  }

  // M/D/YYYY or M/D/YY
  m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let year = m[3];
    if (year.length === 2) {
      const y = Number(year);
      year = String(y >= 70 ? 1900 + y : 2000 + y);
    }
    return pad2(m[1]) + '/' + pad2(m[2]) + '/' + year;
  }

  return t;
}

function pad2(n) {
  const s = String(n);
  return s.length === 1 ? '0' + s : s;
}

function normHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ');
}

function isBalanceLabel(cell) {
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

function isOpeningLabel(cell) {
  const t = String(cell || '').trim().toLowerCase();
  return /^(beginning|opening)\s+balance/.test(t);
}

function isClosingLabel(cell) {
  const t = String(cell || '').trim().toLowerCase();
  return /^(ending|closing)\s+balance/.test(t);
}

function lastNonEmpty(row) {
  for (let i = row.length - 1; i >= 0; i--) {
    const v = String(row[i] ?? '').trim();
    if (v !== '') return v;
  }
  return '';
}

/** Column index helpers from header row */
function findCol(headers, aliases) {
  const norms = headers.map(normHeader);
  for (const a of aliases) {
    const i = norms.indexOf(a);
    if (i >= 0) return i;
  }
  // partial contains
  for (const a of aliases) {
    const i = norms.findIndex((h) => h === a || h.includes(a));
    if (i >= 0) return i;
  }
  return -1;
}

/**
 * Processor / bank presets: best-effort header maps.
 * Each returns { date, description, amount, debit, credit } column indices (-1 if missing)
 * plus optional transform hints.
 */
export const PRESETS = {
  generic_bank: {
    id: 'generic_bank',
    label: 'Generic bank (Chase-like)',
    hint: 'Beginning/Ending balance rows, Debit/Credit with parentheses negatives, mixed dates',
  },
  paypal: {
    id: 'paypal',
    label: 'PayPal',
    hint: 'Typical PayPal activity export (Date, Name/Type/Subject, Net/Gross)',
  },
  stripe: {
    id: 'stripe',
    label: 'Stripe',
    hint: 'Typical Stripe payouts/balance export (Created, Description, Amount, Fee, Net)',
  },
  wise: {
    id: 'wise',
    label: 'Wise',
    hint: 'Typical Wise statement (Date, Description, Amount, Running Balance)',
  },
};

export const QBO_PRESETS = {
  date_desc_amount: {
    id: 'date_desc_amount',
    label: 'Date / Description / Amount',
    columns: ['Date', 'Description', 'Amount'],
  },
  date_desc_debit_credit: {
    id: 'date_desc_debit_credit',
    label: 'Date / Description / Debit / Credit',
    columns: ['Date', 'Description', 'Debit', 'Credit'],
  },
};

function mapColumnsForPreset(headers, presetId) {
  const h = headers.map(normHeader);

  if (presetId === 'paypal') {
    return {
      date: findCol(headers, ['date', 'transaction date', 'transaction date time']),
      description: findCol(headers, [
        'name',
        'subject',
        'type',
        'description',
        'item title',
      ]),
      // Prefer Net for signed settlement; fallback Gross, Amount
      amount: findCol(headers, ['net', 'gross', 'amount']),
      debit: -1,
      credit: -1,
      // Extra: combine name + type if both exist
      descExtras: [
        findCol(headers, ['type']),
        findCol(headers, ['name']),
        findCol(headers, ['subject']),
      ].filter((i) => i >= 0),
    };
  }

  if (presetId === 'stripe') {
    return {
      date: findCol(headers, [
        'created',
        'created (utc)',
        'date',
        'available on',
        'arrival date',
      ]),
      description: findCol(headers, [
        'description',
        'type',
        'reporting category',
        'source',
      ]),
      amount: findCol(headers, ['net', 'amount', 'gross']),
      debit: -1,
      credit: -1,
      descExtras: [
        findCol(headers, ['type']),
        findCol(headers, ['description']),
      ].filter((i) => i >= 0),
    };
  }

  if (presetId === 'wise') {
    return {
      date: findCol(headers, ['date', 'transferwise id', 'finished on']),
      description: findCol(headers, [
        'description',
        'payment reference',
        'merchant',
        'name',
      ]),
      amount: findCol(headers, [
        'amount',
        'source amount',
        'target amount',
        'total amount',
      ]),
      debit: -1,
      credit: -1,
      descExtras: [],
    };
  }

  // generic_bank (default): Date, Description, Debit, Credit, Amount
  return {
    date: findCol(headers, ['date', 'transaction date', 'posted date', 'posting date']),
    description: findCol(headers, [
      'description',
      'memo',
      'payee',
      'name',
      'details',
      'narrative',
    ]),
    amount: findCol(headers, ['amount', 'transaction amount']),
    debit: findCol(headers, ['debit', 'withdrawal', 'withdrawals', 'money out', 'out']),
    credit: findCol(headers, ['credit', 'deposit', 'deposits', 'money in', 'in']),
    descExtras: [],
  };
}

function buildDescription(row, cols) {
  if (cols.descExtras && cols.descExtras.length > 1) {
    const parts = [];
    for (const i of cols.descExtras) {
      const v = String(row[i] ?? '').trim();
      if (v && !parts.includes(v)) parts.push(v);
    }
    if (parts.length) return parts.join(' | ');
  }
  if (cols.description >= 0) {
    return String(row[cols.description] ?? '').trim();
  }
  return '';
}

/**
 * Signed amount from Debit/Credit preferred when present; else Amount column.
 * Debit = money out (negative). Credit = money in (positive).
 * Parentheses already handled by parseAmount.
 */
function signedAmountFromRow(row, cols) {
  const hasDebitCol = cols.debit >= 0;
  const hasCreditCol = cols.credit >= 0;

  if (hasDebitCol || hasCreditCol) {
    const debitRaw = hasDebitCol ? row[cols.debit] : '';
    const creditRaw = hasCreditCol ? row[cols.credit] : '';
    const d = parseAmount(debitRaw);
    const c = parseAmount(creditRaw);

    // If Amount column empty (typical chase-like), build from D/C
    const amountRaw = cols.amount >= 0 ? row[cols.amount] : '';
    const a = parseAmount(amountRaw);

    if (d != null && d !== 0) {
      // Debit column value: treat as outflow. If already negative via (), keep sign magnitude as negative.
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
    return parseAmount(row[cols.amount]);
  }
  return null;
}

/**
 * Full parse of a CSV text with a named processor preset.
 * Returns { opening, closing, headerRowIndex, columns, transactions[], skippedSummary[] }
 */
export function processCsv(text, processorPresetId = 'generic_bank') {
  const rows = parseCsv(text);
  let opening = null;
  let closing = null;
  const skippedSummary = [];
  let headerRowIndex = -1;
  let headers = [];

  // First pass: find balance rows and header
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const first = String(row[0] ?? '').trim();
    if (isOpeningLabel(first)) {
      const amt = parseAmount(lastNonEmpty(row));
      if (amt != null) opening = amt;
      skippedSummary.push({ index: i, label: first, amount: amt });
      continue;
    }
    if (isClosingLabel(first)) {
      const amt = parseAmount(lastNonEmpty(row));
      if (amt != null) closing = amt;
      skippedSummary.push({ index: i, label: first, amount: amt });
      continue;
    }
    // Also detect balance-like in any cell of first column patterns already covered

    // Header detection: row containing Date-like + Description-like
    if (headerRowIndex < 0) {
      const norms = row.map(normHeader);
      const hasDate = norms.some((n) => n === 'date' || n.includes('date') || n === 'created' || n === 'created (utc)');
      const hasDesc = norms.some(
        (n) =>
          n === 'description' ||
          n === 'memo' ||
          n === 'payee' ||
          n === 'name' ||
          n === 'subject' ||
          n === 'details' ||
          n === 'type'
      );
      const hasAmt = norms.some(
        (n) =>
          n === 'amount' ||
          n === 'debit' ||
          n === 'credit' ||
          n === 'net' ||
          n === 'gross'
      );
      if (hasDate && (hasDesc || hasAmt)) {
        headerRowIndex = i;
        headers = row.map((c) => String(c).trim());
      }
    }
  }

  // If no header found, try row 0 or after opening
  if (headerRowIndex < 0 && rows.length) {
    headerRowIndex = opening != null ? 1 : 0;
    if (headerRowIndex < rows.length) {
      headers = rows[headerRowIndex].map((c) => String(c).trim());
    }
  }

  const cols = mapColumnsForPreset(headers, processorPresetId);
  const transactions = [];

  for (let i = 0; i < rows.length; i++) {
    if (i === headerRowIndex) continue;
    const row = rows[i];
    const first = String(row[0] ?? '').trim();
    if (isBalanceLabel(first)) continue;

    // Skip rows that look like empty or non-transaction
    const dateRaw = cols.date >= 0 ? row[cols.date] : row[0];
    const dateNorm = normalizeDate(dateRaw);
    // Must look like a date
    if (!dateNorm || !/\d/.test(dateNorm)) continue;
    // Reject if first cell is a balance label somehow missed
    if (isBalanceLabel(dateRaw)) continue;

    const description = buildDescription(row, cols);
    const amount = signedAmountFromRow(row, cols);
    if (amount == null) continue;

    transactions.push({
      date: dateNorm,
      description: description || '(no description)',
      amount,
      sourceRow: i + 1,
    });
  }

  const net = round2(transactions.reduce((s, t) => s + t.amount, 0));
  const reconcile = reconcileBalances(opening, closing, net);

  return {
    opening,
    closing,
    net,
    headerRowIndex,
    headers,
    columns: cols,
    transactions,
    skippedSummary,
    reconcile,
    processorPresetId,
  };
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function reconcileBalances(opening, closing, net) {
  if (opening == null || closing == null) {
    return {
      status: 'N/A',
      expectedClosing: null,
      delta: null,
      message: 'No beginning/ending balances found in file',
    };
  }
  const expected = round2(opening + net);
  const delta = round2(closing - expected);
  const ok = Math.abs(delta) <= RECONCILE_TOLERANCE;
  return {
    status: ok ? 'PASS' : 'FAIL',
    expectedClosing: expected,
    delta,
    message: ok
      ? 'Opening + transactions match ending balance'
      : `Opening + transactions = ${fmtMoney(expected)}, ending = ${fmtMoney(closing)}, delta = ${fmtMoney(delta)}`,
  };
}

export function fmtMoney(n) {
  if (n == null || !Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toFixed(2);
}

/** Build export rows for a QBO preset */
export function buildExportRows(transactions, qboPresetId) {
  if (qboPresetId === 'date_desc_debit_credit') {
    const header = ['Date', 'Description', 'Debit', 'Credit'];
    const body = transactions.map((t) => {
      const debit = t.amount < 0 ? Math.abs(t.amount).toFixed(2) : '';
      const credit = t.amount > 0 ? t.amount.toFixed(2) : '';
      // zero amounts: leave both empty or put on credit as 0.00
      const d = t.amount === 0 ? '' : debit;
      const c = t.amount === 0 ? '0.00' : credit;
      return [t.date, t.description, d, c];
    });
    return { header, body };
  }
  // default Date / Description / Amount
  const header = ['Date', 'Description', 'Amount'];
  const body = transactions.map((t) => [
    t.date,
    t.description,
    t.amount.toFixed(2),
  ]);
  return { header, body };
}

export function toCsvString(header, body, opts = {}) {
  const lines = [];
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  lines.push(header.map(esc).join(','));
  for (const row of body) {
    lines.push(row.map(esc).join(','));
  }
  if (opts.watermark) {
    // Watermark row: comment-like marker in Description-compatible shape
    if (header.length === 3) {
      lines.push(['', 'WATERMARK: QBO CSV Fixer free tier', '0.00'].map(esc).join(','));
    } else if (header.length === 4) {
      lines.push(['', 'WATERMARK: QBO CSV Fixer free tier', '', '0.00'].map(esc).join(','));
    } else {
      lines.push(header.map((_, i) => (i === 1 ? 'WATERMARK: QBO CSV Fixer free tier' : '')).map(esc).join(','));
    }
  }
  return lines.join('\n') + '\n';
}

export function freeTierAllows(txnCount) {
  return txnCount <= FREE_ROW_LIMIT;
}
