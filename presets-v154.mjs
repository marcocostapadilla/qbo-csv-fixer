/**
 * v1.5.4: Bank of America credit card export (Posted Date, Reference Number, Payee, Address, Amount).
 * Sources in VERIFY-presets-v154.md. Amount is signed in the file: charges negative, payments and
 * credits positive, so it is used as is.
 */
export const V154_PRESETS = {
  bofa_card: {
    id: 'bofa_card',
    label: 'Bank of America (credit card)',
    hint: 'Credit card export (Posted Date, Reference Number, Payee, Address, Amount). Amount is already signed: charges negative (money out), payments and refunds positive (money in). Payee is the description. No balances in the file, so the reconcile badge shows N/A.',
    defaultDateOrder: 'mdy',
    slug: 'bank-of-america',
    sample: 'samples/bank-of-america-card.csv',
    columns: {
      date: ['posted date'],
      description: ['payee'],
      amount: ['amount'],
    },
    detect: [{ all: ['posted date', 'reference number', 'payee', 'address', 'amount'] }],
    signatures: [['posted date', 'reference number', 'payee', 'address', 'amount']],
  },
};
