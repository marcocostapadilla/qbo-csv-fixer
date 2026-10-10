/**
 * QBO CSV Fixer - input (bank / processor) and output (QBO) preset registry.
 * Input preset data lives in presets-banks.mjs, presets-v12.mjs, presets-processors.mjs, presets-v13.mjs, presets-v14.mjs, presets-v15.mjs and presets-v154.mjs.
 */
import { BANK_PRESETS } from './presets-banks.mjs';
import { PROCESSOR_PRESETS } from './presets-processors.mjs';
import { V12_PRESETS } from './presets-v12.mjs';
import { V13_PRESETS } from './presets-v13.mjs';
import { V14_PRESETS } from './presets-v14.mjs';
import { V15_PRESETS } from './presets-v15.mjs';
import { V154_PRESETS } from './presets-v154.mjs';

/** Every input preset, in dropdown order. */
export const PRESETS = Object.assign({}, BANK_PRESETS, V12_PRESETS, PROCESSOR_PRESETS, V13_PRESETS, V14_PRESETS, V15_PRESETS, V154_PRESETS);

/**
 * Order in which header rules are tried. Bank of America runs first so its summary block
 * wins; its header rule excludes Wise headers, which share "Running Balance".
 */
export const DETECT_ORDER = ['bofa', 'bofa_card', 'revolut', 'wise', 'mercury', 'capital_one', 'citi', 'amex', 'us_bank', 'discover', 'toast', 'square_transfers', 'shopify_payouts', 'square', 'shopify', 'etsy', 'venmo', 'paypal', 'stripe', 'chase'];

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
