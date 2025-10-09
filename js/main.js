// GSAP Animations with proper ScrollTrigger
document.addEventListener("DOMContentLoaded", function() {
    // Register ScrollTrigger plugin
    if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        
        // Animate hero content on load
        gsap.from(".hero-content", {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: "power2.out"
        });
        
        // Animate cards on scroll with stagger
        gsap.from(".card", {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".steps-grid",
                start: "top 80%",
                toggleActions: "play none none none"
            }
        });
        
        // Animate section headers
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
        
        // Animate media card
        gsap.from(".media-card", {
            scale: 0.95,
            opacity: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".media-card",
                start: "top 75%",
                toggleActions: "play none none none"
            }
        });
        
        // Animate map frame
        gsap.from(".map-frame", {
            y: 40,
            opacity: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".map-frame",
                start: "top 80%",
                toggleActions: "play none none none"
            }
        });
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll("a[href^=\"#\"]").forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute("href"));
            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });
    
    // Lazy load video
    const video = document.querySelector("video");
    if (video) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    video.play().catch(e => console.log("Video play failed:", e));
                }
            });
        }, { threshold: 0.5 });
        observer.observe(video);
    }
});
