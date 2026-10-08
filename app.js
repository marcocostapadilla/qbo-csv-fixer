/**
 * QBO CSV Fixer - browser UI (ES module). Serve via http.server for local demo.
 * Everything runs client-side; the file is read with FileReader and never uploaded.
 */
import {
  processCsv,
  detectPreset,
  buildExportRows,
  toCsvString,
  fmtMoney,
  FREE_ROW_LIMIT,
  WATERMARK_SUFFIX,
  PRESETS,
  QBO_PRESETS,
  freeTierAllows,
} from './core.mjs';

const els = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  browseBtn: document.getElementById('browseBtn'),
  fileName: document.getElementById('fileName'),
  processorPreset: document.getElementById('processorPreset'),
  qboPreset: document.getElementById('qboPreset'),
  processorHint: document.getElementById('processorHint'),
  detectNote: document.getElementById('detectNote'),
  results: document.getElementById('results'),
  badgeRow: document.getElementById('badgeRow'),
  skipNote: document.getElementById('skipNote'),
  dateWarning: document.getElementById('dateWarning'),
  dateWarningText: document.getElementById('dateWarningText'),
  dateOrderMdy: document.getElementById('dateOrderMdy'),
  dateOrderDmy: document.getElementById('dateOrderDmy'),
  previewHead: document.getElementById('previewHead'),
  previewBody: document.getElementById('previewBody'),
  downloadBtn: document.getElementById('downloadBtn'),
  tierNote: document.getElementById('tierNote'),
  errorBanner: document.getElementById('errorBanner'),
  txnCount: document.getElementById('txnCount'),
};

const AMBIGUOUS_TEXT =
  'Every date in this file could be read as US month/day or as EU day/month, so the file alone cannot tell which one your bank used. Pick the one that matches your statement before you download.';
const CONFLICT_TEXT =
  'Some dates in this file only work as month/day and others only as day/month, so the file mixes formats. Pick the format most rows use, then check every date in the preview against your statement before you download.';

let state = {
  fileName: '',
  rawText: '',
  result: null,
  dateOrder: null, // null = auto / preset default; 'mdy' | 'dmy' once the user picks
  presetLocked: false, // true once the user picks a preset or arrives with ?preset=
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

function setDetectNote(msg) {
  if (!msg) {
    els.detectNote.classList.add('hidden');
    els.detectNote.textContent = '';
    return;
  }
  els.detectNote.textContent = msg;
  els.detectNote.classList.remove('hidden');
}

function presetFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search).get('preset');
    return p && PRESETS[p] ? p : null;
  } catch {
    return null;
  }
}

function fillPresetSelects() {
  els.processorPreset.innerHTML = '';
  for (const p of Object.values(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    els.processorPreset.appendChild(opt);
  }
  const fromUrl = presetFromUrl();
  els.processorPreset.value = fromUrl || 'generic_bank';
  if (fromUrl) {
    state.presetLocked = true;
    setDetectNote(`Preset selected from link: ${PRESETS[fromUrl].label}.`);
  }

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

/** New file text arrived: reset the date choice and (unless locked) auto-detect the preset. */
function loadText(name, text, { autoDetect = true } = {}) {
  state.fileName = name;
  state.rawText = text;
  state.dateOrder = null;
  showError('');
  if (autoDetect) {
    const detected = detectPreset(text);
    const current = els.processorPreset.value;
    if (!state.presetLocked) {
      els.processorPreset.value = detected;
      updateProcessorHint();
      setDetectNote(
        detected === 'generic_bank'
          ? 'No specific bank layout recognized; using the generic bank map. Pick a preset if your bank is listed.'
          : `Auto-detected layout: ${PRESETS[detected].label}. Change it if that is wrong.`
      );
    } else if (detected !== current && detected !== 'generic_bank') {
      setDetectNote(`This file looks like ${PRESETS[detected].label}. Switch the preset if the preview looks wrong.`);
    } else {
      setDetectNote('');
    }
  }
  reprocess();
}

function readFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    els.fileName.textContent = file.name;
    loadText(file.name, String(reader.result || ''));
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
    state.result = processCsv(state.rawText, processorId, { dateOrder: state.dateOrder || undefined });
    renderResults();
  } catch (err) {
    console.error(err);
    showError('Parse error: ' + (err && err.message ? err.message : String(err)));
    els.results.classList.add('hidden');
  }
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

function renderResults() {
  const r = state.result;
  if (!r) return;
  els.results.classList.remove('hidden');

  renderDateWarning(r);

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

  if (r.skippedRows && r.skippedRows.length) {
    const list = r.skippedRows
      .slice(0, 8)
      .map((s) => `row ${s.sourceRow} (${s.reason})`)
      .join(', ');
    const more = r.skippedRows.length > 8 ? `, and ${r.skippedRows.length - 8} more` : '';
    els.skipNote.textContent = `Left out ${r.skippedRows.length} row(s) that did not settle: ${list}${more}.`;
    els.skipNote.classList.remove('hidden');
  } else {
    els.skipNote.classList.add('hidden');
    els.skipNote.textContent = '';
  }

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
    els.tierNote.innerHTML = `<strong>Free tier limit:</strong> this file has ${r.transactions.length} transaction rows (limit ${FREE_ROW_LIMIT}). Unlimited version coming soon.`;
    els.downloadBtn.disabled = true;
  } else {
    els.tierNote.innerHTML = `<strong>Free core:</strong> 1 file, up to ${FREE_ROW_LIMIT} rows, watermarked export (filename gets <code>${WATERMARK_SUFFIX}</code> and a watermark row). Unlimited version coming soon.`;
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
    state.presetLocked = true;
    setDetectNote('');
    updateProcessorHint();
    reprocess();
  });
  els.qboPreset.addEventListener('change', () => {
    if (state.result) renderResults();
  });
  for (const radio of [els.dateOrderMdy, els.dateOrderDmy]) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      state.dateOrder = radio.value;
      reprocess();
    });
  }
  els.downloadBtn.addEventListener('click', downloadExport);

  // Load the sample that matches the selected preset (needs http, not file://)
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const preset = PRESETS[els.processorPreset.value] || PRESETS.generic_bank;
      const path = preset.sample || 'samples/chase-like-messy.csv';
      const name = path.split('/').pop();
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        els.fileName.textContent = name + ' (sample)';
        setDetectNote('');
        loadText(name, text, { autoDetect: false });
      } catch (err) {
        showError(
          `Could not load ${path} via fetch. Open this page through a local server (see README), or drop the sample file yourself.`
        );
      }
    });
  }
}

init();
