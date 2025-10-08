// Select elements for parallax
let text = document.getElementById('text');
let explore = document.getElementById('explore');

// Parallax scroll handler
window.addEventListener('scroll', function() {
    let value = window.scrollY;

    // Move text slightly
    if (text) {
        text.style.marginTop = value * 0.5 + 'px';
    }

    // Move explore button
    if (explore) {
        explore.style.marginTop = value * 1.5 + 'px';
    }
});

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

// Handle mobile adjustments
if (screen.width < 400) {
    // Mobile adjustments if needed
    console.log('Mobile view detected');
}

// Respect reduced motion
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Disable parallax animations
    window.removeEventListener('scroll', window);
}
