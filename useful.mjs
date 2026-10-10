/**
 * v1.5.8: "Was this useful?" prompt after a download. Inline, at most once per visit
 * (sessionStorage), one GoatCounter event per answer through the existing embed.
 * No cookies, no new third party. If GoatCounter is blocked, the answer is dropped silently.
 */
export const USEFUL_KEY = 'qbofixer-useful-asked';

/** sessionStorage can throw (private mode, storage disabled): treat as "not asked". */
export function wasAsked(store = globalThis.sessionStorage) {
  try { return !!store && store.getItem(USEFUL_KEY) === '1'; } catch { return false; }
}

export function markAsked(store = globalThis.sessionStorage) {
  try { if (store) store.setItem(USEFUL_KEY, '1'); } catch { /* private mode: ask again next time, harmless */ }
}

/** The GoatCounter event for one answer. answer: 'yes' | 'no'; page: short slug like 'index'. */
export function usefulEvent(answer, page) {
  return { path: `useful-${answer}/${page}`, title: `Useful: ${answer}`, event: true };
}

/** Send through window.goatcounter.count when it is there; returns true when sent. */
export function sendUseful(answer, page, gc = globalThis.goatcounter) {
  if (!gc || typeof gc.count !== 'function') return false;
  try { gc.count(usefulEvent(answer, page)); return true; } catch { return false; }
}

/** Wire the buttons once. */
export function setupUseful(page = 'index') {
  const box = document.getElementById('useful');
  const thanks = document.getElementById('usefulThanks');
  if (!box || !thanks) return;
  const answer = (a) => {
    sendUseful(a, page);
    box.classList.add('hidden');
    thanks.textContent = 'Thanks, that helps.';
  };
  document.getElementById('usefulYes').addEventListener('click', () => answer('yes'));
  document.getElementById('usefulNo').addEventListener('click', () => answer('no'));
}

/** Call after a successful download. Shows the prompt only the first time in this visit. */
export function offerUseful() {
  const box = document.getElementById('useful');
  if (!box || wasAsked()) return;
  markAsked();
  box.classList.remove('hidden');
}
