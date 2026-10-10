/**
 * QBO CSV Fixer - input (bank / processor) and output (QBO) preset registry.
 * Input preset data lives in presets-banks.mjs, presets-v12.mjs, presets-processors.mjs, presets-v13.mjs, presets-v14.mjs, presets-v15.mjs, presets-v154.mjs, presets-v155.mjs, presets-v156.mjs, presets-v157.mjs, presets-v1510.mjs and presets-v1512.mjs.
 */
import { BANK_PRESETS } from './presets-banks.mjs';
import { PROCESSOR_PRESETS } from './presets-processors.mjs';
import { V12_PRESETS } from './presets-v12.mjs';
import { V13_PRESETS } from './presets-v13.mjs';
import { V14_PRESETS } from './presets-v14.mjs';
import { V15_PRESETS } from './presets-v15.mjs';
import { V154_PRESETS } from './presets-v154.mjs';
import { V155_PRESETS } from './presets-v155.mjs';
import { V156_PRESETS } from './presets-v156.mjs';
import { V157_PRESETS } from './presets-v157.mjs';
import { V1510_PRESETS } from './presets-v1510.mjs';
import { V1512_PRESETS } from './presets-v1512.mjs';
import { V1515_PRESETS } from './presets-v1515.mjs';

/** Every input preset, in dropdown order. */
export const PRESETS = Object.assign({}, BANK_PRESETS, V12_PRESETS, PROCESSOR_PRESETS, V13_PRESETS, V14_PRESETS, V15_PRESETS, V154_PRESETS, V155_PRESETS, V156_PRESETS, V157_PRESETS, V1510_PRESETS, V1512_PRESETS, V1515_PRESETS);

/**
 * Order in which header rules are tried. Bank of America runs first so its summary block
 * wins; its header rule excludes Wise headers, which share "Running Balance".
 */
export const DETECT_ORDER = ['bofa', 'bofa_card', 'navy_federal', 'apple_card', 'ally', 'cash_app', 'sofi', 'revolut', 'wise', 'mercury', 'td_bank', 'usaa', 'fidelity', 'capital_one_360', 'capital_one', 'citi', 'amex', 'us_bank', 'discover', 'toast', 'square_transfers', 'shopify_payouts', 'square', 'shopify', 'etsy', 'venmo', 'paypal', 'stripe', 'chase'];

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
