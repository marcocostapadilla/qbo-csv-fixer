/**
 * QBO CSV Fixer - bank and card input presets (v1, v1.1).
 * Layouts and sign conventions are sourced in VERIFY.md.
 *
 * Preset fields:
 *  - columns: aliases per field, in priority order (compared with headerKey, so fuzzy).
 *    'synonyms' means: use the generic synonym table in fields.mjs.
 *    Fields: date, dateFallback, description, amount, debit, credit, fee, status,
 *    balanceImpact, checkNumber, descExtras (list of alias lists joined with " | ").
 *  - detect: header rules; a preset matches a row when every `all` name is present,
 *    at least one `any` name is present (if given), and no `none` name is present.
 *  - signatures: header lists used to score drifted files when no rule matches.
 *  - defaultDateOrder: used only when A/B dates are ambiguous and the user has not chosen.
 *  - slug: how-to page (<slug>-csv-to-quickbooks-online.html). sample: fixture under samples/.
 */
export const BANK_PRESETS = {
  generic_bank: {
    id: 'generic_bank',
    label: 'Generic bank (Chase-like)',
    hint: 'Beginning/Ending balance rows, Debit/Credit with parentheses negatives, mixed dates',
    defaultDateOrder: 'mdy',
    sample: 'samples/chase-like-messy.csv',
    columns: 'synonyms',
  },
  chase: {
    id: 'chase',
    label: 'Chase (checking or credit card)',
    hint: 'Checking: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #. Card: Transaction Date, Post Date, Description, Category, Type, Amount, Memo. Amount is already signed (money out negative).',
    defaultDateOrder: 'mdy',
    slug: 'chase',
    sample: 'samples/chase-checking.csv',
    columns: {
      date: ['transaction date', 'posting date', 'date'],
      description: ['description'],
      amount: ['amount'],
    },
    detect: [
      { all: ['details', 'posting date', 'description', 'amount'] },
      { all: ['transaction date', 'post date', 'description', 'category', 'type', 'amount'] },
    ],
    signatures: [
      ['details', 'posting date', 'description', 'amount', 'type', 'balance', 'check or slip #'],
      ['transaction date', 'post date', 'description', 'category', 'type', 'amount', 'memo'],
    ],
  },
  bofa: {
    id: 'bofa',
    label: 'Bank of America (checking)',
    hint: 'Summary block (Beginning balance, Total credits, Total debits, Ending balance) above Date, Description, Amount, Running Bal. Summary rows feed the reconcile badge and are not exported.',
    defaultDateOrder: 'mdy',
    slug: 'bank-of-america',
    sample: 'samples/bank-of-america.csv',
    columns: {
      date: ['date', 'posted date', 'posting date'],
      description: ['description', 'payee'],
      amount: ['amount'],
    },
    detect: [
      { all: ['description', 'summary amt.'] },
      { all: ['date', 'description', 'amount', 'running bal.'], none: ['transferwise id', 'payment reference'] },
    ],
    signatures: [['date', 'description', 'amount', 'running bal.']],
  },
  wells_fargo: {
    id: 'wells_fargo',
    label: 'Wells Fargo',
    hint: 'No header row. 5 columns by position: Date, Amount (signed), *, Check Number, Description. The first row is a real transaction and is kept.',
    defaultDateOrder: 'mdy',
    headerless: true,
    slug: 'wells-fargo',
    sample: 'samples/wells-fargo.csv',
    columns: {
      date: ['date'],
      amount: ['amount'],
      checkNumber: ['check number', 'check'],
      description: ['description'],
    },
  },
  amex: {
    id: 'amex',
    label: 'American Express',
    hint: 'Date, Description, Card Member, Account #, Amount. Amex writes charges as positive and payments/credits as negative, so every sign is flipped for QBO (charges become money out).',
    defaultDateOrder: 'mdy',
    invertAmount: true,
    slug: 'amex',
    sample: 'samples/amex.csv',
    columns: {
      date: ['date'],
      description: ['description', 'appears on your statement as'],
      amount: ['amount'],
    },
    detect: [{ all: ['card member', 'amount'] }],
    signatures: [['date', 'description', 'card member', 'account #', 'amount']],
  },
  capital_one: {
    id: 'capital_one',
    label: 'Capital One (credit card)',
    hint: 'Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit. Debit and Credit are both positive; Debit becomes money out. Uses Transaction Date.',
    defaultDateOrder: 'mdy',
    slug: 'capital-one',
    sample: 'samples/capital-one.csv',
    columns: {
      date: ['transaction date', 'posted date', 'date'],
      dateFallback: ['posted date'],
      description: ['description'],
      debit: ['debit'],
      credit: ['credit'],
      amount: ['amount', 'transaction amount'],
    },
    detect: [{ all: ['card no.', 'debit', 'credit'], any: ['posted date', 'transaction date'] }],
    signatures: [['transaction date', 'posted date', 'card no.', 'description', 'category', 'debit', 'credit']],
  },
};
