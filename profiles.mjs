/**
 * QBO CSV Fixer - saved mapping profiles in localStorage (part of the future unlimited version).
 * A profile remembers the input preset, the QBO column layout, the date order and the decimal
 * separator under a name, so a bookkeeper can reuse them per client. Stored only in this browser.
 * Gated by isProUnlocked(): in this build every call refuses and nothing is written.
 */
import { PRESETS, QBO_PRESETS } from './presets.mjs';
import { isProUnlocked, PRO_COMING_SOON } from './license.mjs';

export const PROFILES_KEY = 'qbo-csv-fixer.profiles.v1';
export const NAME_MAX = 40;
export const MAX_PROFILES = 50;
const LOCKED = `Saved profiles are part of the unlimited version. ${PRO_COMING_SOON}`;

function storageOf(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** Trim, collapse spaces, cap length. Empty string means invalid. */
export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

/** Keep only known fields with valid values; null when the preset ids are unknown. */
export function validateProfile(p) {
  if (!p || !PRESETS[p.preset] || !QBO_PRESETS[p.qbo]) return null;
  return {
    preset: p.preset,
    qbo: p.qbo,
    dateOrder: p.dateOrder === 'mdy' || p.dateOrder === 'dmy' ? p.dateOrder : null,
    decimal: p.decimal === '.' || p.decimal === ',' ? p.decimal : null,
  };
}

function readAll(s) {
  try {
    const v = JSON.parse(s.getItem(PROFILES_KEY) || '[]');
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof x.name === 'string' && cleanName(x.name) && validateProfile(x));
  } catch {
    return [];
  }
}

function writeAll(s, list) {
  s.setItem(PROFILES_KEY, JSON.stringify(list));
}

function gate(opts) {
  const unlocked = opts.unlocked ?? isProUnlocked();
  if (!unlocked) return { error: LOCKED };
  const s = storageOf(opts.storage);
  if (!s) return { error: 'This browser does not allow local storage.' };
  return { s };
}

/** Profile names, sorted. Empty when locked. */
export function listProfiles(opts = {}) {
  const g = gate(opts);
  if (g.error) return [];
  return readAll(g.s).map((x) => x.name).sort((a, b) => a.localeCompare(b));
}

/** Save (or overwrite) a profile by name. */
export function saveProfile(name, profile, opts = {}) {
  const g = gate(opts);
  if (g.error) return { ok: false, reason: g.error };
  const n = cleanName(name);
  if (!n) return { ok: false, reason: 'Give the profile a name.' };
  const p = validateProfile(profile);
  if (!p) return { ok: false, reason: 'Unknown preset in this profile.' };
  const list = readAll(g.s).filter((x) => x.name.toLowerCase() !== n.toLowerCase());
  if (list.length >= MAX_PROFILES) return { ok: false, reason: `Up to ${MAX_PROFILES} profiles. Delete one first.` };
  list.push({ name: n, ...p });
  writeAll(g.s, list);
  return { ok: true, name: n };
}

/** Load a profile by name (case-insensitive). */
export function loadProfile(name, opts = {}) {
  const g = gate(opts);
  if (g.error) return { ok: false, reason: g.error };
  const n = cleanName(name).toLowerCase();
  const hit = readAll(g.s).find((x) => x.name.toLowerCase() === n);
  return hit ? { ok: true, name: hit.name, profile: validateProfile(hit) } : { ok: false, reason: 'No profile with that name.' };
}

/** Delete a profile by name. */
export function deleteProfile(name, opts = {}) {
  const g = gate(opts);
  if (g.error) return { ok: false, reason: g.error };
  const n = cleanName(name).toLowerCase();
  const list = readAll(g.s);
  const next = list.filter((x) => x.name.toLowerCase() !== n);
  if (next.length === list.length) return { ok: false, reason: 'No profile with that name.' };
  writeAll(g.s, next);
  return { ok: true };
}
