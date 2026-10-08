/**
 * QBO CSV Fixer - browser rendering helpers (badges, preview table, notes).
 * Pure DOM output; no network calls.
 */
import { buildExportRows, fmtMoney, FREE_ROW_LIMIT, WATERMARK_SUFFIX, WATERMARK_DESC_SUFFIX } from './core.mjs';
import { tierAllows } from './license.mjs';

export const els = {};
for (const id of [
  'dropzone', 'fileInput', 'browseBtn', 'fileName', 'processorPreset', 'qboPreset', 'processorHint',
  'detectNote', 'mapNote', 'results', 'badgeRow', 'skipNote', 'dateWarning', 'dateWarningText',
  'dateOrderMdy', 'dateOrderDmy', 'decimalWarning', 'decimalWarningText', 'decimalDot', 'decimalComma', 'previewHead', 'previewBody', 'downloadBtn', 'tierNote',
  'errorBanner', 'txnCount',
]) {
  els[id] = document.getElementById(id);
}

const AMBIGUOUS_TEXT =
  'Every date in this file could be read as US month/day or as EU day/month, so the file alone cannot tell which one your bank used. Pick the one that matches your statement before you download.';
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
    parts.push(`${label} = "${m[field]}"${syn}`);
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
  'Amounts like 1,250 or 1.250 could use a comma or a dot as the decimal separator, and nothing in this file proves which. Pick the one your bank uses before you download.';
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
      ? `Δ ${fmtMoney(rec.delta)} (expected close ${fmtMoney(rec.expectedClosing)})`
      : rec.message;
  const meta = (label, value) =>
    `<div class="badge meta"><div class="label">${label}</div><div class="value">${value}</div></div>`;
  els.badgeRow.innerHTML =
    `<div class="badge ${badgeClass}"><div class="label">Reconcile</div><div class="value">${rec.status}</div>` +
    `<div class="detail">${escapeHtml(deltaLine)}</div></div>` +
    meta('Opening', r.opening != null ? fmtMoney(r.opening) : 'n/a') +
    meta('Net (txns)', fmtMoney(r.net)) +
    meta('Ending', r.closing != null ? fmtMoney(r.closing) : 'n/a');
}

function listRows(rows, fmt) {
  const list = rows.slice(0, 8).map(fmt).join('; ');
  return rows.length > 8 ? `${list}; and ${rows.length - 8} more` : list;
}

/** One note for every row not in the export: unreadable rows first, then rows that did not settle. */
function renderSkipNote(r) {
  const parts = [];
  const lo = r.leftOutRows || [];
  if (lo.length) {
    const raw = (x) => [x.date && `date "${x.date}"`, ...x.amounts.map((a) => `amount "${a}"`)].filter(Boolean).join(', ');
    parts.push(
      `Left out ${lo.length} row(s) that could not be read: ` +
        listRows(lo, (x) => `row ${x.sourceRow} (${x.reason}${raw(x) ? ': ' + raw(x) : ''})`) +
        '. Fix them in the file or add them in QuickBooks by hand.'
    );
  }
  if (r.skippedRows && r.skippedRows.length) {
    parts.push(
      `Left out ${r.skippedRows.length} row(s) that did not settle: ` +
        listRows(r.skippedRows, (s) => `row ${s.sourceRow} (${s.reason})`) + '.'
    );
  }
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

/** Render one processed file. Returns true when the free tier allows the download. */
export function renderResults(r, qboId) {
  els.results.classList.remove('hidden');
  renderDateWarning(r);
  renderDecimalWarning(r);
  setText(els.mapNote, mappingNote(r.mapping));
  const { header, body } = buildExportRows(r.transactions, qboId);
  renderBadges(r);
  renderSkipNote(r);
  els.txnCount.textContent = String(r.transactions.length);
  renderPreview(header, body);

  const n = r.transactions.length;
  const allowed = n > 0 && tierAllows(n);
  els.tierNote.innerHTML = !n
    ? '<strong>No transactions could be read</strong>, so there is nothing to download. See the note above.'
    : allowed
      ? `<strong>Free core:</strong> 1 file, up to ${FREE_ROW_LIMIT} rows, watermarked export (filename gets <code>${WATERMARK_SUFFIX}</code> and each description ends with <code>${escapeHtml(WATERMARK_DESC_SUFFIX.trim())}</code>). Unlimited version coming soon.`
      : `<strong>Free tier limit:</strong> this file has ${n} transaction rows (limit ${FREE_ROW_LIMIT}). Unlimited version coming soon.`;
  els.downloadBtn.disabled = !allowed;
  return allowed;
}

export function hideResults() {
  els.results.classList.add('hidden');
}
