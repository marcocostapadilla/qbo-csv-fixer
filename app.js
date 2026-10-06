/**
 * QBO CSV Fixer - browser UI (ES module). Serve via http.server for local demo.
 */
import {
  processCsv,
  buildExportRows,
  toCsvString,
  fmtMoney,
  FREE_ROW_LIMIT,
  WATERMARK_SUFFIX,
  PRESETS,
  QBO_PRESETS,
  freeTierAllows,
} from './core.mjs';

const GUMROAD_URL = 'https://marcocostapadilla.gumroad.com/l/qbo-csv-fixer';

const els = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  browseBtn: document.getElementById('browseBtn'),
  fileName: document.getElementById('fileName'),
  processorPreset: document.getElementById('processorPreset'),
  qboPreset: document.getElementById('qboPreset'),
  processorHint: document.getElementById('processorHint'),
  results: document.getElementById('results'),
  badgeRow: document.getElementById('badgeRow'),
  previewHead: document.getElementById('previewHead'),
  previewBody: document.getElementById('previewBody'),
  downloadBtn: document.getElementById('downloadBtn'),
  tierNote: document.getElementById('tierNote'),
  errorBanner: document.getElementById('errorBanner'),
  txnCount: document.getElementById('txnCount'),
};

let state = {
  fileName: '',
  rawText: '',
  result: null,
};

function showError(msg) {
  if (!msg) {
    els.errorBanner.classList.add('hidden');
    els.errorBanner.textContent = '';
    return;
  }
  els.errorBanner.textContent = msg;
  els.errorBanner.classList.remove('hidden');
}

function fillPresetSelects() {
  els.processorPreset.innerHTML = '';
  for (const p of Object.values(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    els.processorPreset.appendChild(opt);
  }
  els.processorPreset.value = 'generic_bank';

  els.qboPreset.innerHTML = '';
  for (const p of Object.values(QBO_PRESETS)) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    els.qboPreset.appendChild(opt);
  }
  els.qboPreset.value = 'date_desc_amount';
  updateProcessorHint();
}

function updateProcessorHint() {
  const p = PRESETS[els.processorPreset.value];
  els.processorHint.textContent = p ? p.hint : '';
}

function readFile(file) {
  if (!file) return;
  if (!/\.csv$/i.test(file.name) && file.type && !file.type.includes('csv') && !file.type.includes('text')) {
    // still allow; many OS report blank type
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.fileName = file.name;
    state.rawText = String(reader.result || '');
    els.fileName.textContent = file.name;
    showError('');
    reprocess();
  };
  reader.onerror = () => showError('Could not read that file in the browser.');
  reader.readAsText(file);
}

function reprocess() {
  if (!state.rawText) {
    els.results.classList.add('hidden');
    return;
  }
  try {
    const processorId = els.processorPreset.value || 'generic_bank';
    state.result = processCsv(state.rawText, processorId);
    renderResults();
  } catch (err) {
    console.error(err);
    showError('Parse error: ' + (err && err.message ? err.message : String(err)));
    els.results.classList.add('hidden');
  }
}

function renderResults() {
  const r = state.result;
  if (!r) return;
  els.results.classList.remove('hidden');

  const qboId = els.qboPreset.value || 'date_desc_amount';
  const { header, body } = buildExportRows(r.transactions, qboId);

  // Badges
  const rec = r.reconcile;
  let badgeClass = 'na';
  let statusLabel = 'N/A';
  if (rec.status === 'PASS') {
    badgeClass = 'pass';
    statusLabel = 'PASS';
  } else if (rec.status === 'FAIL') {
    badgeClass = 'fail';
    statusLabel = 'FAIL';
  }

  const deltaLine =
    rec.delta != null
      ? `Δ ${fmtMoney(rec.delta)} (expected close ${fmtMoney(rec.expectedClosing)})`
      : rec.message;

  els.badgeRow.innerHTML = `
    <div class="badge ${badgeClass}">
      <div class="label">Reconcile</div>
      <div class="value">${statusLabel}</div>
      <div class="detail">${escapeHtml(deltaLine)}</div>
    </div>
    <div class="badge meta">
      <div class="label">Opening</div>
      <div class="value">${r.opening != null ? fmtMoney(r.opening) : 'n/a'}</div>
    </div>
    <div class="badge meta">
      <div class="label">Net (txns)</div>
      <div class="value">${fmtMoney(r.net)}</div>
    </div>
    <div class="badge meta">
      <div class="label">Ending</div>
      <div class="value">${r.closing != null ? fmtMoney(r.closing) : 'n/a'}</div>
    </div>
  `;

  els.txnCount.textContent = String(r.transactions.length);

  // Preview table
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

  const allowed = freeTierAllows(r.transactions.length);
  if (!allowed) {
    els.tierNote.innerHTML = `<strong>Free tier limit:</strong> this file has ${r.transactions.length} transaction rows (limit ${FREE_ROW_LIMIT}). Unlock unlimited files and rows for CHF 19 lifetime on <a href="${GUMROAD_URL}" target="_blank" rel="noopener noreferrer">Gumroad</a> (stub link; product page may not be live yet).`;
    els.downloadBtn.disabled = true;
  } else {
    els.tierNote.innerHTML = `<strong>Free core:</strong> 1 file, up to ${FREE_ROW_LIMIT} rows, watermarked export (filename gets <code>${WATERMARK_SUFFIX}</code> and a watermark row). Soft unlock: <a href="${GUMROAD_URL}" target="_blank" rel="noopener noreferrer">CHF 19 lifetime on Gumroad</a> (stub; no account created from this demo).`;
    els.downloadBtn.disabled = false;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadExport() {
  const r = state.result;
  if (!r || !freeTierAllows(r.transactions.length)) return;
  const qboId = els.qboPreset.value || 'date_desc_amount';
  const { header, body } = buildExportRows(r.transactions, qboId);
  const csv = toCsvString(header, body, { watermark: true });
  const base = (state.fileName || 'export.csv').replace(/\.csv$/i, '');
  const outName = base + WATERMARK_SUFFIX + '.csv';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setupDropzone() {
  const dz = els.dropzone;
  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((ev) => {
    dz.addEventListener(ev, prevent);
  });
  dz.addEventListener('dragover', () => dz.classList.add('dragover'));
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    dz.classList.remove('dragover');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) readFile(f);
  });
  dz.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    els.fileInput.click();
  });
  els.browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.fileInput.click();
  });
  els.fileInput.addEventListener('change', () => {
    const f = els.fileInput.files && els.fileInput.files[0];
    if (f) readFile(f);
  });
}

function init() {
  fillPresetSelects();
  setupDropzone();
  els.processorPreset.addEventListener('change', () => {
    updateProcessorHint();
    reprocess();
  });
  els.qboPreset.addEventListener('change', () => {
    if (state.result) renderResults();
  });
  els.downloadBtn.addEventListener('click', downloadExport);

  // Load sample via fetch when served over http (button)
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('samples/chase-like-messy.csv');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        state.fileName = 'chase-like-messy.csv';
        state.rawText = text;
        els.fileName.textContent = 'chase-like-messy.csv (sample)';
        showError('');
        els.processorPreset.value = 'generic_bank';
        updateProcessorHint();
        reprocess();
      } catch (err) {
        showError(
          'Could not load sample via fetch. Open this page through a local server (see README), or drop samples/chase-like-messy.csv yourself.'
        );
      }
    });
  }
}

init();
