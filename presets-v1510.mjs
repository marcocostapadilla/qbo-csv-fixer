/**
 * v1.5.10: Capital One 360 checking/savings export. Header source: public exports in
 * github.com/becauseimclever/BudgetExperiment (sample data/capone.csv),
 * github.com/nozzlegear/foxy-balance (assets/capital-one-example-transactions.csv),
 * github.com/ubahmapk/ynab-format-csv (resources/CapitalOne-Transactions.csv). See VERIFY-presets-v1510.md.
 * Transaction Amount is unsigned; Transaction Type (Debit / Credit) gives the sign.
 */
import { findCol } from './headers.mjs';

function signFromType(row, headers) {
  const a = findCol(headers, ['transaction amount']);
  const t = findCol(headers, ['transaction type']);
  if (a < 0 || t < 0) return;
  const v = String(row[a] ?? '').trim();
  if (String(row[t] ?? '').trim().toLowerCase() === 'debit' && v && !v.startsWith('-')) row[a] = '-' + v;
}

export const V1510_PRESETS = {
  capital_one_360: {
    id: 'capital_one_360',
    label: 'Capital One 360 (checking or savings)',
    hint: 'Capital One 360 export (Account Number, Transaction Description, Transaction Date, Transaction Type, Transaction Amount, Balance). Amounts are unsigned; Transaction Type Debit becomes money out, Credit money in. The Balance column feeds the reconcile badge.',
    defaultDateOrder: 'mdy',
    sample: 'samples/capital-one-360.csv',
    columns: {
      date: ['transaction date'],
      description: ['transaction description'],
      amount: ['transaction amount'],
    },
    fixRow: signFromType,
    detect: [{ all: ['account number', 'transaction description', 'transaction date', 'transaction type', 'transaction amount', 'balance'] }],
    signatures: [['account number', 'transaction description', 'transaction date', 'transaction type', 'transaction amount', 'balance']],
  },
};
