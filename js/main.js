// main.js
document.addEventListener('DOMContentLoaded', () => {
  // Only register plugins if GSAP exists
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // 1) Rellax guard
  const parallaxEls = document.querySelectorAll('.rellax');
  if (parallaxEls.length && window.Rellax) new Rellax('.rellax', { speed: -3 });

  // 2) Section animations (only if they exist)
  const about = document.querySelector('.section--about');
  if (about && window.gsap) {
    gsap.from(about.querySelectorAll('.content > *'), {
      opacity: 0, y: 30, stagger: 0.08, duration: 0.6,
      scrollTrigger: { trigger: about, start: 'top 70%' }
    });
  }

  const map = document.querySelector('.section--map');
  if (map && window.gsap) {
    gsap.from(map.querySelectorAll('.content > *'), {
      opacity: 0, y: 30, stagger: 0.08, duration: 0.6,
      scrollTrigger: { trigger: map, start: 'top 70%' }
    });
  }

  // Autoplay video when visible
  const vids = document.querySelectorAll('video.media');
  if ('IntersectionObserver' in window && vids.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      });
    }, { threshold: 0.25 });
    vids.forEach(v => io.observe(v));
  }
});
