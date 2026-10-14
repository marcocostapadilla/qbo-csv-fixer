/**
 * QBO CSV Fixer - browser UI (ES module). Serve via http.server for local demo.
 * Everything runs client-side; the file is read with FileReader and never uploaded.
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
import { presetMismatch } from './wrongpreset.mjs';
import { setupWrong, showWrong } from './wrongui.mjs';
import { setupSampleButton, loadDemoFromUrl } from './samplebtn.mjs';

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

/** New file: reset date choice, auto-detect unless locked. */
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
    // v1.4: decode raw bytes (UTF-16, Windows-1252)
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
    const wrong = presetMismatch(r, processorId); // v1.5.17: say so, never keep an old result
    if (wrong) {
      setDetectNote('');
      showError(wrong);
      hideResults();
      showWrong(true); // after the banner is shown, so it can scroll into view
      return;
    }
    showWrong(false);
    const fatal = r.fileError || r.mappingError;
    if (fatal) {
      // say why; never guess
      if (!showDetectNoteFor(r)) setDetectNote('');
      showError(fatal.message);
      hideResults();
      return;
    }
    const allowed = renderResults(state.result, els.qboPreset.value || 'date_desc_amount');
    // v1.5.23: the free-limit text lives only in the note next to Download (ui.mjs), so step 3 is shown for it
    showError(!r.transactions.length ? 'No rows could be converted, so there is nothing to download. The note below lists each row and why; fix them in the file or check that the right bank is picked.' : '');
    if (reveal && r.transactions.length) revealResults({ focus }); // no scroll when the message is the banner at the top
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

function init() {
  fillPresetSelects();
  setupDropzone();
  setupSampleButton(loadText);
  loadDemoFromUrl(loadText);
  setupWrong(els.processorPreset, () => { state.presetLocked = true; updateProcessorHint(); reprocess({ reveal: true }); });
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
