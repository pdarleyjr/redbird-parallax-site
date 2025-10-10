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
