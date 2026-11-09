const ACCENTS = [
  'rgba(226, 173, 111, 0.78)',
  'rgba(255, 226, 177, 0.78)',
  'rgba(189, 124, 69, 0.78)',
  'rgba(244, 208, 157, 0.78)',
  'rgba(209, 146, 86, 0.78)',
];

const timers = new WeakMap();
let accentIndex = 0;

export function initInteractiveEffects() {
  if (typeof document === 'undefined') return;

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;

    const target = event.target.closest(
      '.image-art-frame, .runway-card, img:not([data-no-color-pulse="true"]), button:not([data-no-color-pulse])'
    );
    if (!target) return;

    const previousTimer = timers.get(target);
    if (previousTimer) window.clearTimeout(previousTimer);

    target.classList.remove('visual-click-pulse');
    target.style.setProperty('--click-color', ACCENTS[accentIndex % ACCENTS.length]);
    accentIndex += 1;
    window.requestAnimationFrame(() => target.classList.add('visual-click-pulse'));

    timers.set(target, window.setTimeout(() => {
      target.classList.remove('visual-click-pulse');
      target.style.removeProperty('--click-color');
      timers.delete(target);
    }, 1200));
  });
}
