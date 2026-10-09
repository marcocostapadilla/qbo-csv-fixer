/**
 * QBO CSV Fixer - full pipeline: reject non-CSV, sniff delimiter, find header and balance rows,
 * map columns, read dates and amounts, list every row that could not be read.
 * Nothing is dropped silently: unreadable rows go to leftOutRows (shown in the UI) and make
 * the reconcile badge INCOMPLETE.
 */
import { parseCsv, sniffDelimiter, rejectReason } from './parse.mjs';
import { parseAmount, detectDecimal } from './money.mjs';
import { parseDateParts, detectDateOrder, normalizeDate } from './dates.mjs';
import { isBalanceLabel, isOpeningLabel, isClosingLabel, lastNonEmpty } from './headers.mjs';
import { isHeaderRow, missingRequired, mappingErrorMessage } from './fields.mjs';
import { PRESETS } from './presets.mjs';
import { mapColumnsForPreset, buildDescription, signedAmountFromRow, statusSkipReason, describeMapping } from './mapping.mjs';
import { isWellsFargoDataRow } from './detect.mjs';
import { round2, reconcileBalances } from './reconcile.mjs';

const SUMMARY_LABEL = /^(total|totals|subtotal|sub total|summary)\b/i;
const MONEY_FIELDS = ['amount', 'debit', 'credit'];

function emptyResult(preset, extra) {
  return Object.assign(
    {
      opening: null, closing: null, net: 0, headerRowIndex: -1, headers: [], columns: null, mapping: null,
      mappingError: null, fileError: null, transactions: [], skippedSummary: [], skippedRows: [], leftOutRows: [], notes: [],
      dateInfo: { ambiguous: false, conflict: false, detected: null, used: preset.defaultDateOrder || 'mdy', pairCount: 0, isoCount: 0 },
      decimalInfo: { decimal: '.', ambiguous: false, conflict: false, used: '.' },
      reconcile: reconcileBalances(null, null, 0),
      processorPresetId: preset.id,
      delimiter: ',',
    },
    extra
  );
}

/** Find balance rows, the header row and its cells. */
function scanHeader(rows, preset) {
  let opening = null;
  let closing = null;
  let headerRowIndex = -1;
  let headers = [];
  const skippedSummary = [];
  if (preset.headerless && rows.length && isWellsFargoDataRow(rows[0])) {
    return { opening, closing, headerRowIndex: -1, headers: ['Date', 'Amount', '*', 'Check Number', 'Description'], skippedSummary, headerless: true };
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const first = String(row[0] ?? '').trim();
    if (isOpeningLabel(first) || isClosingLabel(first)) {
      const amt = parseAmount(lastNonEmpty(row));
      if (isOpeningLabel(first) && amt != null) opening = amt;
      if (isClosingLabel(first) && amt != null) closing = amt;
      skippedSummary.push({ index: i, label: first, amount: amt });
      continue;
    }
    // Header: first row with a date-like name plus a description- or money-like name
    // (fuzzy: case, spacing, punctuation, BOM and synonyms do not matter; see fields.mjs).
    if (headerRowIndex < 0 && isHeaderRow(row)) {
      headerRowIndex = i;
      headers = row.map((c) => String(c).trim());
    }
  }
  if (headerRowIndex < 0 && rows.length) {
    headerRowIndex = opening != null ? 1 : 0;
    if (headerRowIndex < rows.length) headers = rows[headerRowIndex].map((c) => String(c).trim());
  }
  return { opening, closing, headerRowIndex, headers, skippedSummary, headerless: false };
}

/**
 * Full parse of a CSV text with a named processor preset.
 * opts.dateOrder: 'mdy' | 'dmy', used only when the file's A/B dates are ambiguous.
 * opts.decimal: '.' | ',', used only when the file's amounts do not prove the decimal separator.
 * Errors: fileError (empty, binary, no transaction rows) or mappingError (required columns missing).
 */
