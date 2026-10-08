/**
 * QBO CSV Fixer - input (bank / processor) and output (QBO) preset metadata.
 */

/**
 * Bank / processor input presets. Column layouts and sign conventions are
 * documented with source URLs in VERIFY.md.
 *  - defaultDateOrder: used only when A/B dates are ambiguous and the user has not chosen.
 *  - slug: how-to page name (<slug>-csv-to-quickbooks-online.html), when one exists.
 *  - sample: fixture under samples/.
 */
export const PRESETS = {
  generic_bank: {
    id: 'generic_bank',
    label: 'Generic bank (Chase-like)',
    hint: 'Beginning/Ending balance rows, Debit/Credit with parentheses negatives, mixed dates',
    defaultDateOrder: 'mdy',
    sample: 'samples/chase-like-messy.csv',
  },
  chase: {
    id: 'chase',
    label: 'Chase (checking or credit card)',
    hint: 'Checking: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #. Card: Transaction Date, Post Date, Description, Category, Type, Amount, Memo. Amount is already signed (money out negative).',
    defaultDateOrder: 'mdy',
    slug: 'chase',
    sample: 'samples/chase-checking.csv',
  },
  bofa: {
    id: 'bofa',
    label: 'Bank of America (checking)',
    hint: 'Summary block (Beginning balance, Total credits, Total debits, Ending balance) above Date, Description, Amount, Running Bal. Summary rows feed the reconcile badge and are not exported.',
    defaultDateOrder: 'mdy',
    slug: 'bank-of-america',
    sample: 'samples/bank-of-america.csv',
  },
  wells_fargo: {
    id: 'wells_fargo',
    label: 'Wells Fargo',
    hint: 'No header row. 5 columns by position: Date, Amount (signed), *, Check Number, Description. The first row is a real transaction and is kept.',
    defaultDateOrder: 'mdy',
    headerless: true,
    slug: 'wells-fargo',
    sample: 'samples/wells-fargo.csv',
  },
  amex: {
    id: 'amex',
    label: 'American Express',
    hint: 'Date, Description, Card Member, Account #, Amount. Amex writes charges as positive and payments/credits as negative, so every sign is flipped for QBO (charges become money out).',
    defaultDateOrder: 'mdy',
    invertAmount: true,
    slug: 'amex',
    sample: 'samples/amex.csv',
  },
  capital_one: {
    id: 'capital_one',
    label: 'Capital One (credit card)',
    hint: 'Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit. Debit and Credit are both positive; Debit becomes money out. Uses Transaction Date.',
    defaultDateOrder: 'mdy',
    slug: 'capital-one',
    sample: 'samples/capital-one.csv',
  },
  revolut: {
    id: 'revolut',
    label: 'Revolut (personal account statement)',
    hint: 'Type, Product, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance. Only COMPLETED rows are exported; Fee is subtracted from Amount; uses Completed Date.',
    defaultDateOrder: 'dmy',
    slug: 'revolut',
    sample: 'samples/revolut.csv',
  },
  paypal: {
    id: 'paypal',
    label: 'PayPal',
    hint: 'Activity download (Date, Time, TimeZone, Name, Type, Status, Currency, Gross, Fee, Net, ...). Uses Net. Skips Balance Impact = Memo rows, or non-Completed/Refunded/Reversed status when Balance Impact is absent.',
    defaultDateOrder: 'mdy',
    slug: 'paypal',
    sample: 'samples/paypal.csv',
  },
  stripe: {
    id: 'stripe',
    label: 'Stripe',
    hint: 'Balance transactions export (id, Type, Source, Amount, Fee, Net, Currency, Created (UTC), ...). Uses Net; payouts are negative (money leaving the Stripe balance).',
    defaultDateOrder: 'mdy',
    slug: 'stripe',
    sample: 'samples/stripe.csv',
  },
  wise: {
    id: 'wise',
    label: 'Wise',
    hint: 'Balance statement (TransferWise ID, Date, Amount, Currency, Description, Payment Reference, Running Balance, ...). Amount is signed. Dates are DD-MM-YYYY.',
    defaultDateOrder: 'dmy',
    slug: 'wise',
    sample: 'samples/wise.csv',
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
