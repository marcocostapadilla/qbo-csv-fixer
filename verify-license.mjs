/**
 * Verify suite 7 (v1.3): license hook, wired but OFF (LICENSE_ENABLED = false).
 * Every network case uses a mocked fetch; nothing here touches the network.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, ROOT } from './verify-lib.mjs';
import {
  LICENSE_ENABLED, LICENSE_PRODUCT_ID, LICENSE_PRODUCT_ID_PLACEHOLDER, LICENSE_PRODUCT_PERMALINK, LICENSE_VERIFY_URL,
  verifyLicense, activateLicense, isProUnlocked, limitsFor, FREE_LIMITS,
} from './license.mjs';

/** Mock fetch: records calls, answers with a JSON body (or throws when body is an Error). */
function mockFetch(body, status = 200) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    if (body instanceof Error) throw body;
    return { status, ok: status < 400, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

const ON = { enabled: true, productId: 'test-product-id' };
const purchase = (extra) => Object.assign({ email: 'buyer@example.com', refunded: false, chargebacked: false, disputed: false }, extra);

export async function run() {
  console.log('');
  console.log('=== v1.3 license hook (off by default, mocked fetch) ===');
  assert(LICENSE_ENABLED === false, 'LICENSE_ENABLED === false in this build');
  assert(LICENSE_PRODUCT_ID === LICENSE_PRODUCT_ID_PLACEHOLDER && /^REPLACE_/.test(LICENSE_PRODUCT_ID), 'product_id is a clearly named placeholder');
  assert(LICENSE_PRODUCT_PERMALINK === 'qbo-csv-fixer', 'product slug is qbo-csv-fixer');
  assert(/^https:\/\/api\.[a-z]+\.com\/v2\/licenses\/verify$/.test(LICENSE_VERIFY_URL), 'verify endpoint is the HTTPS /v2/licenses/verify URL');

  // Flag false: no fetch, ever.
  const off = mockFetch({ success: true, purchase: purchase() });
  const r0 = await verifyLicense('KEY-1', { fetch: off, productId: 'test-product-id' });
  const r0b = await activateLicense('KEY-1', { fetch: off, productId: 'test-product-id' });
  assert(r0.reason === 'disabled' && r0b.reason === 'disabled' && off.calls.length === 0, 'flag false: verify/activate return disabled and fetch is never called');
  assert(isProUnlocked() === false && limitsFor() === FREE_LIMITS && off.calls.length === 0, 'flag false: isProUnlocked() false, free limits, still no fetch');

  // Success
  const okF = mockFetch({ success: true, uses: 1, purchase: purchase() });
  const r1 = await verifyLicense('  KEY-OK  ', Object.assign({ fetch: okF }, ON));
  const sent = okF.calls[0];
  const form = sent ? new URLSearchParams(sent.init.body) : new URLSearchParams();
  assert(r1.ok === true && r1.reason === 'valid', `valid key accepted (got ${r1.reason})`);
  assert(okF.calls.length === 1 && sent.url === LICENSE_VERIFY_URL && sent.init.method === 'POST', 'one POST to the verify endpoint');
  assert(form.get('product_id') === 'test-product-id' && form.get('license_key') === 'KEY-OK' && form.get('increment_uses_count') === 'false', 'form fields product_id + trimmed license_key, uses count not incremented');
  assert(/x-www-form-urlencoded/.test(sent.init.headers['Content-Type']), 'form-encoded body (CORS simple request)');

  // Invalid key (vendor answers 404 with success false)
  const badF = mockFetch({ success: false, message: 'That license does not exist for the provided product.' }, 404);
  const r2 = await verifyLicense('NOPE', Object.assign({ fetch: badF }, ON));
  assert(r2.ok === false && r2.reason === 'invalid' && /does not exist/.test(r2.message), `invalid key rejected with the vendor message (got ${r2.reason})`);

  // Refunded / chargebacked / disputed purchases
  const r3 = await verifyLicense('K', Object.assign({ fetch: mockFetch({ success: true, purchase: purchase({ refunded: true }) }) }, ON));
  const r4 = await verifyLicense('K', Object.assign({ fetch: mockFetch({ success: true, purchase: purchase({ chargebacked: true }) }) }, ON));
  const r5 = await verifyLicense('K', Object.assign({ fetch: mockFetch({ success: true, purchase: purchase({ disputed: true }) }) }, ON));
  assert(!r3.ok && r3.reason === 'refunded', `refunded purchase rejected (got ${r3.reason})`);
  assert(!r4.ok && r4.reason === 'chargebacked' && !r5.ok && r5.reason === 'chargebacked', `chargebacked / disputed purchase rejected (got ${r4.reason}, ${r5.reason})`);

  // Network error and unreadable response
  const r6 = await verifyLicense('K', Object.assign({ fetch: mockFetch(new TypeError('Failed to fetch')) }, ON));
  assert(!r6.ok && r6.reason === 'network' && /Failed to fetch/.test(r6.message), `network error handled, no throw (got ${r6.reason})`);
  const htmlF = async () => ({ status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } });
  const r7 = await verifyLicense('K', Object.assign({ fetch: htmlF }, ON));
  assert(!r7.ok && r7.reason === 'bad-response', `non-JSON response handled (got ${r7.reason})`);

  // Guards that never reach the network
  const guardF = mockFetch({ success: true, purchase: purchase() });
  const r8 = await verifyLicense('   ', Object.assign({ fetch: guardF }, ON));
  const r9 = await verifyLicense('K', { enabled: true, fetch: guardF });
  assert(r8.reason === 'empty-key' && r9.reason === 'product-id-missing' && guardF.calls.length === 0, 'empty key and placeholder product_id refused without a call');

  // Activation while the build flag is off never unlocks, even with a forced verify
  const r10 = await activateLicense('KEY-OK', { fetch: mockFetch({ success: true, purchase: purchase() }), productId: 'x' });
  assert(r10.reason === 'disabled' && isProUnlocked() === false, 'activateLicense cannot unlock while LICENSE_ENABLED is false');

  // The vendor name and endpoint live only in license.mjs
  const app = readFileSync(join(ROOT, 'app.js'), 'utf8') + readFileSync(join(ROOT, 'pro-ui.mjs'), 'utf8');
  assert(!/verifyLicense|activateLicense/.test(app), 'app.js and pro-ui.mjs never call the license check (no UI change)');
}
