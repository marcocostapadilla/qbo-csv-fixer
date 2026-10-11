/** v1.5.21: date and decimal format warnings, split out of ui.mjs. */
const AMBIGUOUS_TEXT =
  'Every date in this file could be read as US month/day or as EU day/month, so the file alone cannot tell which one your bank used. Pick the one that matches your statement before you download; a wrong pick swaps day and month in QuickBooks.';
const CONFLICT_TEXT =
  'Some dates in this file only work as month/day and others only as day/month, so the file mixes formats. Pick the format most rows use, then check every date in the preview against your statement before you download.';

export function renderDateWarning(els, r) {
  const info = r.dateInfo || {};
  if (!info.ambiguous) {
    els.dateWarning.classList.add('hidden');
    return;
  }
  els.dateWarningText.textContent = info.conflict ? CONFLICT_TEXT : AMBIGUOUS_TEXT;
  els.dateOrderMdy.checked = info.used === 'mdy';
  els.dateOrderDmy.checked = info.used === 'dmy';
  els.dateWarning.classList.remove('hidden');
}

const DECIMAL_AMBIGUOUS =
  'Amounts like 1,250 or 1.250 could use a comma or a dot as the decimal separator, and nothing in this file proves which. Pick the one your bank uses before you download; a wrong pick turns 1,250 into 1.25.';
const DECIMAL_CONFLICT =
  'Some amounts in this file only make sense with a dot decimal (12.50) and others only with a comma decimal (12,50). Pick the one most rows use, then check every amount in the preview.';

export function renderDecimalWarning(els, r) {
  const info = r.decimalInfo || {};
  if (!els.decimalWarning) return;
  if (!info.ambiguous) {
    els.decimalWarning.classList.add('hidden');
    return;
  }
  els.decimalWarningText.textContent = info.conflict ? DECIMAL_CONFLICT : DECIMAL_AMBIGUOUS;
  els.decimalDot.checked = info.used === '.';
  els.decimalComma.checked = info.used === ',';
  els.decimalWarning.classList.remove('hidden');
}
