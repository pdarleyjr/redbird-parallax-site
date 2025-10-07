document.addEventListener('DOMContentLoaded', () => {
  try { new Rellax('.rellax'); } catch(e) {}
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from('.hero .hero-content', {
      y:40, opacity:0, duration:1,
      scrollTrigger:{trigger:'.hero', start:'top 70%'}
    });
  }
});