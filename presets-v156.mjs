/**
 * v1.5.6: Ally Bank and Cash App exports. Sources in VERIFY-presets-v156.md.
 */
import { findCol } from './headers.mjs';

/** Cash App dates can carry a time and US zone ("2023-07-16 16:51:24 PDT"): keep the calendar date as written. */
function cashAppFixRow(row, headers) {
  const d = findCol(headers, ['date']);
  if (d < 0) return;
  const m = String(row[d] ?? '').trim().match(/^(\S+)\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[A-Z]{2,4})?$/);
  if (m) row[d] = m[1];
}

export const V156_PRESETS = {
  ally: {
    id: 'ally',
    label: 'Ally Bank',
    hint: 'Ally export (Date, Time, Amount, Type, Description; the headers have a space after each comma). Amount is already signed: withdrawals negative, deposits positive. Dates are YYYY-MM-DD; the Time column is dropped. No balances in the file, so the reconcile badge shows N/A.',
    defaultDateOrder: 'mdy',
    slug: 'ally',
    sample: 'samples/ally.csv',
    columns: {
      date: ['date'],
      description: ['description'],
      amount: ['amount'],
    },
    detect: [{ all: ['date', 'time', 'amount', 'type', 'description'] }],
  },
  cash_app: {
    id: 'cash_app',
    label: 'Cash App',
    hint: 'Cash App statement export (Transaction ID, Date, Transaction Type, Currency, Amount, Fee, Net Amount, ..., Status, Notes, Name of sender/receiver, Account). Uses Net Amount (after the Cash App fee), already signed. Description is Transaction Type | Notes | Name. Failed, canceled, declined and pending rows are left out and listed.',
    defaultDateOrder: 'mdy',
    slug: 'cash-app',
    sample: 'samples/cash-app.csv',
    columns: {
      date: ['date'],
      amount: ['net amount'],
      status: ['status'],
      descExtras: [['transaction type'], ['notes'], ['name of sender/receiver']],
    },
    fixRow: cashAppFixRow,
    skipStatus: ['failed', 'canceled', 'cancelled', 'declined', 'pending', 'waiting on recipient', 'payment failed', 'payment canceled'],
    detect: [{ all: ['transaction id', 'transaction type', 'net amount', 'asset type'] }],
    signatures: [['transaction id', 'date', 'transaction type', 'currency', 'amount', 'fee', 'net amount', 'asset type', 'asset price', 'asset amount', 'status', 'notes', 'name of sender/receiver', 'account']],
  },
};
