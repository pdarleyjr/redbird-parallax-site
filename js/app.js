document.addEventListener('DOMContentLoaded', () => {
  // Smooth scrolling
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    requestAnimationFrame(function raf(t){ lenis.raf(t); requestAnimationFrame(raf); });
  }

  // Choose lighter hero video on small screens
  const hero = document.querySelector('.hero video.bg source');
  if (hero && window.innerWidth <= 768) {
    hero.setAttribute('src','assets/video/hero_720.mp4');
    hero.parentElement.load();
  }

  // Parallax (pin hero and flyer content only; no fixed backgrounds)
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.panel[data-pin]').forEach(sec => {
      const inner = sec.querySelector('.content');
      if (!inner) return;
      gsap.to(inner, {
        yPercent: -12, ease:'none',
        scrollTrigger: { trigger: sec, start:'top top', end:'bottom top', scrub:0.3, pin:true }
      });
    });
  }

  // Pause off-screen videos (battery/data saver)
  const vids = Array.from(document.querySelectorAll('video'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? e.target.play().catch(()=>{}) : e.target.pause());
    }, { threshold: 0.2 });
    vids.forEach(v => io.observe(v));
  }
});