/**
 * v1.5.6 sign-sanity check. Pure functions, no DOM. Only used when the reconcile badge is N/A
 * (no balances to check against). Heuristic: it only warns, it never changes a sign.
 */

/** Which sign rules apply per preset. Processors and POS files are one-way by nature: no check. */
export const SIGN_KIND = {
  amex: 'card', capital_one: 'card', citi: 'card', discover: 'card', bofa_card: 'card', apple_card: 'card',
  generic_bank: 'bank', date_desc_amount: 'bank', date_desc_debit_credit: 'bank', chase: 'bank', bofa: 'bank',
  wells_fargo: 'bank', us_bank: 'bank', pnc: 'bank', mercury: 'bank', revolut: 'bank', wise: 'bank', navy_federal: 'bank', ally: 'bank', cash_app: 'bank', sofi: 'bank',
};

/** Words that mean money came IN. Card: payments, refunds, rewards. Bank: deposits, pay, interest. */
const IN_WORDS = {
  card: /\b(payment|thank you|autopay|refund|return|credit(?! card)|daily cash|cash ?back|reward|deposit)/i,
  bank: /\b(deposit|payroll|direct dep|salary|interest (paid|earned|payment)|dividend|refund|reimburse|transfer from)/i,
};
/** Words that mean money went OUT (bank files only; on cards almost every row is a purchase). */
const OUT_WORDS = /\b(withdrawal|atm|debit card|pos purchase|purchase|check \d|transfer to)/i;

/** Layouts that card exports often land in when the bank is not recognized. */
const CARD_TOO = new Set(['generic_bank', 'date_desc_amount', 'chase']);

/**
 * Card pattern: payment/refund rows negative while the other rows are mostly positive purchases.
 * Needs 2+ such rows, or 1 such row against 3+ other rows that are at least 80% positive.
 */
export function cardInverted(rows) {
  const isIn = (t) => IN_WORDS.card.test(t.description || '');
  const inRows = rows.filter(isIn);
  const other = rows.filter((t) => !isIn(t));
  if (!inRows.length || !inRows.every((t) => t.amount < 0)) return false;
  const otherPos = other.filter((t) => t.amount > 0).length / (other.length || 1);
  return (inRows.length >= MIN_HITS && otherPos >= 0.5) || (other.length >= 3 && otherPos >= 0.8);
}

export const MIN_ROWS = 3; // fewer rows say nothing about a pattern
export const MIN_HITS = 2; // never judge on one row
export const WRONG_SHARE = 2 / 3; // share of keyword rows with the wrong sign

/** Returns null (looks fine) or { rule, message }. txns: [{ description, amount }]. */
export function signCheck(presetId, txns, badgeStatus) {
  const kind = SIGN_KIND[presetId];
  if (!kind || badgeStatus !== 'N/A') return null;
  const rows = (txns || []).filter((t) => Number.isFinite(t.amount) && t.amount !== 0);
  if (rows.length < MIN_ROWS) return null;
  const inRows = rows.filter((t) => IN_WORDS[kind].test(t.description || ''));
  const pos = rows.filter((t) => t.amount > 0).length;
  if (pos === rows.length && inRows.length < rows.length * 0.8) return warn('all-positive');
  if (pos === 0 && inRows.length >= 1) return warn('all-negative');
  const wrongIn = inRows.filter((t) => t.amount < 0).length;
  if (inRows.length >= MIN_HITS && wrongIn / inRows.length >= WRONG_SHARE && pos / rows.length >= 0.5) return warn('inverted');
  // Bank-style layouts can hold a card file (wrong pick): also test the card pattern there.
  if ((kind === 'card' || CARD_TOO.has(presetId)) && cardInverted(rows)) return warn('inverted');
  if (kind === 'bank') {
    const outRows = rows.filter((t) => OUT_WORDS.test(t.description || '') && !IN_WORDS.bank.test(t.description || ''));
    const wrongOut = outRows.filter((t) => t.amount > 0).length;
    const rightIn = inRows.length - wrongIn; // deposits that already read as money in outvote the out-words
    if (outRows.length >= MIN_HITS && wrongOut / outRows.length >= WRONG_SHARE && !(inRows.length >= MIN_HITS && rightIn / inRows.length >= WRONG_SHARE)) return warn('inverted');
  }
  return null;
}

export const SIGN_MESSAGES = {
  'all-positive': 'Every amount in this file is positive, so QuickBooks would record all of them as money in. Check the preview: if purchases show as positive, pick your bank in step 2 above.',
  'all-negative': 'Every amount in this file is negative, including payments or deposits, so QuickBooks would record all of them as money out. Check the preview: if money in shows as negative, pick your bank in step 2 above.',
  inverted: 'Payments, refunds or deposits show as money out here, and purchases as money in, so the signs may be reversed. Check the preview: if they are, pick your bank in step 2 above.',
};

function warn(rule) {
  return { rule, message: SIGN_MESSAGES[rule] };
}
