// Modern Parallax Site App - Mobile Optimized
document.addEventListener('DOMContentLoaded', () => {
  // === Motion Preference Check ===
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // === IntersectionObserver for Reveal Animations ===
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      for (const e of entries) if (e.isIntersecting) { 
        e.target.classList.add('visible'); 
        obs.unobserve(e.target); 
      }
    }, { threshold: 0.35 });

    // Target specific elements only - not all h2s/cards
    document.querySelectorAll('h2.section-title, #map .map-frame, #about .media-card, .copy.reveal')
      .forEach(el => { 
        el.classList.add('reveal'); 
        io.observe(el); 
      });
  }
  
  // === Lenis Smooth Scroll (Progressive Enhancement) ===
  let lenis = null;
  if (!prefersReducedMotion && window.Lenis) {
    try {
      lenis = new Lenis({
        lerp: 0.12,
        smoothWheel: true,
        smoothTouch: false, // Disable on touch for better performance
        wheelMultiplier: 1,
        touchMultiplier: 2
      });
      
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
      
      // Update ScrollTrigger on Lenis scroll
      if (window.ScrollTrigger) {
        lenis.on('scroll', ScrollTrigger.update);
        
        ScrollTrigger.scrollerProxy(document.body, {
          scrollTop(value) {
            return arguments.length ? lenis.scrollTo(value, { offset: 0, immediate: true }) : lenis.scroll;
          },
          getBoundingClientRect() {
            return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
          }
        });
      }
    } catch (e) {
      console.log('Lenis initialization failed, falling back to native scroll');
    }
  }
  
  // === GSAP ScrollTrigger Setup (Progressive Enhancement) ===
  if (!prefersReducedMotion && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    
    // Responsive animations with matchMedia
    const mm = gsap.matchMedia();
    
    // Desktop animations (768px+)
    mm.add("(min-width: 768px)", () => {
      // Parallax effect for hero background
      const heroSection = document.querySelector('.hero');
      if (heroSection) {
        // Create a parallax layer div
        const parallaxLayer = document.createElement('div');
        parallaxLayer.className = 'parallax-layer';
        parallaxLayer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 120%;
          background: inherit;
          background-attachment: scroll;
          will-change: transform;
          z-index: -1;
        `;
        heroSection.style.position = 'relative';
        heroSection.style.overflow = 'hidden';
        heroSection.insertBefore(parallaxLayer, heroSection.firstChild);
        
        gsap.to(parallaxLayer, {
          yPercent: -20,
          ease: "none",
          scrollTrigger: {
            trigger: heroSection,
            start: "top top",
            end: "bottom top",
            scrub: 0.5
          }
        });
      }
      
      // Staggered card animations
      gsap.from("#how-it-works .card", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".steps-grid",
          start: "top 80%",
          toggleActions: "play none none none"
        }
      });
      
      // Section headers animation
      gsap.utils.toArray("h2").forEach(header => {
        gsap.from(header, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: header,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        });
      });
      
      return () => {
        // Cleanup function for media query change
        ScrollTrigger.getAll().forEach(st => st.kill());
      };
    });
    
    // Mobile animations (simplified)
    mm.add("(max-width: 767px)", () => {
      // Simple fade-in for mobile
      gsap.from("#how-it-works .card", {
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".steps-grid",
          start: "top 90%",
          toggleActions: "play none none none"
        }
      });
    });
  }
  
  // === Native Video Lazy Loading ===
  const videos = document.querySelectorAll('video[data-src]');
  if (videos.length > 0) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          const source = video.querySelector('source');
          if (source && video.dataset.src) {
            source.src = video.dataset.src;
            video.load();
            video.play().catch(e => console.log('Video autoplay blocked:', e));
            delete video.dataset.src;
            videoObserver.unobserve(video);
          }
        }
      });
    }, { threshold: 0.25 });
    
    videos.forEach(video => videoObserver.observe(video));
  }
  
  // === Fix existing video lazy loading ===
  const existingVideo = document.querySelector('video');
  if (existingVideo && !existingVideo.dataset.src) {
    existingVideo.setAttribute('autoplay', '');
  }
  
  // === Smooth Anchor Scrolling ===
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const target = document.querySelector(targetId);
      
      if (target) {
        const offset = 70; // Account for fixed nav
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
        
        if (lenis) {
          lenis.scrollTo(targetPosition);
        } else {
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });
  
  // === CSS Scroll-Driven Animations Fallback ===
  if (!CSS.supports('animation-timeline', 'scroll()')) {
    console.log('Scroll-driven animations not supported, using fallback');
    // Add basic scroll animations via IntersectionObserver
    const scrollElements = document.querySelectorAll('.section-reveal');
    if (scrollElements.length > 0 && !prefersReducedMotion) {
      const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });
      
      scrollElements.forEach(el => {
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        scrollObserver.observe(el);
      });
    }
  }
  
  // === View Transitions API (Progressive Enhancement) ===
  if ('startViewTransition' in document) {
    // Add view transitions for navigation
    document.querySelectorAll('.top-nav a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        const target = document.querySelector(targetId);
        
        if (target && document.startViewTransition) {
          e.preventDefault();
          document.startViewTransition(() => {
            target.scrollIntoView({ behavior: 'instant', block: 'start' });
          });
        }
      });
    });
  }
  
  // === Performance Monitoring ===
  if ('PerformanceObserver' in window) {
    try {
      const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.renderTime || entry.loadTime);
          }
        }
      });
      perfObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // PerformanceObserver not supported
    }
  }
  
  // === Touch Device Detection ===
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouchDevice) {
    document.body.classList.add('touch-device');
  }
  
  // === Dynamic Viewport Height Fix ===
  function setDynamicViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  setDynamicViewportHeight();
  window.addEventListener('resize', setDynamicViewportHeight);
  window.addEventListener('orientationchange', setDynamicViewportHeight);
  
  // === Initialize Lottie Animations (if available) ===
  if (window.lottie && !prefersReducedMotion) {
    const lottieContainers = document.querySelectorAll('[data-lottie]');
    lottieContainers.forEach(container => {
      const animationPath = container.dataset.lottie;
      if (animationPath) {
        lottie.loadAnimation({
          container: container,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: animationPath
        });
      }
    });
  }
  
  console.log('Mobile optimizations and modern features loaded successfully');
});

