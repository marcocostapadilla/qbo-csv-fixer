/**
 * QBO CSV Fixer - browser rendering helpers (badges, preview table, notes).
 * Pure DOM output; no network calls.
 */
import { TYPE_NOTE } from './typenote.mjs';
import { skippedText } from './skipnote.mjs';
import { signCheck } from './signcheck.mjs';
import { buildExportRows, fmtMoney, FREE_ROW_LIMIT, WATERMARK_SUFFIX } from './core.mjs';
import { qboLimitNotes } from './export.mjs';
import { tierAllows, canDownload } from './license.mjs';

export const els = {};
for (const id of [
  'dropzone', 'fileInput', 'browseBtn', 'fileName', 'processorPreset', 'qboPreset', 'processorHint',
  'detectNote', 'mapNote', 'results', 'badgeRow', 'skipNote', 'dateWarning', 'dateWarningText',
  'dateOrderMdy', 'dateOrderDmy', 'decimalWarning', 'decimalWarningText', 'decimalDot', 'decimalComma', 'previewHead', 'previewBody', 'downloadBtn', 'tierNote',
  'errorBanner', 'txnCount', 'resultsBank', 'signWarning',
]) {
  els[id] = document.getElementById(id);
}

const AMBIGUOUS_TEXT =
  'Every date in this file could be read as US month/day or as EU day/month, so the file alone cannot tell which one your bank used. Pick the one that matches your statement before you download; a wrong pick swaps day and month in QuickBooks.';
