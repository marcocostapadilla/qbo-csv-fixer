/**
 * QBO CSV Fixer - input (bank / processor) and output (QBO) preset registry.
 * Input preset data lives in presets-banks.mjs and presets-processors.mjs.
 */
import { BANK_PRESETS } from './presets-banks.mjs';
import { PROCESSOR_PRESETS } from './presets-processors.mjs';

/** Every input preset, in dropdown order. */
export const PRESETS = Object.assign({}, BANK_PRESETS, PROCESSOR_PRESETS);

/**
 * Order in which header rules are tried. Bank of America runs first so its summary block
 * wins; its header rule excludes Wise headers, which share "Running Balance".
 */
export const DETECT_ORDER = ['bofa', 'revolut', 'wise', 'capital_one', 'amex', 'paypal', 'stripe', 'chase'];

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
