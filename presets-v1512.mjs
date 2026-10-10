/**
 * v1.5.12: TD Bank and USAA exports. Sources in VERIFY-presets-v1512.md.
 */
import { findCol } from './headers.mjs';

/**
 * TD writes descriptions with a comma unquoted ("EGOV STRATEGIES, SERVICE"), which pushes every
 * later cell one column right (the Debit lands in Credit). One extra cell: join it back.
 */
function tdFixRow(row, headers) {
  const d = findCol(headers, ['description']);
  if (d < 0 || row.length !== headers.length + 1) return;
  row.splice(d, 2, `${row[d]},${row[d + 1]}`);
}
export const V1512_PRESETS = {
  td_bank: {
    id: 'td_bank',
    label: 'TD Bank',
    hint: 'TD Bank export (Date, Bank RTN, Account Number, Transaction Type, Description, Debit, Credit, Check Number, Account Running Balance). Debit and Credit are both positive; Debit becomes money out. Dates are YYYY-MM-DD. The running balance feeds the reconcile badge.',
    defaultDateOrder: 'mdy',
    slug: 'td-bank',
    sample: 'samples/td-bank.csv',
    columns: {
      date: ['date'],
      description: ['description'],
      debit: ['debit'],
      credit: ['credit'],
      checkNumber: ['check number'],
    },
    fixRow: tdFixRow,
    detect: [{ all: ['bank rtn', 'account running balance', 'debit', 'credit'] }],
    signatures: [['date', 'bank rtn', 'account number', 'transaction type', 'description', 'debit', 'credit', 'check number', 'account running balance']],
  },
  usaa: {
    id: 'usaa',
    label: 'USAA',
    hint: 'USAA export (Date, Description, Original Description, Category, Amount, Status). Amount is already signed: money out negative. Only Posted rows are exported; Pending and Scheduled bill pay rows are left out and listed. Files without a Status column are read as they are.',
    defaultDateOrder: 'mdy',
    slug: 'usaa',
    sample: 'samples/usaa.csv',
    columns: {
      date: ['date'],
      description: ['description'],
      amount: ['amount'],
      status: ['status'],
    },
    keepStatus: ['posted'],
    statusLabel: 'Status',
    detect: [{ all: ['date', 'description', 'original description', 'category', 'amount'] }],
  },
};
