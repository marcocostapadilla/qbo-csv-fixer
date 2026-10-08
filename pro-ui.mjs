/**
 * QBO CSV Fixer - browser wiring for the Pro card (batch zip, saved profiles).
 * While isProUnlocked() is false (this build) every control stays disabled and only the
 * neutral "coming soon" note shows. Files are read locally and never uploaded.
 */
import { isProUnlocked, PRO_COMING_SOON } from './license.mjs';
import { convertBatch } from './batch.mjs';
import { listProfiles, saveProfile, loadProfile, deleteProfile } from './profiles.mjs';

const IDS = ['batchInput', 'batchBtn', 'profileName', 'profileSave', 'profileSelect', 'profileLoad', 'profileDelete'];

const readText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ name: file.name, text: String(r.result || '') });
    r.onerror = () => reject(new Error('Could not read ' + file.name));
    r.readAsText(file);
  });

/**
 * ctx: { getSettings(), applySettings(profile), saveBlob(blob, name) }.
 * Returns { multiDrop(n) } so the free dropzone can explain that only the first file was read.
 */
export function setupPro(ctx) {
  const el = Object.fromEntries(IDS.map((id) => [id, document.getElementById(id)]));
  const note = document.getElementById('proNote');
  const say = (msg) => {
    if (note) note.textContent = msg;
  };
  const unlocked = isProUnlocked();
  for (const e of Object.values(el)) if (e) e.disabled = !unlocked;
  const api = {
    multiDrop(n) {
      if (n > 1 && !unlocked) say(`You dropped ${n} files. The free core reads the first one only. ${PRO_COMING_SOON}`);
    },
  };
  if (!unlocked || !el.batchBtn) return api;

  const refresh = () => {
    el.profileSelect.innerHTML = '';
    for (const name of listProfiles()) {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      el.profileSelect.appendChild(o);
    }
  };
  refresh();

  el.batchBtn.addEventListener('click', async () => {
    const files = Array.from(el.batchInput.files || []);
    if (!files.length) return say('Choose one or more CSV files first.');
    try {
      const s = ctx.getSettings();
      const b = convertBatch(await Promise.all(files.map(readText)), { presetId: 'auto', qboId: s.qbo, unlocked });
      if (!b.ok) return say(b.reason);
      ctx.saveBlob(new Blob([b.zip], { type: 'application/zip' }), 'qbo-csv-fixer-batch.zip');
      const bad = b.report.filter((r) => r.error).length;
      say(`Zipped ${b.report.length - bad} of ${b.report.length} files. See batch-summary.csv in the zip${bad ? ` for the ${bad} that could not be read` : ''}.`);
    } catch (err) {
      say(err && err.message ? err.message : String(err));
    }
  });
  el.profileSave.addEventListener('click', () => {
    const r = saveProfile(el.profileName.value, ctx.getSettings());
    say(r.ok ? `Saved "${r.name}".` : r.reason);
    refresh();
    if (r.ok) el.profileSelect.value = r.name;
  });
  el.profileLoad.addEventListener('click', () => {
    const r = loadProfile(el.profileSelect.value);
    if (!r.ok) return say(r.reason);
    ctx.applySettings(r.profile);
    say(`Loaded "${r.name}".`);
  });
  el.profileDelete.addEventListener('click', () => {
    const r = deleteProfile(el.profileSelect.value);
    say(r.ok ? 'Deleted.' : r.reason);
    refresh();
  });
  return api;
}
