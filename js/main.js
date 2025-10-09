// main.js (load with <script type="module" defer src="js/main.js"></script>)
import Rellax from "../vendor/rellax.min.js";
import gsap from "../vendor/gsap.min.js";
import ScrollTrigger from "../vendor/ScrollTrigger.min.js";
gsap.registerPlugin(ScrollTrigger);

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
  // Rellax only if we actually have targets
  const parallaxEls = document.querySelectorAll(".rellax");
  if (parallaxEls.length) new Rellax(".rellax", { center:false });

  // Reveal-on-view (no heavy scroll handlers)
  const io = new IntersectionObserver((entries) =>
    entries.forEach(e => e.isIntersecting && e.target.classList.add("is-in")),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  // Section parallax with GSAP (guard selectors!)
  const aboutBg = document.querySelector(".about-bg-img");
  if (aboutBg) {
    gsap.to(aboutBg, {
      yPercent: -12, ease: "none",
      scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true }
    });
  }

  // Autoplay video when visible (mobile friendly)
  document.querySelectorAll("video.inline-vid").forEach(v => {
    // make sure iOS allows it
    v.muted = true; v.playsInline = true;
  });
  const vio = new IntersectionObserver((entries) => {
    entries.forEach(({isIntersecting, target}) => {
      if (isIntersecting) { target.play().catch(()=>{}); }
      else { target.pause(); }
    });
  }, { threshold: 0.25 });
  document.querySelectorAll("video.inline-vid").forEach(v => vio.observe(v));

  // After images load, refresh ScrollTrigger so positions are correct
  window.addEventListener("load", () => ScrollTrigger.refresh());
});
