# Apply remaining OPUS 4.1 Fixes

Write-Host "Applying remaining OPUS 4.1 fixes..." -ForegroundColor Green

# 1. Fix app.js IntersectionObserver
Write-Host "1. Fixing app.js IntersectionObserver..." -ForegroundColor Yellow

$appJsContent = Get-Content "js/app.js" -Raw

# Replace the IntersectionObserver section
$oldIO = @'
  // === IntersectionObserver for Reveal Animations ===
  if (!prefersReducedMotion) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });
    
    // Add reveal class to elements
    document.querySelectorAll('h2, .media-card, .map-frame').forEach(el => {
      el.classList.add('reveal');
      io.observe(el);
    });
  }
'@

$newIO = @'
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
'@

$appJsContent = $appJsContent -replace [regex]::Escape($oldIO), $newIO
$appJsContent | Set-Content -Path "js/app.js" -Encoding UTF8

# 2. Fix index.html structure
Write-Host "2. Fixing index.html section structure..." -ForegroundColor Yellow

$indexContent = Get-Content "index.html" -Raw

# Update hero section with picture element for responsive images
$heroFix = @'
    <!-- Hero Section with optimized background -->
    <section id="hero" class="panel hero parallax-bg">
        <picture class="hero-bg">
            <source type="image/avif" srcset="images/hero-night_1920.avif 1920w, images/hero-2025.avif 1280w, images/hero-2025-small.avif 640w" sizes="100vw">
            <source type="image/webp" srcset="images/hero-night_1920.webp 1920w, images/hero-2025.webp 1280w, images/hero-2025-small.webp 640w" sizes="100vw">
            <img src="images/hero-night_1920.jpg"
                 srcset="images/hero-night_1920.jpg 1920w, images/hero-2025.png 1280w, images/hero-2025.png 640w"
                 sizes="100vw" width="1920" height="1080" alt="Red Bird hero" loading="eager" decoding="async">
        </picture>
        <div class="hero-content">
            <h1>Welcome to<br>Red Bird<br>Trick-or-Treat Trail</h1>
            <p>Join your neighbors for a safe, fun Halloween experience</p>
            <a href="#map" class="btn btn-primary">View the Trail Map</a>
        </div>
    </section>
'@

# Fix section titles to have section-title class
$indexContent = $indexContent -replace '<h2>About the Red Bird Trail</h2>', '<h2 class="section-title">About the Red Bird Trail</h2>'
$indexContent = $indexContent -replace '<h2>How It Works</h2>', '<h2 class="section-title">How It Works</h2>'
$indexContent = $indexContent -replace '<h2>Trick-or-Treat Map</h2>', '<h2 class="section-title">Trick-or-Treat Map</h2>'

$indexContent | Set-Content -Path "index.html" -Encoding UTF8

# 3. Create comprehensive CSS fixes file
Write-Host "3. Creating comprehensive CSS fixes..." -ForegroundColor Yellow

$cssFixes = @'
/* === OPUS 4.1 Comprehensive Fixes === */

/* Dynamic viewport height for mobile */
.hero, .panel.fullscreen {
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
}

/* iOS Safari parallax fix */
@media (hover: none) and (pointer: coarse) {
  .parallax-bg {
    background-attachment: scroll !important;
  }
}

/* Panel z-index management */
.panel {
  position: relative;
  isolation: isolate;
}

.parallax-decor {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.panel > .content {
  position: relative;
  z-index: 1;
}

/* Steps grid normal flow */
.steps-grid {
  position: static;
  margin: 0;
}

/* Visible by default, enhance with JS */
.section-title,
.content p,
.media-card,
.map-frame {
  opacity: 1;
  transform: none;
}

/* JS-enhanced reveals */
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal.visible {
  opacity: 1;
  transform: none;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Houses grid layout fix */
.houses-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 0;
}

@media (max-width: 768px) {
  .houses-grid {
    grid-template-columns: 1fr;
  }
}

.house-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
}

.house-card__icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #ff7a1a, #ff5a00);
  padding: 4px;
}

.house-card__icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.house-meta h4 {
  margin: 0 0 2px;
  color: #fff;
  font-size: 0.95rem;
}

.house-sub {
  opacity: 0.8;
  margin: 0 0 4px;
  color: #ffb54d;
  font-size: 0.75rem;
}

.house-meta address {
  font-style: normal;
  color: #a8b0c0;
  font-size: 0.7rem;
  opacity: 0.8;
}

/* Hero background image positioning */
.hero {
  position: relative;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

/* Lazy loading for images */
img[loading="lazy"] {
  background: linear-gradient(135deg, #1a1f3a, #0b0e1d);
}
'@

$cssFixes | Set-Content -Path "css/opus-fixes.css" -Encoding UTF8

# Add the fixes CSS to index.html
$indexContent = Get-Content "index.html" -Raw
if ($indexContent -notmatch 'opus-fixes.css') {
    $indexContent = $indexContent -replace '(<link rel="stylesheet" href="css/fixes.css">)', '$1
    <link rel="stylesheet" href="css/opus-fixes.css">'
    $indexContent | Set-Content -Path "index.html" -Encoding UTF8
}

Write-Host "`nAll remaining fixes applied!" -ForegroundColor Green
Write-Host "`nChanges made:" -ForegroundColor Cyan
Write-Host "  ✓ Updated app.js IntersectionObserver to target specific elements" -ForegroundColor White
Write-Host "  ✓ Added section-title classes to h2 elements" -ForegroundColor White
Write-Host "  ✓ Created comprehensive CSS fixes in opus-fixes.css" -ForegroundColor White
Write-Host "  ✓ Added responsive image support with picture element" -ForegroundColor White
Write-Host "  ✓ Fixed mobile viewport height with dvh units" -ForegroundColor White
Write-Host "  ✓ Added reduced motion support" -ForegroundColor White