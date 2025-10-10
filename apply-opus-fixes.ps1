# Apply OPUS 4.1 Fixes to Red Bird Parallax Site

Write-Host "Applying OPUS 4.1 fixes to Red Bird Parallax Site..." -ForegroundColor Green

# 1. Fix houses-final.js with robust icon resolver
$housesScript = @'
// redbird-parallax-site/js/houses-final.js
(() => {
  const ICON_BASE = '/assets/img/icons/';
  const ICON_FALLBACK = 'pumpkin.png';

  const ICON_MAP = {
    'the three witch house': 'three-witch-house.png',
    'the haunted white house': 'white-house.png',
    'the monster house': 'monster-house.png',
    'the spooky-rizzlers': 'spooky-rizzlers.png',
    'spiderweb cottage': 'spiderweb-cottage.png',
    'sweet & spooky stop': 'sweet-spooky.png',
    'casa sandsnake': 'sandsnake.png',
    'blues boooooo house': 'blues-house.png',
    'cabin in the woods': 'cabin-woods.png',
    'red bird restless graveyard': 'tombstone-graveyard.png'
  };

  const slugify = s => (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  function resolveIcon(houseName, explicit) {
    const exact = ICON_MAP[(houseName||'').toLowerCase().trim()];
    if (exact) return ICON_BASE + exact;

    // heuristic fallback based on keywords
    const n = (houseName||'').toLowerCase();
    if (/grave|tomb|restless/.test(n)) return ICON_BASE + 'tombstone-graveyard.png';
    if (/witch/.test(n)) return ICON_BASE + 'three-witch-house.png';
    if (/spider|web|cottage/.test(n)) return ICON_BASE + 'spiderweb-cottage.png';
    if (/candy|critters/.test(n)) return ICON_BASE + 'candy-critters.png';
    if (/spooky|sweet/.test(n)) return ICON_BASE + 'sweet-spooky.png';
    if (/monster/.test(n)) return ICON_BASE + 'monster-house.png';
    if (/sand|snake/.test(n)) return ICON_BASE + 'sandsnake.png';
    if (/blue/.test(n)) return ICON_BASE + 'blues-house.png';
    if (/cabin|woods/.test(n)) return ICON_BASE + 'cabin-woods.png';

    return ICON_BASE + (explicit || ICON_FALLBACK);
  }

  async function loadHouses() {
    const res = await fetch('/data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv');
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim());
    const houses = [];

    for (let i=1;i<lines.length;i++){
      const values = lines[i].split(',').map(v=>v.trim());
      const row = {};
      headers.forEach((h,idx)=>row[h]=values[idx]||'');
      const title = row['Fun "Trick-or-Treat Name"'] || 'Haunted House';
      const address = row['Address'] || '';
      if(!address) continue;

      houses.push({
        title,
        address,
        subtitle: 'Friendly frights for all ages.',
        icon: resolveIcon(title),
        slug: slugify(title)
      });
    }

    if (!houses.some(h => /restless graveyard/i.test(h.title))) {
      houses.push({
        title: 'Red Bird Restless Graveyard',
        address: '3821 SW 60th Ave, Miami, FL 33155',
        subtitle: 'Fog, flicker, and friendly frights among the headstones.',
        icon: ICON_BASE + 'tombstone-graveyard.png',
        slug: 'red-bird-restless-graveyard'
      });
    }
    return houses;
  }

  async function renderHouses() {
    const container = document.getElementById('houses-unified-container');
    if (!container) return;

    const houses = await loadHouses();
    container.innerHTML = `
      <ul class="houses-grid" id="house-grid" role="list">
        ${houses.map(h => `
          <li class="house-card">
            <div class="house-card__icon">
              <img src="${h.icon}" alt="${h.title} icon" width="48" height="48" loading="lazy" decoding="async">
            </div>
            <div class="house-meta">
              <h4>${h.title}</h4>
              <p class="house-sub">${h.subtitle}</p>
              <address>${h.address}</address>
            </div>
          </li>
        `).join('')}
      </ul>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHouses);
  } else {
    renderHouses();
  }
})();
'@

# 2. Additional CSS for houses grid
$housesCSS = @'

/* Guaranteed visible icon layout */
.houses-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width: 768px){.houses-grid{grid-template-columns:1fr}}
.house-card{display:flex;gap:12px;align-items:flex-start;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:12px}
.house-card__icon{width:40px;height:40px;flex:0 0 40px;border-radius:50%;overflow:hidden}
.house-card__icon img{width:100%;height:100%;object-fit:contain;display:block}
.house-meta h4{margin:0 0 2px}
.house-sub{opacity:.8;margin:0 0 4px}
'@

# 3. Base CSS additions
$baseCSS = @'

/* Panel layout fixes */
.panel{position:relative;isolation:isolate}
.parallax-decor{position:absolute;inset:0;z-index:0;pointer-events:none}
.panel>.content{position:relative;z-index:1}
.steps-grid{position:static;margin:0}

/* Base state visible - progressive enhancement */
.section-title,.content p,.media-card,.map-frame{opacity:1;transform:none}

/* Enhance only when JS adds .reveal */
.reveal{opacity:0;transform:translateY(16px);transition:opacity .6s ease,transform .6s ease}
.reveal.visible{opacity:1;transform:none}

/* Motion safety */
@media (prefers-reduced-motion: reduce){
  .reveal{opacity:1 !important;transform:none !important;transition:none !important}
}
'@

# Apply fixes
Write-Host "1. Updating houses-final.js..." -ForegroundColor Yellow
$housesScript | Set-Content -Path "js/houses-final.js" -Encoding UTF8

Write-Host "2. Adding houses CSS fixes..." -ForegroundColor Yellow
Add-Content -Path "css/featured-houses.css" -Value $housesCSS -Encoding UTF8

Write-Host "3. Adding base CSS fixes..." -ForegroundColor Yellow
Add-Content -Path "css/base.css" -Value $baseCSS -Encoding UTF8

Write-Host "4. Updating index.html script reference..." -ForegroundColor Yellow
$indexContent = Get-Content "index.html" -Raw
$indexContent = $indexContent -replace 'js/houses-fixed\.js', 'js/houses-final.js'
$indexContent | Set-Content -Path "index.html" -Encoding UTF8

Write-Host "All OPUS 4.1 fixes applied successfully!" -ForegroundColor Green
Write-Host "Please test the site to verify:" -ForegroundColor Cyan
Write-Host "  - Icons are visible in Featured Houses" -ForegroundColor White
Write-Host "  - Action cards appear in correct section" -ForegroundColor White
Write-Host "  - All titles and content are visible" -ForegroundColor White
Write-Host "  - Mobile viewport height is correct (100dvh)" -ForegroundColor White