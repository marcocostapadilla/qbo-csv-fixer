/** v1.5.23: 'Try a sample for the selected bank' button, moved out of app.js. */
import { PRESETS } from './presets.mjs';
import { els, showError, setDetectNote } from './ui.mjs';

export function setupSampleButton(loadText) {
  // sample for the selected preset (http only)
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

/** v1.5.24: ?demo=sign-fix-before or ?demo=sign-fix-after loads that example file (sign-fix-demo.html). */
export const DEMOS = ['sign-fix-before', 'sign-fix-after'];
export async function loadDemoFromUrl(loadText) {
  let d = null;
  try { d = new URLSearchParams(window.location.search).get('demo'); } catch { return; }
  if (!DEMOS.includes(d)) return;
  try {
    const res = await fetch(`samples/demo/${d}.csv`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    els.fileName.textContent = `${d}.csv (example file)`;
    loadText(`${d}.csv`, await res.text());
  } catch {
    showError(`Could not load the example file samples/demo/${d}.csv. Download it from the demo page and drop it here.`);
  }
}
