/**
 * v1.5.17: the "this bank can't read this file" banner gets a one-click switch to the general
 * layout. A real <button> placed right after the error banner; it only sets the existing select.
 */
let btn = null;

export function setupWrong(select, onPick) {
  const banner = document.getElementById('errorBanner');
  if (!banner || btn) return;
  btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'useGeneral';
  btn.className = 'secondary use-general hidden';
  btn.textContent = 'Use the general layout';
  btn.addEventListener('click', () => {
    select.value = 'generic_bank';
    onPick();
  });
  banner.insertAdjacentElement('afterend', btn);
}

export function showWrong(on) {
  if (btn) btn.classList.toggle('hidden', !on);
}
