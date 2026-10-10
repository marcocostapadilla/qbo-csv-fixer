/**
 * v1.5.5: Navy Federal Credit Union and Apple Card exports. Sources in VERIFY-presets-v155.md.
 */
import { findCol } from './headers.mjs';

/** Navy Federal writes every Amount positive; Credit Debit Indicator says which way it went. */
function nfcuFixRow(row, headers) {
  const a = findCol(headers, ['amount']);
  const ind = findCol(headers, ['credit debit indicator']);
  if (a < 0 || ind < 0) return;
  const v = String(row[a] ?? '').trim().replace(/^[+-]/, '');
  const way = String(row[ind] ?? '').trim().toLowerCase();
  if (!v) return;
  if (way === 'debit') row[a] = '-' + v;
  else if (way === 'credit') row[a] = v;
  else row[a] = ''; // unknown direction: never guess, the row is listed as left out
}

export const V155_PRESETS = {
  navy_federal: {
    id: 'navy_federal',
    label: 'Navy Federal Credit Union',
    hint: 'Checking or card export (Posting Date, Transaction Date, Amount, Credit Debit Indicator, type, ..., Description, Category, ...). Amount is always positive; Credit Debit Indicator sets the sign (Debit = money out, Credit = money in). Uses Posting Date, as on the statement. A row with any other indicator is left out and listed.',
    defaultDateOrder: 'mdy',
    slug: 'navy-federal',
    sample: 'samples/navy-federal.csv',
    columns: {
      date: ['posting date'],
      description: ['description'],
      amount: ['amount'],
    },
    fixRow: nfcuFixRow,
    detect: [{ all: ['posting date', 'amount', 'credit debit indicator', 'description'] }],
    signatures: [['posting date', 'transaction date', 'amount', 'credit debit indicator', 'type', 'type group', 'reference', 'description', 'category', 'check serial number', 'card ending']],
  },
  apple_card: {
    id: 'apple_card',
    label: 'Apple Card',
    hint: 'Apple Card export (Transaction Date, Clearing Date, Description, Merchant, Category, Type, Amount (USD), Purchased By). Apple writes purchases positive and payments negative, so every sign is flipped for QBO (purchases become money out). Uses Transaction Date.',
    defaultDateOrder: 'mdy',
    invertAmount: true,
    slug: 'apple-card',
    sample: 'samples/apple-card.csv',
    columns: {
      date: ['transaction date'],
      description: ['description'],
      amount: ['amount (usd)'],
    },
    detect: [{ all: ['transaction date', 'clearing date', 'merchant', 'amount (usd)'] }],
    signatures: [['transaction date', 'clearing date', 'description', 'merchant', 'category', 'type', 'amount (usd)', 'purchased by']],
  },
};
