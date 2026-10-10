/**
 * v1.5.15: Fidelity brokerage / Cash Management history CSV. Sources in VERIFY-presets-v1515.md.
 * Amount ($) is the signed cash amount, net of commission and fees. Description often says
 * "No Description"; the Action column then gives the text (mapping.mjs fallback). Disclaimer
 * lines under the table are ignored (process.mjs). Cash Balance ($), when present, feeds the badge.
 */
export const V1515_PRESETS = {
  fidelity: {
    id: 'fidelity',
    label: 'Fidelity (brokerage or Cash Management history)',
    hint: 'Fidelity history export (Run Date, Action, Symbol, Description, ..., Amount ($), Cash Balance ($), Settlement Date). Amount is already signed and net of fees. Rows that say "No Description" use the Action text. The disclaimer lines at the bottom are ignored. One account per file works best.',
    defaultDateOrder: 'mdy',
    slug: 'fidelity',
    sample: 'samples/fidelity.csv',
    columns: {
      date: ['run date'],
      description: ['description', 'security description'],
      amount: ['amount ($)', 'amount'],
    },
    detect: [{ all: ['run date', 'action', 'amount'] }],
  },
};