const CONFLICT_TEXT =
  'Some dates in this file only work as month/day and others only as day/month, so the file mixes formats. Pick the format most rows use, then check every date in the preview against your statement before you download.';

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setText(el, msg) {
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

export function showError(msg) {
  setText(els.errorBanner, msg);
}

export function setDetectNote(msg) {
  setText(els.detectNote, msg);
}

/** "Columns used: Date = "Trans. Date", ..." so every mapping is visible, never silent. */
export function mappingNote(m) {
  if (!m) return '';
  const parts = [];
  const add = (label, field) => {
    if (!m[field]) return;
    const syn = m.viaSynonyms.includes(field) ? ' (matched by synonym)' : '';
    const fb = field === 'description' && m.descriptionFallback ? ` ("${m.descriptionFallback}" when empty)` : '';
    parts.push(`${label} = "${m[field]}"${fb}${syn}`);
  };
  add('Date', 'date');
  add('Description', 'description');
  add('Amount', 'amount');
  add('Debit', 'debit');
  add('Credit', 'credit');
  return parts.length ? `Columns used: ${parts.join(', ')}.` : '';
}

function renderDateWarning(r) {
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

function renderDecimalWarning(r) {
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

const BADGE_CLASS = { PASS: 'pass', FAIL: 'fail', INCOMPLETE: 'incomplete' };

function renderBadges(r) {
  const rec = r.reconcile;
  const badgeClass = BADGE_CLASS[rec.status] || 'na';
  const deltaLine =
    rec.status !== 'INCOMPLETE' && rec.delta != null
      ? rec.status === 'FAIL'
        ? `Δ ${fmtMoney(rec.delta)}: opening plus these rows is ${fmtMoney(rec.expectedClosing)}, but the file's ending balance is ${fmtMoney(r.closing)}. Rows are missing or extra. Check for left-out rows, a date range that differs from the statement, or pending items before you upload.`
        : `Opening balance plus these rows equals the ending balance (${fmtMoney(r.closing)}).`
      : rec.message;
  // v1.5.9: balances read from a running-balance column
  const rbNote = r.runningBalance && (rec.status === 'PASS' || rec.status === 'FAIL')
    ? ' Opening and ending come from the running balance column, so a missing first or last row would not show here.' : '';
  const meta = (label, value) =>
    `<div class="badge meta"><div class="label">${label}</div><div class="value">${value}</div></div>`;
  els.badgeRow.innerHTML =
    `<div class="badge ${badgeClass}"><div class="label">Reconcile</div><div class="value">${rec.status}</div>` +
    `<div class="detail">${escapeHtml(deltaLine + rbNote)}</div></div>` +
    meta('Opening', r.opening != null ? fmtMoney(r.opening) : 'n/a') +
    meta('Net change', fmtMoney(r.net)) +
    meta('Ending', r.closing != null ? fmtMoney(r.closing) : 'n/a');
}

function listRows(rows, fmt) {
  const list = rows.slice(0, 8).map(fmt).join('; ');
  return rows.length > 8 ? `${list}; and ${rows.length - 8} more` : list;
}

/** One note for every row not in the export. */
function renderSkipNote(r, extra = []) {
  const parts = [];
  const lo = r.leftOutRows || [];
  if (lo.length) {
    const raw = (x) => [x.date && `date "${x.date}"`, ...x.amounts.map((a) => `amount "${a}"`)].filter(Boolean).join(', ');
    parts.push(
      `Left out ${lo.length} row(s) that could not be read: ` +
        listRows(lo, (x) => `row ${x.sourceRow} (${x.reason}${raw(x) ? ': ' + raw(x) : ''})`) +
        '. They are not in the download, so totals will be short. Fix them in the file, or add them in QuickBooks by hand.'
    );
  }
  if (r.skippedRows && r.skippedRows.length) parts.push(skippedText(r.skippedRows, listRows));
  for (const n of [...(r.notes || []).filter((x) => !x.startsWith(TYPE_NOTE)), ...extra]) parts.push(n); // preset notes (Venmo fees), QBO upload limits (v1.5)
  setText(els.skipNote, parts.join(' '));
}

function renderPreview(header, body) {
  els.previewHead.innerHTML = '<tr>' + header.map((h) => `<th>${escapeHtml(h)}</th>`).join('') + '</tr>';
  els.previewBody.innerHTML = body
    .map((row) => {
      const cells = row.map((cell, i) => {
        const isNum = header[i] === 'Amount' || header[i] === 'Debit' || header[i] === 'Credit';
        let cls = isNum ? 'num' : '';
        if (header[i] === 'Amount' && Number(cell) < 0) cls += ' neg';
        return `<td class="${cls}">${escapeHtml(cell)}</td>`;
      });
      return '<tr>' + cells.join('') + '</tr>';
    })
    .join('');
}

/** Render one file; true when the free tier allows the download. */
export function renderResults(r, qboId) {
  els.results.classList.remove('hidden');
  renderDateWarning(r);
  renderDecimalWarning(r);
  setText(els.mapNote, mappingNote(r.mapping));
  const { header, body } = buildExportRows(r.transactions, qboId);
  renderBadges(r);
  renderSkipNote(r, qboLimitNotes(header, body));
  els.txnCount.textContent = String(r.transactions.length);
  document.getElementById('balLines').hidden = !((r.opening != null || r.closing != null) && !r.runningBalance); // v1.5.14
  const o = els.processorPreset.selectedOptions[0];
  els.resultsBank.textContent = (!o || o.value === 'generic_bank' ? 'Bank not recognized, so the file was read with the general layout. Check the columns used and the signs in the preview below. If your bank is in the list in step 2 above, pick it.' : `Read as: ${o.textContent}. Wrong bank? Pick another in step 2 above.`) + ' Every row is previewed below the Download button.';
  const sw = signCheck(o && o.value, r.transactions, r.reconcile.status);
  const tn = (r.notes || []).find((n) => n.startsWith(TYPE_NOTE)); // v1.5.16: unread DR/CR column, shown first
  els.signWarning.textContent = tn || (sw ? sw.message : '');
  els.signWarning.classList.toggle('hidden', !(sw || tn));
  renderPreview(header, body);

  const n = r.transactions.length;
  const allowed = n > 0 && tierAllows(n);
  els.tierNote.innerHTML = !n
    ? '<strong>No transactions could be read</strong>, so there is nothing to download. See the note above.'
    : allowed
      ? `<strong>Free version:</strong> 1 file at a time, up to ${FREE_ROW_LIMIT} rows, watermarked export (only the file name changes: it ends in <code>${WATERMARK_SUFFIX}</code>; descriptions are untouched). Unlimited version coming soon.`
      : `<strong>Free tier limit:</strong> this file has ${n} rows and the free version converts up to ${FREE_ROW_LIMIT}. Download a shorter date range from your bank and convert each part. Unlimited version coming soon.`;
  setDownloadEnabled(canDownload(r));
  return allowed;
}

/** Download button state: disabled plus aria-disabled. */
export function setDownloadEnabled(on) {
  els.downloadBtn.disabled = !on;
  els.downloadBtn.setAttribute('aria-disabled', String(!on));
}

/** Rejected file: hide results, disable Download. */
export function hideResults() {
  els.results.classList.add('hidden');
  setDownloadEnabled(false);
}

/**
 * v1.5.4: bring step 3 into view after a file loads, only when its heading is off screen.
 * Smooth unless reduced motion; focus moves to the heading only when asked.
 */
export function revealResults({ focus = true } = {}) {
  const h = document.getElementById('resultsHeading');
  if (!h || els.results.classList.contains('hidden')) return;
  const box = h.getBoundingClientRect();
  if (box.top >= 0 && box.bottom <= window.innerHeight) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  h.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  if (focus) h.focus({ preventScroll: true });
}