export function processCsv(text, processorPresetId = 'generic_bank', opts = {}) {
  const preset = PRESETS[processorPresetId] || PRESETS.generic_bank;
  const reject = rejectReason(text);
  if (reject) return emptyResult(preset, { fileError: { kind: 'reject', message: reject } });

  const delimiter = sniffDelimiter(text);
  const rows = parseCsv(text, delimiter);
  const head = scanHeader(rows, preset);
  let { opening, closing } = head;
  const { headerRowIndex, headers, skippedSummary } = head;
  const skippedRows = [];
  const leftOutRows = [];

  const cols = mapColumnsForPreset(headers, preset.id);
  const mapping = describeMapping(headers, cols);
  const base = { headerRowIndex, headers, columns: cols, mapping, delimiter, skippedSummary, opening, closing };

  // Required columns that cannot be mapped: stop with a clear error, never guess.
  const missing = missingRequired(cols);
  if (missing.length) {
    return emptyResult(preset, Object.assign(base, { mappingError: { missing, headers, message: mappingErrorMessage(missing, headers) } }));
  }

  const moneyCells = (row) => MONEY_FIELDS.filter((f) => cols[f] >= 0).map((f) => String(row[cols[f]] ?? '').trim());
  const rawDateOf = (row) => {
    let raw = row[cols.date];
    if ((raw == null || String(raw).trim() === '') && cols.dateFallback >= 0) raw = row[cols.dateFallback];
    return String(raw ?? '').trim();
  };
  const leaveOut = (i, reason, row) =>
    leftOutRows.push({ sourceRow: i + 1, reason, date: rawDateOf(row), amounts: moneyCells(row).filter(Boolean) });

  // v1.3 preset hook: repair rows in place (Etsy deposit amount lives in Title)
  if (preset.fixRow) for (let i = headerRowIndex + 1; i < rows.length; i++) preset.fixRow(rows[i], headers);

  // Candidate transaction rows: everything below the header (all rows when headerless).
  const candidates = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const first = String(row[0] ?? '').trim();
    const dateRaw = rawDateOf(row);
    if (isBalanceLabel(first) || isBalanceLabel(dateRaw)) continue;
    if (SUMMARY_LABEL.test(first) || SUMMARY_LABEL.test(dateRaw)) {
      skippedSummary.push({ index: i, label: first || dateRaw, amount: null });
      continue;
    }
    if (!parseDateParts(dateRaw)) {
      if (!dateRaw && moneyCells(row).every((c) => !c)) continue; // continuation / spacer line
      leaveOut(i, dateRaw ? 'unreadable date' : 'missing date', row);
      continue;
    }
    candidates.push({ i, row, dateRaw });
  }

  // Date order decision
  const detection = detectDateOrder(candidates.map((c) => c.dateRaw));
  let dateOrder = preset.defaultDateOrder || 'mdy';
  if (!detection.ambiguous && detection.detected) dateOrder = detection.detected;
  else if (opts.dateOrder === 'mdy' || opts.dateOrder === 'dmy') dateOrder = opts.dateOrder;
  const dateInfo = Object.assign({}, detection, { used: dateOrder });

  // Decimal separator decision (per file, from every money cell)
  const moneyRaw = [];
  for (const c of candidates) {
    for (const f of [...MONEY_FIELDS, 'fee']) if (cols[f] >= 0) moneyRaw.push(c.row[cols[f]]);
  }
  const dec = detectDecimal(moneyRaw);
  let decimal = dec.decimal;
  if (dec.ambiguous && (opts.decimal === '.' || opts.decimal === ',')) decimal = opts.decimal;
  const decimalInfo = Object.assign({}, dec, { used: decimal });
  const numOpts = { decimal, crdr: preset.crdr };

  let transactions = [];
  for (const { i, row, dateRaw } of candidates) {
    const description = buildDescription(row, cols);
    let amount = signedAmountFromRow(row, cols, numOpts);

    if (amount == null) {
      // In-table balance rows (e.g. BofA "Beginning balance as of ...") carry no amount
      if (isOpeningLabel(description) || isClosingLabel(description)) {
        if (isOpeningLabel(description) && opening == null) opening = parseAmount(lastNonEmpty(row), numOpts);
        if (isClosingLabel(description) && closing == null) closing = parseAmount(lastNonEmpty(row), numOpts);
        continue;
      }
      leaveOut(i, moneyCells(row).some(Boolean) ? 'unreadable amount' : 'missing amount', row);
      continue;
    }
    if (isOpeningLabel(description) || isClosingLabel(description)) continue;

    const skip = statusSkipReason(row, cols, preset.id);
    if (skip) {
      skippedRows.push({ sourceRow: i + 1, reason: skip, description });
      continue;
    }

    if (cols.fee >= 0) {
      const fee = parseAmount(row[cols.fee], numOpts);
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

  // v1.3 preset hook: balances from columns (Venmo Beginning/Ending Balance)
  if (preset.balancesFrom && opening == null && closing == null) ({ opening, closing } = preset.balancesFrom(rows.slice(headerRowIndex + 1), headers, numOpts));
  // v1.4 preset hooks: merge rows (Square transfers: one line per Deposit ID); file-level notes (Venmo fees)
  if (preset.groupTxns) transactions = preset.groupTxns(transactions, rows, headers);
  const notes = preset.fileNotes ? preset.fileNotes(candidates.map((c) => c.row), headers, numOpts) : [];
  leftOutRows.sort((a, b) => a.sourceRow - b.sourceRow);
  const net = round2(transactions.reduce((s, t) => s + t.amount, 0));
  const reconcile = reconcileBalances(opening, closing, net, leftOutRows.length);
  const fileError =
    !transactions.length && !leftOutRows.length && !skippedRows.length
      ? { kind: 'no-rows', message: 'No transaction rows found in this file (only a header or summary lines). Check that you exported transactions, not an empty date range.' }
      : null;

  return Object.assign(emptyResult(preset), base, {
    opening, closing, net, fileError, transactions, skippedRows, leftOutRows, dateInfo, decimalInfo, reconcile, notes,
    headerRowIndex: head.headerless ? -1 : headerRowIndex,
  });
}
