/**
 * QBO CSV Fixer - license hook for a future unlimited version.
 * Nothing is sold or checked yet. isProUnlocked() always returns false, so batch zip and saved
 * profiles stay disabled and the free limits apply (1 file, up to 100 rows, watermarked export).
 * Client-side only: this file makes no network calls and reads no stored keys.
 */
import { FREE_ROW_LIMIT } from './export.mjs';

export const PRO_COMING_SOON = 'Unlimited version coming soon.';
export const FREE_LIMITS = Object.freeze({ files: 1, rows: FREE_ROW_LIMIT, watermark: true });
export const PRO_LIMITS = Object.freeze({ files: Infinity, rows: Infinity, watermark: false });

/**
 * Future license check. Always false in this build: there is no license to check yet.
 * Tests pass `unlocked: true` to the feature functions instead of changing this.
 */
export function isProUnlocked() {
  return false;
}

/** Limits for a tier. Default: the current build's tier (free). */
export function limitsFor(unlocked = isProUnlocked()) {
  return unlocked ? PRO_LIMITS : FREE_LIMITS;
}

/** True when this many rows (and files) fit the tier's limits. */
export function tierAllows(rowCount, fileCount = 1, unlocked = isProUnlocked()) {
  const l = limitsFor(unlocked);
  return fileCount >= 1 && fileCount <= l.files && rowCount <= l.rows;
}
