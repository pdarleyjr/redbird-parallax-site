// main.js
document.addEventListener("DOMContentLoaded", () => {
  // 1) Register plugin and guard for missing selectors
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger); // required

    const heroContent = document.querySelector(".hero .hero-content");
    if (heroContent) {
      gsap.from(heroContent, {
        y: 40, opacity: 0, duration: 1.0, ease: "power2.out",
        scrollTrigger: { trigger: ".hero", start: "top 80%", once: true }
      });
    }

    const cards = gsap.utils.toArray(".steps-grid .card");
    if (cards.length) {
      gsap.from(cards, {
        y: 30, opacity: 0, duration: 0.6, stagger: 0.15, ease: "power2.out",
        scrollTrigger: { trigger: ".steps-grid", start: "top 85%", once: true }
      });
    }

    const mapCard = document.querySelector(".map-frame");
    if (mapCard) {
      gsap.from(mapCard, {
        scale: 0.96, opacity: 0, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: ".map-frame", start: "top 90%", once: true }
      });
    }
  }

  // 2) Initialize Rellax only if you actually have parallax elements
  if (window.Rellax && document.querySelector(".rellax")) {
    new Rellax(".rellax", { center: true, vertical: true, horizontal: false });
  }

  // 3) Reveal animations with IntersectionObserver
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    }, { threshold: 0.1 });
    
    reveals.forEach(el => revealObserver.observe(el));
  }

  // 4) Autoplay video when visible
  const vids = document.querySelectorAll("video.media");
  if ("IntersectionObserver" in window && vids.length) {
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
});
