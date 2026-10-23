/** The dock, the scrolling word band, the project board, and the About tabs. */
import { follow } from './motion-utils.mjs?v=5';

const dockFor = { home: 'home', work: 'work', 'public-projects': 'work', story: 'story', about: 'about', faq: 'about' };
const settleEasing = 'cubic-bezier(.16,1,.3,1)';

export function initSections({ isPaused = () => false, reducedMotion, countUp = () => {} } = {}) {
  const canMove = () => !isPaused() && !reducedMotion?.matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // The dock marks the section under the upper third of the screen.
  const dockLinks = new Map(Array.from(document.querySelectorAll('.dock [data-dock]')).map(link => [link.dataset.dock, link]));
  const sections = Object.keys(dockFor).map(id => document.getElementById(id)).filter(Boolean);
  function markCurrent() {
    const focus = window.innerHeight * .35;
    const section = sections.find(element => {
      const rect = element.getBoundingClientRect();
      return rect.top <= focus && rect.bottom > focus;
    });
    const current = section ? dockFor[section.id] : null;
    dockLinks.forEach((link, key) => {
      if (key === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  // The word band drifts sideways at about the speed of scrolling while it crosses the screen.
  const marquee = document.querySelector('.marquee');
  const track = marquee?.querySelector('.marquee-track');
  function drawMarquee() {
    if (!track) return;
    if (!canMove()) {
      track.style.transform = '';
      return;
    }
    const rect = marquee.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    const travel = Math.min(track.scrollWidth - marquee.clientWidth, window.innerWidth * 1.1);
    track.style.transform = `translate3d(${(-progress * travel).toFixed(1)}px, 0, 0)`;
  }

  let scrollFrame = 0;
  function onScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      markCurrent();
      drawMarquee();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  const board = initBoard(document.querySelector('.playground'), { canMove, finePointer });
  initTabs({ canMove, countUp });

  return {
    sync() {
      drawMarquee();
      board?.sync();
    },
  };
}

/** A board of project cards to drag around with a mouse. Touch and keyboard use the plain layout. */
function initBoard(board, { canMove, finePointer }) {
  const surface = board?.querySelector('.playground-surface');
  if (!surface || !finePointer.matches) return null;
  board.classList.add('is-draggable');
  const position = { x: 0, y: 0, vx: 0, vy: 0 };
  const drag = { id: null, active: false, moved: false, x: 0, y: 0, startX: 0, startY: 0, time: 0 };
  let frame = 0;
  let lastFrame = 0;

  const limits = () => ({ minX: Math.min(0, board.clientWidth - surface.offsetWidth), minY: Math.min(0, board.clientHeight - surface.offsetHeight) });
  function place(x, y) {
    const { minX, minY } = limits();
    position.x = Math.max(minX, Math.min(0, x));
    position.y = Math.max(minY, Math.min(0, y));
    surface.style.transform = `translate3d(${position.x.toFixed(1)}px, ${position.y.toFixed(1)}px, 0)`;
  }
  function stopGlide() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
  }
  // After a throw the board coasts, slowing with friction.
  function glide(now) {
    frame = 0;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 1 / 60;
    lastFrame = now;
    position.vx = follow(position.vx, 0, 4.5, delta);
    position.vy = follow(position.vy, 0, 4.5, delta);
    place(position.x + position.vx * delta, position.y + position.vy * delta);
    if (Math.hypot(position.vx, position.vy) > 8 && canMove()) frame = requestAnimationFrame(glide);
    else lastFrame = 0;
  }

  board.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    stopGlide();
    Object.assign(drag, { id: event.pointerId, active: false, moved: false, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, time: event.timeStamp });
    position.vx = position.vy = 0;
  });
  board.addEventListener('pointermove', event => {
    if (event.pointerId !== drag.id) return;
    // Capture only once the pointer really moves, so a plain click still reaches the link underneath.
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.active = drag.moved = true;
      board.setPointerCapture(event.pointerId);
      board.classList.add('is-dragging', 'has-moved');
    }
    const seconds = Math.max((event.timeStamp - drag.time) / 1000, 1 / 240);
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    position.vx = position.vx * .4 + (dx / seconds) * .6;
    position.vy = position.vy * .4 + (dy / seconds) * .6;
    place(position.x + dx, position.y + dy);
    Object.assign(drag, { x: event.clientX, y: event.clientY, time: event.timeStamp });
  });
  function endDrag(event) {
    if (event.pointerId !== drag.id) return;
    const wasActive = drag.active;
    drag.id = null;
    drag.active = false;
    board.classList.remove('is-dragging');
    if (!wasActive) return;
    // Holding still before letting go means no throw.
    if (event.timeStamp - drag.time > 90 || !canMove()) position.vx = position.vy = 0;
    else frame = requestAnimationFrame(glide);
  }
  ['pointerup', 'pointercancel'].forEach(type => board.addEventListener(type, endDrag));
  board.addEventListener('click', event => {
    if (!drag.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.moved = false;
  }, true);
  board.addEventListener('dragstart', event => event.preventDefault());
  // Keyboard focus brings its card into view.
  board.addEventListener('focusin', event => {
    const card = event.target.closest('.play-card, .play-note');
    // A mouse press focuses links too; moving the board then would pull the link out from under the click.
    if (!card || !event.target.matches(':focus-visible')) return;
    stopGlide();
    const margin = 24;
    const boardRect = board.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    let { x, y } = position;
    if (rect.left < boardRect.left + margin) x += boardRect.left + margin - rect.left;
    if (rect.right > boardRect.right - margin) x -= rect.right - (boardRect.right - margin);
    if (rect.top < boardRect.top + margin) y += boardRect.top + margin - rect.top;
    if (rect.bottom > boardRect.bottom - margin) y -= rect.bottom - (boardRect.bottom - margin);
    place(x, y);
  });
  // Focus can also scroll the clipped board natively; fold that into the board's own position.
  board.addEventListener('scroll', () => {
    if (!board.scrollLeft && !board.scrollTop) return;
    place(position.x - board.scrollLeft, position.y - board.scrollTop);
    board.scrollLeft = board.scrollTop = 0;
  });
  window.addEventListener('resize', () => place(position.x, position.y), { passive: true });
  place(0, 0);

  return {
    sync() {
      if (!canMove()) {
        stopGlide();
        position.vx = position.vy = 0;
      }
    },
  };
}

/** The About window: one tab per topic, with arrow-key navigation. */
function initTabs({ canMove, countUp }) {
  const tablist = document.querySelector('.browser-tabs');
  if (!tablist) return;
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const fileName = document.querySelector('.browser-file');
  const counted = new WeakSet();

  function select(index, { focus = false, animate = true } = {}) {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    const panel = panels[index];
    if (focus) tabs[index].focus();
    if (fileName) fileName.textContent = panel.dataset.file;
    if (animate && canMove() && panel.animate) {
      panel.animate([{ opacity: 0, transform: 'translate3d(0, 10px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: settleEasing });
    }
    panel.querySelectorAll('[data-count]').forEach(figure => {
      if (counted.has(figure)) return;
      counted.add(figure);
      countUp(figure);
    });
  }

  tabs.forEach((tab, index) => tab.addEventListener('click', () => select(index)));
  tablist.addEventListener('keydown', event => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select((next + tabs.length) % tabs.length, { focus: true });
  });
  // Links elsewhere on the page can open a tab, such as the timeline's Hack Arizona entry.
  document.querySelectorAll('[data-tab-link]').forEach(link => {
    link.addEventListener('click', () => {
      const index = tabs.findIndex(tab => tab.id === `tab-${link.dataset.tabLink}`);
      if (index >= 0) select(index);
    });
  });
  select(0, { animate: false });
}
