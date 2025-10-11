// io-reveals.js - Intersection Observer based reveals
(() => {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const roots = document.querySelectorAll('[data-io-reveal]');
  if (!roots.length) return;

  if (reduced || !('IntersectionObserver' in window)) {
    roots.forEach(r => r.classList.add('io-in'));
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('io-in');
        obs.unobserve(e.target);
      }
    }
  }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  roots.forEach(r => io.observe(r));
})();
