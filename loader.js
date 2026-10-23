/** The first-visit loader: the name is generated token by token, then the curtain lifts. */
const TOKEN_STEP = 260;
const COUNT_DURATION = 1300;
const LIFT = 900;

export function runLoader() {
  const root = document.documentElement;
  const loader = document.querySelector('.loader');
  if (!loader || !root.classList.contains('is-loading')) return;
  try {
    sessionStorage.setItem('intro-seen', '1');
  } catch {
    // Without session storage the loader may show again on the next visit, which is harmless.
  }
  const tokens = Array.from(loader.querySelectorAll('.token'));
  const count = loader.querySelector('.loader-count');
  const timers = tokens.map((token, index) => setTimeout(() => token.classList.add('is-in'), 120 + index * TOKEN_STEP));
  const start = performance.now();
  let frame = 0;
  let lifted = false;
  const tick = now => {
    const progress = Math.min(1, (now - start) / COUNT_DURATION);
    if (count) count.textContent = `${Math.round(progress * 100)}%`;
    if (progress < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  // Any key or click skips ahead.
  function lift() {
    if (lifted) return;
    lifted = true;
    timers.forEach(clearTimeout);
    cancelAnimationFrame(frame);
    window.removeEventListener('keydown', lift);
    loader.removeEventListener('pointerdown', lift);
    tokens.forEach(token => token.classList.add('is-in'));
    if (count) count.textContent = '100%';
    loader.classList.add('is-done');
    root.classList.add('is-leaving');
    setTimeout(() => root.classList.remove('is-loading', 'is-leaving'), LIFT);
  }
  timers.push(setTimeout(lift, COUNT_DURATION + 380));
  window.addEventListener('keydown', lift);
  loader.addEventListener('pointerdown', lift);
}
