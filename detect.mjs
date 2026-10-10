/**
 * QBO CSV Fixer - guess the input preset from a file's header / shape, with a confidence.
 *
 * 1. Shape rule: Wells Fargo files have no header (date, signed amount, "*", check, description).
 * 2. Header rules (preset.detect): exact layout markers such as "Card Member" (Amex) or
 *    "TransferWise ID" (Wise). Names are compared fuzzily (headerKey), in any column order,
 *    with extra columns allowed. A rule match is high confidence.
 * 3. Signature score (preset.signatures) for drifted headers no rule matches: the weighted
 *    share of a preset's usual headers found in one row. Generic names (Date, Amount, ...)
 *    weigh 1, distinctive names (Card Member, Running Bal., ...) weigh 3.
 *    score >= 0.85 high, >= 0.6 medium, else low (the generic map is used and the closest
 *    presets are suggested).
 */
import { parseCsv } from './parse.mjs';
import { parseDateParts } from './dates.mjs';
import { headerKey } from './headers.mjs';
import { fieldOfHeader } from './fields.mjs';
import { PRESETS, DETECT_ORDER } from './presets.mjs';

export function looksLikeAmount(cell) {
  const t = String(cell ?? '').trim();
  return t !== '' && /^[($+-]*\$?[\d,]+(\.\d+)?\)?$/.test(t.replace(/\s/g, ''));
}

/** True when a row looks like a Wells Fargo headerless data row. */
export function isWellsFargoDataRow(row) {
  return (
    row.length >= 5 &&
    parseDateParts(row[0]) != null &&
    looksLikeAmount(row[1]) &&
    /^\*?$/.test(String(row[2] ?? '').trim())
  );
}

const GENERIC_WORDS = new Set(['type', 'category', 'balance', 'currency', 'fee', 'status', 'state', 'id', 'time', 'name', 'memo']);

function weightOf(name) {
  const k = headerKey(name);
  return fieldOfHeader(name) || GENERIC_WORDS.has(k) ? 1 : 3;
}

function ruleMatches(keySet, rule) {
  const has = (n) => keySet.has(headerKey(n));
  if (rule.all && !rule.all.every(has)) return false;
  if (rule.any && !rule.any.some(has)) return false;
  if (rule.none && rule.none.some(has)) return false;
  return true;
}

function signatureScore(keySet, sig) {
  let total = 0;
  let got = 0;
  for (const name of sig) {
    const w = weightOf(name);
    total += w;
    if (keySet.has(headerKey(name))) got += w;
  }
  return total ? got / total : 0;
}

function confidenceOf(score) {
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

/**
 * Scored detection.
 * Returns { id, confidence: 'high'|'medium'|'low', score, method: 'shape'|'rule'|'signature'|'none',
 *           candidates: [{ id, score }] (best first, score >= 0.3) }.
 * When confidence is low, id is 'generic_bank' and candidates are the suggestions.
 */
export function detectPresetScored(text) {
  const rows = parseCsv(text).slice(0, 25);
  const none = { id: 'generic_bank', confidence: 'low', score: 0, method: 'none', candidates: [] };
  if (!rows.length) return none;

  if (isWellsFargoDataRow(rows[0]) && rows.slice(0, 5).every((r) => isWellsFargoDataRow(r))) {
    return { id: 'wells_fargo', confidence: 'high', score: 1, method: 'shape', candidates: [{ id: 'wells_fargo', score: 1 }] };
  }

  const keySets = rows.map((r) => new Set(r.map(headerKey).filter(Boolean)));

  for (const id of DETECT_ORDER) {
    const p = PRESETS[id];
    if (!p || !p.detect) continue;
    if (keySets.some((ks) => p.detect.some((rule) => ruleMatches(ks, rule)))) {
      return { id, confidence: 'high', score: 1, method: 'rule', candidates: [{ id, score: 1 }] };
    }
  }

  const scored = [];
  for (const p of Object.values(PRESETS)) {
    if (!p.signatures) continue;
    let best = 0;
    for (const ks of keySets) {
      for (const sig of p.signatures) best = Math.max(best, signatureScore(ks, sig));
    }
    if (best >= 0.3) scored.push({ id: p.id, score: Math.round(best * 100) / 100 });
  }
  scored.sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, 3);
  if (!candidates.length) return none;
  const top = candidates[0];
  const confidence = confidenceOf(top.score);
  if (confidence === 'low') return { id: 'generic_bank', confidence, score: top.score, method: 'none', candidates };
  return { id: top.id, confidence, score: top.score, method: 'signature', candidates };
}

/**
 * Guess the input preset from the file's header / shape.
 * Returns a PRESETS id; 'generic_bank' when nothing specific matches with at least medium confidence.
 */
export function detectPreset(text) {
  return detectPresetScored(text).id;
}

/**
 * Whether the detect note should stay visible next to this result. A file error (empty, not CSV,
 * header only) says what is wrong; "closest bank matches" next to it is noise, so it is hidden.
 * Missing-column errors keep the note: the suggested presets help there.
 */
export function showDetectNoteFor(result) {
  return !(result && result.fileError);
}

/** Short visible note, e.g. "Detected: Capital One (credit card) (high confidence)". */
export function detectionNote(det) {
  const label = (id) => (PRESETS[id] ? PRESETS[id].label : id);
  if (det.confidence === 'high') return `Recognized as ${label(det.id)}.`;
  if (det.confidence !== 'low') return `Looks like ${label(det.id)}. If the preview looks wrong, pick your bank in the list.`;
  const sugg = det.candidates.map((c) => `${label(c.id)} (${Math.round(c.score * 100)}% header match)`);
  return sugg.length
    ? `Could not tell which bank this file is from, so a general layout is used. Closest matches: ${sugg.join(', ')}. If one is your bank, pick it in the list and check the preview.`
    : 'Could not tell which bank this file is from, so a general layout is used. If your bank or app is in the list, pick it and check the preview.';
}
