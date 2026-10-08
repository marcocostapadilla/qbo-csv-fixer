/**
 * QBO CSV Fixer - license hook for a future unlimited version. OFF in this build.
 *
 * LICENSE_ENABLED = false: isProUnlocked() always returns false, nothing is fetched, nothing is
 * stored, and the free limits apply (1 file, up to 100 rows, watermarked export).
 * The verify call below is wired for later; it runs only when the flag is turned on.
 * Browser CORS on the verify endpoint is unverified: test it before turning the flag on.
 */
import { FREE_ROW_LIMIT } from './export.mjs';

/** Single switch for the license check. Keep false until the product listing exists. */
export const LICENSE_ENABLED = false;

/** Product slug of the planned listing. */
export const LICENSE_PRODUCT_PERMALINK = 'qbo-csv-fixer';
/**
 * PLACEHOLDER: the listing does not exist yet, so its product_id is unknown.
 * Newer products must be verified by product_id; replace this before enabling.
 */
export const LICENSE_PRODUCT_ID_PLACEHOLDER = 'REPLACE_WITH_PRODUCT_ID';
export const LICENSE_PRODUCT_ID = LICENSE_PRODUCT_ID_PLACEHOLDER;
/** Public license verify endpoint (POST, form fields product_id + license_key). */
export const LICENSE_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';

export const PRO_COMING_SOON = 'Unlimited version coming soon.';
export const FREE_LIMITS = Object.freeze({ files: 1, rows: FREE_ROW_LIMIT, watermark: true });
export const PRO_LIMITS = Object.freeze({ files: Infinity, rows: Infinity, watermark: false });

/** In-memory result of the last successful check (never persisted in this build). */
const licenseState = { unlocked: false, key: null };

/**
 * Check a license key with the vendor's verify endpoint.
 * opts.enabled (default LICENSE_ENABLED): when false, returns { ok: false, reason: 'disabled' }
 * without any network call. opts.fetch: fetch implementation (tests pass a mock).
 * opts.productId: defaults to LICENSE_PRODUCT_ID; the placeholder is refused without a call.
 * Result: { ok, reason, message?, purchase? }. reason: 'valid' | 'disabled' | 'empty-key' |
 * 'product-id-missing' | 'invalid' | 'refunded' | 'chargebacked' | 'network' | 'bad-response'.
 */
export async function verifyLicense(key, opts = {}) {
  const enabled = opts.enabled ?? LICENSE_ENABLED;
  if (!enabled) return { ok: false, reason: 'disabled' };
  const licenseKey = String(key ?? '').trim();
  if (!licenseKey) return { ok: false, reason: 'empty-key' };
  const productId = opts.productId ?? LICENSE_PRODUCT_ID;
  if (!productId || productId === LICENSE_PRODUCT_ID_PLACEHOLDER) return { ok: false, reason: 'product-id-missing' };
  const doFetch = opts.fetch || globalThis.fetch;
  const body = new URLSearchParams({ product_id: productId, license_key: licenseKey, increment_uses_count: 'false' });
  let data;
  try {
    // Form-encoded POST: a CORS "simple request" (no preflight); the response still needs CORS headers.
    const res = await doFetch(LICENSE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    try {
      data = await res.json();
    } catch {
      return { ok: false, reason: 'bad-response', message: `HTTP ${res && res.status}` };
    }
  } catch (err) {
    return { ok: false, reason: 'network', message: String((err && err.message) || err) };
  }
  if (!data || data.success !== true) {
    return { ok: false, reason: 'invalid', message: (data && data.message) || 'License not found.' };
  }
  const p = data.purchase || {};
  if (p.refunded) return { ok: false, reason: 'refunded', purchase: p };
  if (p.chargebacked || p.disputed) return { ok: false, reason: 'chargebacked', purchase: p };
  return { ok: true, reason: 'valid', purchase: p };
}

/** Verify and remember the result for this page view. Does nothing while the flag is off. */
export async function activateLicense(key, opts = {}) {
  const enabled = opts.enabled ?? LICENSE_ENABLED;
  const result = await verifyLicense(key, Object.assign({}, opts, { enabled }));
  licenseState.unlocked = enabled && result.ok;
  licenseState.key = licenseState.unlocked ? String(key).trim() : null;
  return result;
}

/**
 * True only when the flag is on AND a key was verified in this page view.
 * With LICENSE_ENABLED false this is always false and makes no network call.
 */
export function isProUnlocked() {
  if (!LICENSE_ENABLED) return false;
  return licenseState.unlocked === true;
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
