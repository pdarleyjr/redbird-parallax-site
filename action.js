// Initialize Rellax parallax
const rellaxElements = document.querySelectorAll('.rellax');
if (rellaxElements.length > 0) {
    const rellax = new Rellax('.rellax', {
        speed: -2,
        center: false,
        wrapper: null,
        round: true,
        vertical: true,
        horizontal: false
    });
}

// IntersectionObserver for reveal animations
const revealElements = document.querySelectorAll('.reveal');
if (revealElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
            }
        });
    }, { threshold: 0.15 });
    
    revealElements.forEach(el => observer.observe(el));
}

// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Video autoplay management
const videos = document.querySelectorAll('video');
if (videos.length > 0) {
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play();
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.25 });
    
    videos.forEach(video => videoObserver.observe(video));
}

// Handle mobile parallax disable
function checkScreenSize() {
    if (window.innerWidth <= 768) {
        // Disable parallax on mobile
        document.querySelectorAll('.rellax').forEach(el => {
            el.style.transform = 'none';
        });
    }
}

window.addEventListener('resize', checkScreenSize);
checkScreenSize();

// Respect reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.rellax').forEach(el => {
        el.style.transform = 'none';
    });
}
