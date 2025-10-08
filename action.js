// Initialize Rellax parallax
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Rellax for parallax elements
    if (typeof Rellax !== 'undefined') {
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
    if (revealElements.length > 0 && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                }
            });
        }, { threshold: 0.1 });
        
        revealElements.forEach(el => observer.observe(el));
    }

    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Handle mobile parallax disable
function checkScreenSize() {
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.rellax').forEach(el => {
            el.style.transform = 'none';
        });
    }
}

window.addEventListener('resize', checkScreenSize);
checkScreenSize();

// Respect reduced motion
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.rellax').forEach(el => {
        el.style.transform = 'none';
    });
}
