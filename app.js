import { sectionProgress, smoothRange } from './motion-utils.mjs';
import { createSculpture } from './sculpture.js';
import { caseStudies } from './cases.js';
import { initInteractions } from './interactions.js';

const hero = document.querySelector('.hero-scroll');
const canvas = document.querySelector('.sculpture');
const sculpture = createSculpture(canvas);
const progressLine = document.querySelector('.hero-progress span');
const motionButton = document.querySelector('.motion-toggle');
const motionLabel = document.querySelector('.motion-label');
const motionIcon = document.querySelector('.motion-icon');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let currentProgress = 0;
let targetProgress = 0;
let motionFrame = 0;
let interactions = null;

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
  const top = hero.getBoundingClientRect().top + window.scrollY;
  const distance = Math.max(hero.offsetHeight - Math.min(window.innerHeight, 1000) + 100, 200);
  return sectionProgress(window.scrollY, top, top + distance);
}
function animateToScroll() {
  motionFrame = 0;
  if (paused || document.hidden) return;
  const difference = targetProgress - currentProgress;
  currentProgress = Math.abs(difference) < .0006 ? targetProgress : currentProgress + difference * .13;
  sculpture?.draw(smoothRange(currentProgress, 0, 1));
  if (Math.abs(targetProgress - currentProgress) > .0006) motionFrame = requestAnimationFrame(animateToScroll);
}
function onScroll() {
  targetProgress = measureProgress();
  progressLine.style.transform = 'scaleX(' + targetProgress + ')';
  if (!paused && !motionFrame && sculpture) motionFrame = requestAnimationFrame(animateToScroll);
}
motionButton.addEventListener('click', () => {
  paused = !paused;
  updateMotionLabel();
  if (paused && motionFrame) { cancelAnimationFrame(motionFrame); motionFrame = 0; }
  else onScroll();
});
reducedMotion.addEventListener('change', () => {
  paused = reducedMotion.matches;
  updateMotionLabel();
  if (paused && motionFrame) { cancelAnimationFrame(motionFrame); motionFrame = 0; }
  onScroll();
});
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { sculpture?.draw(smoothRange(currentProgress, 0, 1)); onScroll(); }, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && motionFrame) { cancelAnimationFrame(motionFrame); motionFrame = 0; }
  else onScroll();
});
onScroll();

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
