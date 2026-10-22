/** Small, finite interactions that leave the page readable without JavaScript. */
export function initInteractions({ isPaused = () => false, reducedMotion } = {}) {
  let destroyed = false;
  const animations = new Map();
  const cleanups = [];
  const canMove = () => !destroyed && !isPaused() && !reducedMotion?.matches;

  function stopAnimation(element) {
    const animation = animations.get(element);
    if (!animation) return;
    animation.cancel();
    animations.delete(element);
  }

  function move(element, transform, animate = false, duration = 460) {
    if (!element) return;
    const previous = getComputedStyle(element).transform;
    stopAnimation(element);
    // The final state is always in the document, including after cancellation.
    element.style.transform = transform;
    if (!animate || !canMove() || !element.animate) return;
    const animation = element.animate(
      [{ transform: previous === 'none' ? transform : previous }, { transform }],
      { duration, easing: 'cubic-bezier(.22,.7,.2,1)' },
    );
    animations.set(element, animation);
    const release = () => {
      if (animations.get(element) === animation) animations.delete(element);
    };
    animation.finished.then(release, release);
  }

  const workflows = Array.from(document.querySelectorAll('.workflow')).map(element => {
    const steps = Array.from(element.querySelectorAll('button.flow-step[data-step-description]'));
    const state = {
      element,
      steps,
      description: element.querySelector('.workflow-description'),
      line: element.querySelector('.workflow-line'),
      packet: element.querySelector('.flow-packet'),
      fill: element.querySelector('.flow-fill'),
      replay: element.querySelector('button.workflow-replay'),
      active: Math.max(0, steps.findIndex(step => step.getAttribute('aria-pressed') === 'true' || step.classList.contains('is-active'))),
      timer: null,
      seen: false,
    };
    if (!steps.length) return state;
    element.classList.add('is-enhanced');
    if (state.fill) state.fill.style.transformOrigin = 'left center';
    steps.forEach((step, index) => {
      step.disabled = false;
      const onClick = () => {
        cancelSequence(state);
        state.seen = true;
        selectStep(state, index, { announce: true, animate: canMove() });
      };
      step.addEventListener('click', onClick);
      cleanups.push(() => step.removeEventListener('click', onClick));
    });
    if (state.replay) {
      const onReplay = () => {
        state.seen = true;
        playSequence(state);
      };
      state.replay.addEventListener('click', onReplay);
      cleanups.push(() => state.replay.removeEventListener('click', onReplay));
    }
    selectStep(state, state.active);
    return state;
  });

  function drawFlow(state, animate = false) {
    const progress = state.steps.length > 1 ? state.active / (state.steps.length - 1) : 1;
    const travel = Math.max(0, (state.line?.clientWidth || 0) - (state.packet?.offsetWidth || 0));
    state.element.style.setProperty('--flow-progress', String(progress));
    move(state.packet, `translate3d(${travel * progress}px, 0, 0)`, animate);
    move(state.fill, `scaleX(${progress})`, animate);
  }

  function selectStep(state, index, { announce = false, animate = false, describe = false } = {}) {
    if (!state.steps.length) return;
    state.active = Math.min(Math.max(index, 0), state.steps.length - 1);
    state.steps.forEach((step, position) => {
      const active = position === state.active;
      step.classList.toggle('is-active', active);
      step.setAttribute('aria-pressed', String(active));
    });
    if ((announce || describe) && state.description) {
      if (announce) state.description.setAttribute('aria-live', 'polite');
      state.description.textContent = state.steps[state.active].dataset.stepDescription;
    }
    drawFlow(state, animate);
  }

  function cancelSequence(state) {
    if (state.timer !== null) clearTimeout(state.timer);
    state.timer = null;
    state.element.classList.remove('is-playing');
    state.description?.setAttribute('aria-live', 'polite');
    stopAnimation(state.packet);
    stopAnimation(state.fill);
  }

  function playSequence(state) {
    cancelSequence(state);
    if (!state.steps.length) return;
    if (!canMove()) {
      selectStep(state, state.steps.length - 1, { describe: true });
      return;
    }
    state.element.classList.add('is-playing');
    state.description?.setAttribute('aria-live', 'off');
    selectStep(state, 0, { describe: true });
    let next = 1;
    const advance = () => {
      state.timer = null;
      if (!canMove()) {
        cancelSequence(state);
        drawFlow(state);
        return;
      }
      if (next >= state.steps.length) {
        state.element.classList.remove('is-playing');
        state.description?.setAttribute('aria-live', 'polite');
        return;
      }
      // Keep visible explanations in sync without announcing every automatic step.
      selectStep(state, next++, { animate: true, describe: true });
      state.timer = setTimeout(advance, 650);
    };
    state.timer = setTimeout(advance, 650);
  }

  let workflowObserver;
  if ('IntersectionObserver' in window) {
    workflowObserver = new IntersectionObserver(entries => {
      if (destroyed) return;
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.intersectionRatio < .1) return;
        const state = workflows.find(item => item.element === entry.target);
        if (!state || state.seen) return;
        state.seen = true;
        workflowObserver.unobserve(state.element);
        if (canMove()) playSequence(state);
        else drawFlow(state);
      });
    }, { threshold: .1 });
    workflows.filter(state => state.steps.length).forEach(state => workflowObserver.observe(state.element));
  }

  const revealElements = Array.from(document.querySelectorAll('[data-reveal]'));
  const revealed = new WeakSet();
  function reveal(element) {
    if (destroyed || revealed.has(element)) return;
    revealed.add(element);
    element.classList.add('is-revealed');
    if (!canMove() || !element.animate) return;
    const siblings = Array.from(element.parentElement?.children || []).filter(child => child.hasAttribute('data-reveal'));
    const delay = Math.min(Math.max(siblings.indexOf(element), 0) * 60, 180);
    const animation = element.animate(
      [{ transform: 'translate3d(0, 16px, 0)' }, { transform: 'translate3d(0, 0, 0)' }],
      { duration: 450, delay, easing: 'cubic-bezier(.22,.7,.2,1)' },
    );
    animations.set(element, animation);
    const release = () => {
      if (animations.get(element) === animation) animations.delete(element);
    };
    animation.finished.then(release, release);
  }
  let revealObserver;
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      if (destroyed) return;
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.intersectionRatio < .1) return;
        revealObserver.unobserve(entry.target);
        reveal(entry.target);
      });
    }, { threshold: .1 });
    revealElements.forEach(element => revealObserver.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add('is-revealed'));
  }

  const timelineEntries = Array.from(document.querySelectorAll('.timeline-entry[data-chapter]'));
  const timelineTrack = document.querySelector('.timeline-track');
  function updateTimeline() {
    if (destroyed || !timelineEntries.length) return;
    const viewportHeight = window.innerHeight;
    const focus = viewportHeight * .48;
    const positions = timelineEntries.map((element, index) => ({ element, index, rect: element.getBoundingClientRect() }));
    const visible = positions.filter(item => item.rect.bottom > 0 && item.rect.top < viewportHeight);
    const candidates = visible.length ? visible : positions;
    const nearest = candidates.reduce((best, item) => {
      const distance = Math.abs(item.rect.top + item.rect.height / 2 - focus);
      return !best || distance < best.distance ? { ...item, distance } : best;
    }, null);
    const horizontal = window.matchMedia('(min-width: 768px)').matches;
    const trackRect = timelineTrack?.getBoundingClientRect();
    const progress = horizontal && trackRect
      ? Math.max(0, Math.min(1, (viewportHeight * .85 - trackRect.top) / (trackRect.height * .6 + viewportHeight * .35)))
      : (timelineEntries.length > 1 ? nearest.index / (timelineEntries.length - 1) : 1);
    const activeIndex = horizontal ? Math.min(timelineEntries.length - 1, Math.floor(progress * timelineEntries.length)) : nearest.index;
    timelineEntries.forEach((element, index) => element.classList.toggle('is-current', index === activeIndex));
    timelineTrack?.style.setProperty('--journey-progress', String(progress));
  }
  let timelineObserver;
  if ('IntersectionObserver' in window && timelineEntries.length) {
    timelineObserver = new IntersectionObserver(updateTimeline, {
      rootMargin: '-12% 0px -28% 0px',
      threshold: [0, .1, .25, .5, .75, 1],
    });
    timelineEntries.forEach(element => timelineObserver.observe(element));
  }
  updateTimeline();

  let resizeObserver;
  if ('ResizeObserver' in window) {
    const lineStates = new Map(workflows.filter(state => state.line).map(state => [state.line, state]));
    resizeObserver = new ResizeObserver(entries => {
      if (destroyed) return;
      entries.forEach(entry => {
        const state = lineStates.get(entry.target);
        if (state) drawFlow(state);
      });
      updateTimeline();
    });
    lineStates.forEach((state, line) => resizeObserver.observe(line));
    if (timelineTrack) resizeObserver.observe(timelineTrack);
  } else {
    const onResize = () => {
      workflows.forEach(state => drawFlow(state));
      updateTimeline();
    };
    window.addEventListener('resize', onResize, { passive: true });
    cleanups.push(() => window.removeEventListener('resize', onResize));
  }

  function syncMotion() {
    if (destroyed) return;
    const paused = !canMove();
    workflows.forEach(state => {
      state.element.classList.toggle('is-motion-paused', paused);
      if (paused) {
        cancelSequence(state);
        drawFlow(state);
      }
    });
    if (paused) Array.from(animations.keys()).forEach(stopAnimation);
  }
  if (reducedMotion?.addEventListener) {
    reducedMotion.addEventListener('change', syncMotion);
    cleanups.push(() => reducedMotion.removeEventListener('change', syncMotion));
  }
  syncMotion();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    workflows.forEach(state => {
      cancelSequence(state);
      state.element.classList.remove('is-enhanced', 'is-motion-paused');
    });
    Array.from(animations.keys()).forEach(stopAnimation);
    workflowObserver?.disconnect();
    revealObserver?.disconnect();
    timelineObserver?.disconnect();
    resizeObserver?.disconnect();
    cleanups.forEach(cleanup => cleanup());
  }

  return { syncMotion, destroy };
}
