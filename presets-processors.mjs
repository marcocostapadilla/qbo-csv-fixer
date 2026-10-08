/**
 * QBO CSV Fixer - fintech and payment processor input presets (v1.1).
 * Same preset fields as presets-banks.mjs. Layouts are sourced in VERIFY.md.
 */
export const PROCESSOR_PRESETS = {
  revolut: {
    id: 'revolut',
    label: 'Revolut (personal account statement)',
    hint: 'Type, Product, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance. Only COMPLETED rows are exported; Fee is subtracted from Amount; uses Completed Date.',
    defaultDateOrder: 'dmy',
    slug: 'revolut',
    sample: 'samples/revolut.csv',
    columns: {
      date: ['completed date'],
      dateFallback: ['started date'],
      description: ['description'],
      amount: ['amount'],
      fee: ['fee'],
      status: ['state'],
    },
    keepStatus: ['completed'],
    detect: [{ all: ['started date', 'completed date', 'state', 'amount'] }],
    signatures: [['type', 'product', 'started date', 'completed date', 'description', 'amount', 'fee', 'currency', 'state', 'balance']],
  },
  paypal: {
    id: 'paypal',
    label: 'PayPal',
    hint: 'Activity download (Date, Time, TimeZone, Name, Type, Status, Currency, Gross, Fee, Net, ...). Uses Net. Skips Balance Impact = Memo rows, or non-Completed/Refunded/Reversed status when Balance Impact is absent.',
    defaultDateOrder: 'mdy',
    slug: 'paypal',
    sample: 'samples/paypal.csv',
    columns: {
      date: ['date', 'transaction date', 'transaction date time'],
      description: ['name', 'subject', 'type', 'description', 'item title'],
      // Prefer Net for signed settlement; fallback Gross, Amount
      amount: ['net', 'gross', 'amount'],
      status: ['status'],
      balanceImpact: ['balance impact'],
      descExtras: [['type'], ['name'], ['subject']],
    },
    detect: [{ all: ['gross', 'fee', 'net'], any: ['timezone', 'balance impact', 'transaction id'] }],
    signatures: [['date', 'time', 'timezone', 'name', 'type', 'status', 'currency', 'gross', 'fee', 'net', 'transaction id', 'balance impact']],
  },
  stripe: {
    id: 'stripe',
    label: 'Stripe',
    hint: 'Balance transactions export (id, Type, Source, Amount, Fee, Net, Currency, Created (UTC), ...). Uses Net; payouts are negative (money leaving the Stripe balance).',
    defaultDateOrder: 'mdy',
    slug: 'stripe',
    sample: 'samples/stripe.csv',
    columns: {
      date: ['created (utc)', 'created', 'created date (utc)', 'date', 'available on (utc)', 'available on'],
      description: ['description', 'type', 'reporting category', 'source'],
      amount: ['net', 'amount', 'gross'],
      descExtras: [['type'], ['description']],
    },
    detect: [{ all: ['created (utc)'] }, { all: ['id', 'type', 'source', 'amount', 'fee', 'net'] }],
    signatures: [['id', 'type', 'source', 'amount', 'fee', 'net', 'currency', 'created (utc)', 'available on (utc)', 'description']],
  },
  wise: {
    id: 'wise',
    label: 'Wise',
    hint: 'Balance statement (TransferWise ID, Date, Amount, Currency, Description, Payment Reference, Running Balance, ...). Amount is signed. Dates are DD-MM-YYYY.',
    defaultDateOrder: 'dmy',
    slug: 'wise',
    sample: 'samples/wise.csv',
    columns: {
      date: ['date', 'finished on', 'created on'],
      description: ['description', 'payment reference', 'merchant', 'name'],
      amount: ['amount', 'source amount', 'target amount', 'total amount'],
      descExtras: [['description'], ['payment reference']],
    },
    detect: [{ all: ['transferwise id'] }, { all: ['payment reference', 'running balance'] }],
    signatures: [['transferwise id', 'date', 'amount', 'currency', 'description', 'payment reference', 'running balance', 'exchange from', 'exchange to', 'merchant', 'total fees']],
  },
};
