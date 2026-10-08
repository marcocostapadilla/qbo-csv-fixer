/**
 * QBO CSV Fixer - presets added in v1.2: Citi, U.S. Bank, PNC, Discover, Mercury.
 * Same preset fields as presets-banks.mjs. Layout sources: VERIFY-presets-v12.md.
 * TD Bank, Relay and Novo were not added: no public source shows their CSV header row.
 */
export const V12_PRESETS = {
  citi: {
    id: 'citi',
    label: 'Citi (credit card)',
    hint: 'Status, Date, Description, Debit, Credit (newer files add Member Name). Debit = money out, Credit = money in (written positive or negative). Pending rows are left out and listed.',
    defaultDateOrder: 'mdy',
    slug: 'citi',
    sample: 'samples/citi.csv',
    columns: {
      date: ['date'],
      description: ['description'],
      debit: ['debit'],
      credit: ['credit'],
      status: ['status'],
    },
    keepStatus: ['cleared'],
    statusLabel: 'Status',
    detect: [{ all: ['status', 'date', 'description', 'debit', 'credit'] }],
    signatures: [['status', 'date', 'description', 'debit', 'credit', 'member name']],
  },
  us_bank: {
    id: 'us_bank',
    label: 'U.S. Bank',
    hint: 'Date, Transaction, Name, Memo, Amount. Amount is signed (debits negative). Name is used as the description.',
    defaultDateOrder: 'mdy',
    slug: 'us-bank',
    sample: 'samples/us-bank.csv',
    columns: {
      date: ['date'],
      description: ['name', 'description'],
      amount: ['amount'],
    },
    detect: [{ all: ['date', 'transaction', 'name', 'memo', 'amount'] }],
    signatures: [['date', 'transaction', 'name', 'memo', 'amount']],
  },
  pnc: {
    id: 'pnc',
    label: 'PNC',
    hint: 'Date, Description, Withdrawals, Deposits, Balance. Withdrawals become money out, Deposits money in. These headers are common to many banks, so PNC is not auto-detected: pick it here or use the PNC guide link.',
    defaultDateOrder: 'mdy',
    slug: 'pnc',
    sample: 'samples/pnc.csv',
    columns: {
      date: ['date'],
      description: ['description'],
      debit: ['withdrawals', 'withdrawal'],
      credit: ['deposits', 'deposit'],
    },
  },
  discover: {
    id: 'discover',
    label: 'Discover (credit card)',
    hint: 'Trans. Date, Post Date, Description, Amount, Category. Discover writes purchases as positive and payments/credits as negative, so every sign is flipped for QBO. Uses Trans. Date.',
    defaultDateOrder: 'mdy',
    invertAmount: true,
    slug: 'discover',
    sample: 'samples/discover.csv',
    columns: {
      date: ['trans. date', 'transaction date'],
      dateFallback: ['post date'],
      description: ['description'],
      amount: ['amount'],
    },
    // No signature score: every Discover header is generic, so only the exact header rule detects it.
    detect: [{ all: ['trans. date', 'post date', 'description', 'amount', 'category'], none: ['type', 'card no.'] }],
  },
  mercury: {
    id: 'mercury',
    label: 'Mercury',
    hint: 'Date (UTC), Description, Amount, Status, Source Account, Bank Description, ... Amount is signed. Only Sent rows are exported; Pending, Failed and other statuses are left out and listed. Dates are MM-DD-YYYY.',
    defaultDateOrder: 'mdy',
    slug: 'mercury',
    sample: 'samples/mercury.csv',
    columns: {
      date: ['date (utc)', 'date'],
      description: ['description', 'bank description'],
      amount: ['amount'],
      status: ['status'],
    },
    keepStatus: ['sent'],
    statusLabel: 'Status',
    detect: [{ all: ['date (utc)', 'source account'] }, { all: ['bank description', 'source account', 'amount'] }],
    signatures: [['date (utc)', 'description', 'amount', 'status', 'source account', 'bank description', 'reference', 'note', 'last four digits', 'name on card', 'category', 'gl code', 'timestamp', 'original currency']],
  },
};
