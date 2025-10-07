document.addEventListener('DOMContentLoaded', () => {
  // Conditional Rellax initialization
  // Skip on small screens or if user prefers reduced motion
  const shouldUseParallax = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallScreen = window.innerWidth <= 768;
    return !prefersReducedMotion && !isSmallScreen;
  };

  if (shouldUseParallax() && typeof Rellax !== 'undefined') {
    try {
      const rellax = new Rellax('.rellax', {
        speed: -2,
        center: true,
        wrapper: null,
        round: true,
        vertical: true,
        horizontal: false
      });
      
      // Update on resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (!shouldUseParallax()) {
            rellax.destroy();
          }
        }, 250);
      });
    } catch (e) {
      console.log('Rellax initialization skipped:', e);
    }
  }

  // GSAP ScrollTrigger animations
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    
    // Hero content fade in
    gsap.from('.hero-content', {
      y: 40,
      opacity: 0,
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top 80%',
        once: true
      }
    });
    
    // Steps animation
    gsap.from('.steps-grid .card', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.steps-grid',
        start: 'top 80%',
        once: true
      }
    });
    
    // Night section animation
    gsap.from('.night .content > *', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.night',
        start: 'top 70%',
        once: true
      }
    });
    
    // Map card animation
    gsap.from('.map-card', {
      scale: 0.95,
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.map-card',
        start: 'top 80%',
        once: true
      }
    });
  }

  // IntersectionObserver for video pause/play (battery efficient)
  const videos = document.querySelectorAll('video.inline-vid');
  
  if ('IntersectionObserver' in window && videos.length > 0) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          // Play when visible
          video.play().catch(err => {
            console.log('Video autoplay prevented:', err);
          });
        } else {
          // Pause when not visible
          video.pause();
        }
      });
    }, {
      threshold: 0.25,
      rootMargin: '0px'
    });
    
    videos.forEach(video => {
      videoObserver.observe(video);
      
      // Ensure video has required attributes for mobile
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.muted = true;
    });
  }
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Add loading state management
  window.addEventListener('load', () => {
    document.body.classList.add('loaded');
  });
});
