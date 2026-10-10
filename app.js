/**
 * QBO CSV Fixer - browser UI (ES module). Serve via http.server for local demo.
 * Everything runs client-side; the file is read with FileReader and never uploaded.
 * Rendering lives in ui.mjs; parsing, mapping and detection in core.mjs and its modules.
 */
import { groupPresets } from './groups.mjs';
import {
  processCsv,
  rejectReason,
  detectPresetScored,
  detectionNote,
  buildExportRows,
  toCsvString,
  exportFileName,
  PRESETS,
  QBO_PRESETS,
  WATERMARK_SUFFIX,
  FREE_ROW_LIMIT,
} from './core.mjs';
import { els, showError, setDetectNote, renderResults, hideResults, revealResults } from './ui.mjs';
import { isProUnlocked, limitsFor, canDownload } from './license.mjs';
import { showDetectNoteFor } from './detect.mjs';
import { setupPro } from './pro-ui.mjs';
import { PRO_SUFFIX } from './batch.mjs';
import { decodeBytes } from './encoding.mjs';
import { setupUseful, offerUseful } from './useful.mjs';

let pro = { multiDrop() {} };

let state = {
  fileName: '',
  rawText: '',
  result: null,
  dateOrder: null, // null = auto / preset default; 'mdy' | 'dmy' once the user picks
  decimal: null, // null = auto; '.' | ',' once the user picks (only asked when the file is ambiguous)
  presetLocked: false, // true once the user picks a preset or arrives with ?preset=
};

function presetFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search).get('preset');
    return p && PRESETS[p] ? p : null;
  } catch {
    return null;
  }
}

function fillSelect(select, presets, value, grouped = false) {
  select.innerHTML = '';
  const add = (parent, p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    parent.appendChild(opt);
  };
  if (grouped) {
    for (const [label, list] of groupPresets(presets)) {
      const g = document.createElement('optgroup');
      g.label = label;
      list.forEach((p) => add(g, p));
      select.appendChild(g);
    }
  } else Object.values(presets).forEach((p) => add(select, p));
  select.value = value;
}

function fillPresetSelects() {
  const fromUrl = presetFromUrl();
  fillSelect(els.processorPreset, PRESETS, fromUrl || 'generic_bank', true);
  if (fromUrl) {
    state.presetLocked = true;
    setDetectNote(`Preset selected from link: ${PRESETS[fromUrl].label}. Drop that file below.`);
  }
  fillSelect(els.qboPreset, QBO_PRESETS, 'date_desc_amount');
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
  state.decimal = null;
  showError('');
  if (rejectReason(text)) {
    setDetectNote('');
  } else if (autoDetect) {
    const det = detectPresetScored(text);
    const current = els.processorPreset.value;
    if (!state.presetLocked) {
      els.processorPreset.value = det.id;
      updateProcessorHint();
      setDetectNote(detectionNote(det));
    } else if (det.id !== current && det.confidence !== 'low') {
      setDetectNote(
        `This file looks like ${PRESETS[det.id].label}, not ${PRESETS[current].label} (the bank picked now). If the preview looks wrong, pick ${PRESETS[det.id].label} in the list.`
      );
    } else {
      setDetectNote('');
    }
  }
  reprocess({ reveal: true });
}

function readFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    els.fileName.textContent = file.name;
    // v1.4: raw bytes, decoded here, so UTF-16 and Windows-1252 files are read correctly
    loadText(file.name, decodeBytes(reader.result).text);
  };
  reader.onerror = () => showError('Your browser could not open that file. Check that it finished downloading and is not open in another program, then try again.');
  reader.readAsArrayBuffer(file);
}

function reprocess({ reveal = false, focus = true } = {}) {
  if (!state.fileName && !state.rawText) {
    hideResults();
    return;
  }
  try {
    const processorId = els.processorPreset.value || 'generic_bank';
    state.result = processCsv(state.rawText, processorId, {
      dateOrder: state.dateOrder || undefined,
      decimal: state.decimal || undefined,
    });
    const r = state.result;
    const fatal = r.fileError || r.mappingError;
    if (fatal) {
      // Empty / binary / no rows, or required columns missing: say why; never guess.
      if (!showDetectNoteFor(r)) setDetectNote('');
      showError(fatal.message);
      hideResults();
      return;
    }
    const allowed = renderResults(state.result, els.qboPreset.value || 'date_desc_amount');
    showError(!r.transactions.length ? 'No rows could be converted, so there is nothing to download. The note below lists each row and why; fix them in the file or check that the right bank is picked.'
      : allowed ? '' : `This file has ${r.transactions.length} rows and the free version converts up to ${FREE_ROW_LIMIT}, so Download is off. Download a shorter date range from your bank and convert each part.`);
    if (reveal && r.transactions.length && allowed) revealResults({ focus }); // no scroll when the message is the banner at the top
  } catch (err) {
    console.error(err);
    showError('Something went wrong reading this file (' + (err && err.message ? err.message : String(err)) + '). Try exporting it again, or pick another bank in the list.');
    hideResults();
  }
}

function downloadExport() {
  const r = state.result;
  if (!canDownload(r)) return;
  const qboId = els.qboPreset.value || 'date_desc_amount';
  const { header, body } = buildExportRows(r.transactions, qboId);
  const wm = limitsFor(isProUnlocked()).watermark; // always true until a license check exists; filename only
  const csv = toCsvString(header, body);
  saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), exportFileName(state.fileName, wm ? WATERMARK_SUFFIX : PRO_SUFFIX));
  offerUseful();
}

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
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
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, prevent));
  dz.addEventListener('dragover', () => dz.classList.add('dragover'));
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    dz.classList.remove('dragover');
    const list = (e.dataTransfer && e.dataTransfer.files) || [];
    pro.multiDrop(list.length); // free core: 1 file; only the first one is read
    if (list[0]) readFile(list[0]);
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

function setupSampleButton() {
  // Load the sample that matches the selected preset (needs http, not file://)
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  if (!loadSampleBtn) return;
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

function init() {
  fillPresetSelects();
  setupDropzone();
  setupSampleButton();
  els.processorPreset.addEventListener('change', () => {
    state.presetLocked = true;
    setDetectNote('');
    updateProcessorHint();
    reprocess({ reveal: true, focus: false }); // keep focus on the list
  });
  els.qboPreset.addEventListener('change', () => {
    const r = state.result;
    if (r && !r.mappingError && !r.fileError) renderResults(r, els.qboPreset.value);
  });
  for (const radio of [els.decimalDot, els.decimalComma]) {
    if (!radio) continue;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      state.decimal = radio.value;
      reprocess();
    });
  }
  for (const radio of [els.dateOrderMdy, els.dateOrderDmy]) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      state.dateOrder = radio.value;
      reprocess();
    });
  }
  els.downloadBtn.addEventListener('click', downloadExport);
  setupUseful('index');
  pro = setupPro({
    getSettings: () => ({ preset: els.processorPreset.value, qbo: els.qboPreset.value, dateOrder: state.dateOrder, decimal: state.decimal }),
    applySettings,
    saveBlob,
  });
}

/** Apply a saved profile (Pro only; never called while isProUnlocked() is false). */
function applySettings(p) {
  els.processorPreset.value = p.preset;
  els.qboPreset.value = p.qbo;
  state.presetLocked = true;
  state.dateOrder = p.dateOrder;
  state.decimal = p.decimal;
  updateProcessorHint();
  setDetectNote('');
  reprocess();
}

init();
