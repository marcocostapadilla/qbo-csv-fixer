/**
 * QBO CSV Fixer - full pipeline: parse, find header and balance rows, map, sign, normalize.
 */
import { parseCsv, parseAmount } from './parse.mjs';
import { parseDateParts, detectDateOrder, normalizeDate } from './dates.mjs';
import { normHeader, isBalanceLabel, isOpeningLabel, isClosingLabel, lastNonEmpty } from './headers.mjs';
import { PRESETS } from './presets.mjs';
import { mapColumnsForPreset, buildDescription, signedAmountFromRow, statusSkipReason } from './mapping.mjs';
import { isWellsFargoDataRow } from './detect.mjs';
import { round2, reconcileBalances } from './reconcile.mjs';

/**
 * Full parse of a CSV text with a named processor preset.
 * opts.dateOrder: 'mdy' | 'dmy' | undefined. Applied only when the file's A/B dates are
 * ambiguous; a file where some row disambiguates always uses the detected order.
 * Returns { opening, closing, headerRowIndex, columns, transactions[], skippedSummary[],
 *           skippedRows[], dateInfo, reconcile, ... }
 */
export function processCsv(text, processorPresetId = 'generic_bank', opts = {}) {
  const preset = PRESETS[processorPresetId] || PRESETS.generic_bank;
  const rows = parseCsv(text);
  let opening = null;
  let closing = null;
  const skippedSummary = [];
  const skippedRows = [];
  let headerRowIndex = -1;
  let headers = [];

  const headerless = preset.headerless && rows.length && isWellsFargoDataRow(rows[0]);

  if (headerless) {
    headers = ['Date', 'Amount', '*', 'Check Number', 'Description'];
  } else {
    // First pass: find balance rows and header
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const first = String(row[0] ?? '').trim();
      if (isOpeningLabel(first)) {
        const amt = parseAmount(lastNonEmpty(row));
        if (amt != null) opening = amt;
        skippedSummary.push({ index: i, label: first, amount: amt });
        continue;
      }
      if (isClosingLabel(first)) {
        const amt = parseAmount(lastNonEmpty(row));
        if (amt != null) closing = amt;
        skippedSummary.push({ index: i, label: first, amount: amt });
        continue;
      }

      // Header detection: row containing Date-like + Description-like
      if (headerRowIndex < 0) {
        const norms = row.map(normHeader);
        const hasDate = norms.some((n) => n === 'date' || n.includes('date') || n === 'created' || n === 'created (utc)');
        const hasDesc = norms.some(
          (n) =>
            n === 'description' ||
            n === 'memo' ||
            n === 'payee' ||
            n === 'name' ||
            n === 'subject' ||
            n === 'details' ||
            n === 'type'
        );
        const hasAmt = norms.some(
          (n) => n === 'amount' || n === 'debit' || n === 'credit' || n === 'net' || n === 'gross'
        );
        if (hasDate && (hasDesc || hasAmt)) {
          headerRowIndex = i;
          headers = row.map((c) => String(c).trim());
        }
      }
    }

    // If no header found, try row 0 or after opening
    if (headerRowIndex < 0 && rows.length) {
      headerRowIndex = opening != null ? 1 : 0;
      if (headerRowIndex < rows.length) {
        headers = rows[headerRowIndex].map((c) => String(c).trim());
      }
    }
  }

  const cols = mapColumnsForPreset(headers, preset.id);

  const rawDateOf = (row) => {
    let raw = cols.date >= 0 ? row[cols.date] : row[0];
    if ((raw == null || String(raw).trim() === '') && cols.dateFallback >= 0) raw = row[cols.dateFallback];
    return raw;
  };

  // Candidate transaction rows (date-like first, before amount/status checks)
  const candidates = [];
  for (let i = 0; i < rows.length; i++) {
    if (i === headerRowIndex) continue;
    const row = rows[i];
    const first = String(row[0] ?? '').trim();
    if (isBalanceLabel(first)) continue;
    const dateRaw = rawDateOf(row);
    if (isBalanceLabel(dateRaw)) continue;
    if (!parseDateParts(dateRaw)) continue;
    candidates.push({ i, row, dateRaw });
  }

  // Date order decision
  const detection = detectDateOrder(candidates.map((c) => c.dateRaw));
  let dateOrder;
  if (!detection.ambiguous && detection.detected) {
    dateOrder = detection.detected;
  } else if (opts.dateOrder === 'mdy' || opts.dateOrder === 'dmy') {
    dateOrder = opts.dateOrder;
  } else {
    dateOrder = preset.defaultDateOrder || 'mdy';
  }
  const dateInfo = {
    ambiguous: detection.ambiguous,
    conflict: detection.conflict,
    detected: detection.detected,
    used: dateOrder,
    pairCount: detection.pairCount,
    isoCount: detection.isoCount,
  };

  const transactions = [];
  for (const { i, row, dateRaw } of candidates) {
    const description = buildDescription(row, cols);
    let amount = signedAmountFromRow(row, cols);

    // In-table balance rows (e.g. BofA "Beginning balance as of ...") carry no amount
    if (amount == null) {
      if (isOpeningLabel(description) && opening == null) opening = parseAmount(lastNonEmpty(row));
      if (isClosingLabel(description) && closing == null) closing = parseAmount(lastNonEmpty(row));
      continue;
    }
    if (isOpeningLabel(description) || isClosingLabel(description)) continue;

    const skip = statusSkipReason(row, cols, preset.id);
    if (skip) {
      skippedRows.push({ sourceRow: i + 1, reason: skip, description });
      continue;
    }

    if (cols.fee >= 0) {
      const fee = parseAmount(row[cols.fee]);
      if (fee != null) amount -= fee;
    }
    if (preset.invertAmount) amount = -amount;
    amount = round2(amount) + 0; // + 0 turns -0 into 0

    transactions.push({
      date: normalizeDate(dateRaw, dateOrder),
      description: description || '(no description)',
      amount,
      sourceRow: i + 1,
    });
  }

  const net = round2(transactions.reduce((s, t) => s + t.amount, 0));
  const reconcile = reconcileBalances(opening, closing, net);

  return {
    opening,
    closing,
    net,
    headerRowIndex: headerless ? -1 : headerRowIndex,
    headers,
    columns: cols,
    transactions,
    skippedSummary,
    skippedRows,
    dateInfo,
    reconcile,
    processorPresetId: preset.id,
  };
}
