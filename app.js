import { sectionProgress, smoothRange, easeOutCubic, easeInOutCubic, follow } from './motion-utils.mjs?v=3';
import { createSculpture } from './sculpture.js?v=3';
import { caseStudies } from './cases.js?v=3';
import { initInteractions } from './interactions.js?v=3';

const hero = document.querySelector('.hero-scroll');
const canvas = document.querySelector('.sculpture');
const shadow = document.querySelector('.sculpture-shadow');
const sculpture = createSculpture(canvas);
const progressLine = document.querySelector('.hero-progress span');
const motionButton = document.querySelector('.motion-toggle');
const motionLabel = document.querySelector('.motion-label');
const motionIcon = document.querySelector('.motion-icon');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let paused = reducedMotion.matches;
let motionFrame = 0;
let lastFrame = 0;
let heroVisible = true;
let interactions = null;
// The intro starts slightly after the headline so the strand draws in beside it.
const INTRO_DELAY = .25;
const INTRO_DURATION = 2.1;
const motion = {
  clock: 0,
  intro: paused ? 1 : -INTRO_DELAY / INTRO_DURATION,
  scroll: 0,
  scrollTarget: 0,
  tilt: [0, 0],
  tiltTarget: [0, 0],
};

function updateMotionLabel() {
  motionButton.setAttribute('aria-pressed', String(paused));
  motionLabel.textContent = paused ? 'Enable motion' : 'Pause motion';
  motionIcon.textContent = paused ? '▷' : 'Ⅱ';
  document.body.dataset.motion = paused ? 'paused' : 'running';
  interactions?.syncMotion();
}
motionButton.hidden = false;
updateMotionLabel();

function measureProgress() {
  // Map the full height of the hero, so the turn happens while it leaves the screen.
  const top = hero.getBoundingClientRect().top + window.scrollY;
  return sectionProgress(window.scrollY, top, top + Math.max(hero.offsetHeight, 200));
}
function render() {
  const intro = Math.max(0, Math.min(1, motion.intro));
  const settle = easeOutCubic(intro);
  sculpture?.draw({
    progress: smoothRange(motion.scroll, 0, 1),
    reveal: easeInOutCubic(intro),
    // The strand unwinds into place, then keeps a slow turn about its own axis.
    spin: motion.clock * .11 - (1 - settle) * 1.25,
    flow: motion.clock * .32,
    light: Math.sin(motion.clock * .21) * .3 + motion.tilt[0] * 1.4,
    tilt: motion.tilt,
  });
  const float = paused ? 0 : Math.sin(motion.clock * .85) * 7;
  canvas.style.transform = float ? `translate3d(0, ${float.toFixed(2)}px, 0)` : '';
  if (shadow) {
    shadow.style.opacity = String(settle * (1 - float / 40));
    shadow.style.transform = `rotate(-7deg) scale(${(1 - float / 90).toFixed(3)})`;
  }
}
function frame(now) {
  motionFrame = 0;
  if (paused || document.hidden || !heroVisible) {
    lastFrame = 0;
    return;
  }
  // Slow devices keep real time down to 10fps; longer gaps (a stalled tab) are not replayed.
  const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 1 / 60;
  lastFrame = now;
  motion.clock += delta;
  motion.intro = Math.min(1, motion.intro + delta / INTRO_DURATION);
  motion.scroll = follow(motion.scroll, motion.scrollTarget, 7, delta);
  motion.tilt = motion.tilt.map((value, axis) => follow(value, motion.tiltTarget[axis], 3.5, delta));
  render();
  motionFrame = requestAnimationFrame(frame);
}
function startMotion() {
  if (!paused && !motionFrame && !document.hidden && heroVisible) motionFrame = requestAnimationFrame(frame);
}
function stopMotion() {
  if (motionFrame) cancelAnimationFrame(motionFrame);
  motionFrame = 0;
  lastFrame = 0;
}
function settleStill() {
  // A paused sculpture is complete and still, even if paused mid-intro. Scrolling no longer turns it.
  motion.intro = 1;
  motion.tilt = [0, 0];
  render();
}
function onScroll() {
  motion.scrollTarget = measureProgress();
  progressLine.style.transform = 'scaleX(' + motion.scrollTarget + ')';
}
function setPaused(value) {
  paused = value;
  updateMotionLabel();
  if (paused) {
    stopMotion();
    settleStill();
  } else {
    onScroll();
    startMotion();
  }
}
motionButton.addEventListener('click', () => setPaused(!paused));
reducedMotion.addEventListener('change', () => setPaused(reducedMotion.matches));
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { onScroll(); render(); }, { passive: true });
window.addEventListener('pointermove', event => {
  if (!finePointer.matches) return;
  motion.tiltTarget = [(event.clientX / window.innerWidth - .5) * .34, (event.clientY / window.innerHeight - .5) * .2];
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { motion.tiltTarget = [0, 0]; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopMotion();
  else startMotion();
});
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (heroVisible) startMotion();
  }).observe(hero);
}
onScroll();
render();
startMotion();

interactions = initInteractions({ isPaused: () => paused, reducedMotion });

const dialog = document.querySelector('.case-dialog');
const caseContent = document.querySelector('.case-content');
const closeButton = document.querySelector('.close-dialog');
let dialogOpener = null;
function textElement(tag, content, className) {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
}
function openCase(button) {
  const project = caseStudies[button.dataset.case];
  if (!project) return;
  dialogOpener = button;
  caseContent.replaceChildren();
  caseContent.append(textElement('p', project.date, 'case-date'));
  const title = textElement('h2', project.title);
  title.id = 'case-title';
  caseContent.append(title, textElement('p', project.role, 'case-role'), textElement('p', project.summary, 'case-summary'));
  project.sections.forEach(part => {
    const section = document.createElement('section');
    section.append(textElement('h3', part.heading));
    if (part.body) section.append(textElement('p', part.body));
    if (part.bullets) {
      const list = document.createElement('ul');
      part.bullets.forEach(item => list.append(textElement('li', item)));
      section.append(list);
    }
    caseContent.append(section);
  });
  caseContent.append(textElement('p', project.outcome, 'case-outcome'), textElement('p', project.stack, 'case-stack'));
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('modal-open');
  closeButton.focus({ preventScroll: true });
}
document.querySelectorAll('.case-trigger').forEach(button => {
  button.setAttribute('aria-haspopup', 'dialog');
  button.addEventListener('click', event => { event.preventDefault(); openCase(button); });
});
closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  dialogOpener?.focus({ preventScroll: true });
});

const copyButton = document.querySelector('.copy-email');
const copyStatus = document.querySelector('.copy-status');
copyButton.hidden = false;
let copyReset;
copyButton.addEventListener('click', async () => {
  clearTimeout(copyReset);
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText('bommagani@arizona.edu');
    copyStatus.textContent = 'Email address copied.';
    copyButton.textContent = 'Copied ✓';
  } catch {
    copyStatus.textContent = 'bommagani@arizona.edu';
    const range = document.createRange();
    range.selectNodeContents(copyStatus);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyButton.textContent = 'Email selected. Copy with your keyboard.';
  }
  copyReset = setTimeout(() => { copyButton.textContent = 'Copy email address'; copyStatus.textContent = ''; }, 5000);
});
