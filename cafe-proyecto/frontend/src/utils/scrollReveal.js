// Anima los elementos al entrar en pantalla. Funciona sin conexión (solo usa el navegador).
const SELECTOR = [
  '.section-title',
  '.section-subtitle',
  '.glass-dark',
  '.card-cafe:not(.image-art-card)',
  'main section',
  'main article',
  'main .menu-card-stagger',
  'main .runway-card',
].join(', ');

export function initScrollReveal() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('js-anim');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

  const watch = (root) => {
    if (root.nodeType !== 1) return;
    const nodes = root.matches?.(SELECTOR) ? [root] : [];
    nodes.push(...root.querySelectorAll(SELECTOR));
    nodes.forEach((node, index) => {
      if (node.dataset.reveal) return;
      node.dataset.reveal = '1';
      node.classList.add('anim-reveal');
      node.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 70}ms`);
      observer.observe(node);
    });
  };

  watch(document.body);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach(watch));
  }).observe(document.body, { childList: true, subtree: true });
}
