/**
 * QBO CSV Fixer - per-preset column mapping, description and signed amount rules.
 */
import { parseAmount } from './parse.mjs';
import { findCol } from './headers.mjs';

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
      descExtras: [],
    },
    extra
  );
}

export function mapColumnsForPreset(headers, presetId) {
  if (presetId === 'paypal') {
    return baseCols({
      date: findCol(headers, ['date', 'transaction date', 'transaction date time']),
      description: findCol(headers, ['name', 'subject', 'type', 'description', 'item title']),
      // Prefer Net for signed settlement; fallback Gross, Amount
      amount: findCol(headers, ['net', 'gross', 'amount']),
      status: findCol(headers, ['status']),
      balanceImpact: findCol(headers, ['balance impact']),
      descExtras: [findCol(headers, ['type']), findCol(headers, ['name']), findCol(headers, ['subject'])].filter(
        (i) => i >= 0
      ),
    });
  }

  if (presetId === 'stripe') {
    return baseCols({
      date: findCol(headers, ['created (utc)', 'created', 'created date (utc)', 'date', 'available on (utc)', 'available on']),
      description: findCol(headers, ['description', 'type', 'reporting category', 'source']),
      amount: findCol(headers, ['net', 'amount', 'gross']),
      descExtras: [findCol(headers, ['type']), findCol(headers, ['description'])].filter((i) => i >= 0),
    });
  }

  if (presetId === 'wise') {
    return baseCols({
      date: findCol(headers, ['date', 'finished on', 'created on']),
      description: findCol(headers, ['description', 'payment reference', 'merchant', 'name']),
      amount: findCol(headers, ['amount', 'source amount', 'target amount', 'total amount']),
      descExtras: [findCol(headers, ['description']), findCol(headers, ['payment reference'])].filter((i) => i >= 0),
    });
  }

  if (presetId === 'chase') {
    return baseCols({
      date: findCol(headers, ['posting date', 'transaction date', 'post date', 'date']),
      description: findCol(headers, ['description']),
      amount: findCol(headers, ['amount']),
    });
  }

  if (presetId === 'bofa') {
    return baseCols({
      date: findCol(headers, ['date', 'posted date', 'posting date']),
      description: findCol(headers, ['description', 'payee']),
      amount: findCol(headers, ['amount']),
    });
  }

  if (presetId === 'amex') {
    return baseCols({
      date: findCol(headers, ['date']),
      description: findCol(headers, ['description', 'appears on your statement as']),
      amount: findCol(headers, ['amount']),
    });
  }

  if (presetId === 'capital_one') {
    return baseCols({
      date: findCol(headers, ['transaction date', 'posted date', 'date']),
      dateFallback: findCol(headers, ['posted date']),
      description: findCol(headers, ['description']),
      debit: findCol(headers, ['debit']),
      credit: findCol(headers, ['credit']),
      amount: findCol(headers, ['amount', 'transaction amount']),
    });
  }

  if (presetId === 'revolut') {
    return baseCols({
      date: findCol(headers, ['completed date']),
      dateFallback: findCol(headers, ['started date']),
      description: findCol(headers, ['description']),
      amount: findCol(headers, ['amount']),
      fee: findCol(headers, ['fee']),
      status: findCol(headers, ['state']),
    });
  }

  if (presetId === 'wells_fargo') {
    // Header row is optional (users sometimes add one); fall back to positions.
    const byName = baseCols({
      date: findCol(headers, ['date']),
      amount: findCol(headers, ['amount']),
      checkNumber: findCol(headers, ['check number', 'check']),
      description: findCol(headers, ['description']),
    });
    if (byName.date >= 0 && byName.amount >= 0 && byName.description >= 0) return byName;
    return baseCols({ date: 0, amount: 1, checkNumber: 3, description: 4 });
  }

  // generic_bank (default): Date, Description, Debit, Credit, Amount
  return baseCols({
    date: findCol(headers, ['date', 'transaction date', 'posted date', 'posting date']),
    description: findCol(headers, ['description', 'memo', 'payee', 'name', 'details', 'narrative']),
    amount: findCol(headers, ['amount', 'transaction amount']),
    debit: findCol(headers, ['debit', 'withdrawal', 'withdrawals', 'money out', 'out']),
    credit: findCol(headers, ['credit', 'deposit', 'deposits', 'money in', 'in']),
  });
}

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
  if (cols.checkNumber >= 0) {
    const chk = String(row[cols.checkNumber] ?? '').trim();
    if (chk && !d.includes(chk)) d = d ? `${d} (check ${chk})` : `CHECK ${chk}`;
  }
  return d;
}

/**
 * Signed amount from Debit/Credit preferred when present; else Amount column.
 * Debit = money out (negative). Credit = money in (positive).
 * Parentheses already handled by parseAmount.
 */
export function signedAmountFromRow(row, cols) {
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

/** Row filter by status columns. Returns null to keep, or a skip reason string. */
export function statusSkipReason(row, cols, presetId) {
  if (presetId === 'revolut' && cols.status >= 0) {
    const st = String(row[cols.status] ?? '').trim().toUpperCase();
    if (st && st !== 'COMPLETED') return `State ${st}`;
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
