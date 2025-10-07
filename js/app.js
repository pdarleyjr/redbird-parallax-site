document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll (Lenis) + GSAP sync
  if (window.Lenis) {
    const lenis = new Lenis({ 
      lerp: 0.1, 
      smoothWheel: true, 
      smoothTouch: false 
    });
    
    function raf(time) { 
      lenis.raf(time); 
      requestAnimationFrame(raf); 
    }
    requestAnimationFrame(raf);
    
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', () => ScrollTrigger.update());
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0); // official integration pattern
    }
  }

  // Parallax (only if elements exist)
  if (window.Rellax && document.querySelector('.rellax')) {
    new Rellax('.rellax', { 
      center: false, 
      wrapper: null, 
      vertical: true, 
      horizontal: false 
    });
  }

  // ScrollTrigger effects (guarded)
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    
    // Hero content animation
    const hero = document.querySelector('.hero .hero-content');
    if (hero) {
      gsap.from(hero, {
        y: 40, 
        opacity: 0, 
        duration: 1, 
        ease: 'power2',
        scrollTrigger: { 
          trigger: '.hero', 
          start: 'top 70%' 
        }
      });
    }
    
    // Pinned sections with subtle parallax
    document.querySelectorAll('[data-pin]').forEach((sec) => {
      const parallaxEl = sec.querySelector('[data-parallax]');
      if (parallaxEl) {
        gsap.to(parallaxEl, {
          yPercent: -15,
          ease: 'none',
          scrollTrigger: { 
            trigger: sec, 
            start: 'top top', 
            end: 'bottom top', 
            scrub: 0.3, 
            pin: true 
          }
        });
      }
    });
    
    // Fade in content sections
    document.querySelectorAll('.content').forEach((content) => {
      gsap.from(content, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        scrollTrigger: {
          trigger: content,
          start: 'top 80%',
          once: true
        }
      });
    });
    
    // Animate feature cards
    const features = document.querySelectorAll('.feature, .detail, .step, .faq-item');
    if (features.length) {
      gsap.from(features, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        scrollTrigger: {
          trigger: features[0],
          start: 'top 85%',
          once: true
        }
      });
    }
  }
  
  // Handle smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target && window.lenis) {
        window.lenis.scrollTo(target);
      } else if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});