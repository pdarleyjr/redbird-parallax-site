document.addEventListener('DOMContentLoaded', () => {
  // Smooth scrolling
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    requestAnimationFrame(function raf(t){ lenis.raf(t); requestAnimationFrame(raf); });
  }

  // Parallax with Rellax
  try { 
    new Rellax('.rellax'); 
  } catch(e) {}

  // GSAP animations
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    
    // Hero content animation
    gsap.from('.hero .hero-content', {
      y: 40, opacity: 0, duration: 1,
      scrollTrigger: { trigger: '.hero', start: 'top 70%' }
    });

    // Pin panels that have data-pin attribute
    document.querySelectorAll('.panel[data-pin]').forEach(sec => {
      const inner = sec.querySelector('.content');
      if (!inner) return;
      gsap.to(inner, {
        yPercent: -12, ease:'none',
        scrollTrigger: { trigger: sec, start:'top top', end:'bottom top', scrub:0.3, pin:true }
      });
    });
  }

  // Pause off-screen videos (battery/data saver) - Enhanced
  const vids = Array.from(document.querySelectorAll('video'));
  if ('IntersectionObserver' in window && vids.length > 0) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { 
          e.target.play().catch(() => {}); 
        } else { 
          e.target.pause(); 
        }
      });
    }, { threshold: 0.25 });
    
    vids.forEach(v => io.observe(v));
  }

  // Specifically handle inline video
  const inlineVid = document.querySelector('.inline-vid');
  if ('IntersectionObserver' in window && inlineVid) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { 
          inlineVid.play().catch(() => {}); 
        } else { 
          inlineVid.pause(); 
        }
      });
    }, { threshold: 0.25 });
    io.observe(inlineVid);
  }
});