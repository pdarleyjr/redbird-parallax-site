// redbird-parallax-site/js/houses-final.js
// RFC 4180 compliant CSV parser and house renderer
(() => {
  const ICON_BASE = './assets/img/icons/';
  const ICON_FALLBACK = 'haunted-generic.png';

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
    'red bird restless graveyard': 'tombstone-graveyard.png',
    'caballosa candy critters': 'candy-critters.png',
    'the not-so-scary house!': 'not-so-scary.png'
  };

  const slugify = s => (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  if (!window.Papa) {
    console.error('PapaParse missing');
    return;
  }

  function resolveIcon(houseName, explicit) {
    const exact = ICON_MAP[(houseName||'').toLowerCase().trim()];
    if (exact) return ICON_BASE + exact;

    // Heuristic fallback based on keywords
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
    if (/not.*scary/.test(n)) return ICON_BASE + 'not-so-scary.png';
    if (/white.*house/.test(n)) return ICON_BASE + 'white-house.png';
    if (/rizzler/.test(n)) return ICON_BASE + 'spooky-rizzlers.png';

    return ICON_BASE + (explicit || ICON_FALLBACK);
  }

  function makeSubtitle(nameRaw) {
    const n = (nameRaw || '').toLowerCase();
    if (/graveyard|tombstone|restless/.test(n)) return 'Fog, flicker, and friendly frights among the headstones.';
    if (/witch|trio/.test(n)) return 'Witchy trio welcomes trick-or-treaters.';
    if (/spider|web|cottage/.test(n)) return 'Cozy cottage with friendly webs.';
    if (/cabin|woods/.test(n)) return 'Warm lanterns by the woods.';
    if (/rizzler/.test(n)) return 'Playful rizzlers, spooky but sweet.';
    if (/sweet|spooky/.test(n)) return 'Cute treats with a spooky twist.';
    if (/candy|critters/.test(n)) return 'Sweet critters and candy galore.';
    if (/blue|blues/.test(n)) return 'A cool boo with blue vibes.';
    if (/white house/.test(n)) return 'A friendly, glowing haunt.';
    if (/monster/.test(n)) return 'Cute monster vibes on the porch.';
    if (/snake|sand/.test(n)) return 'Miami sandsnake tips its hat.';
    if (/not.*scary/.test(n)) return 'Friendly and fun for little ones.';
    return 'Friendly frights for all ages.';
  }

  async function loadHouses() {
    try {
      const res = await fetch('./data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv');
      if (!res.ok) {
        throw new Error('Failed to fetch CSV: ' + res.status + ' ' + res.statusText);
      }
      
      const text = await res.text();
      const lines = parseCSV(text);
      
      if (lines.length < 2) {
        console.warn('CSV has no data rows');
        return [];
      }
      
      const headers = lines[0];
      const houses = [];
      
      console.log('CSV Headers:', headers);

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i];
        const row = {};
        
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        
        // Find the title column (handle variations)
        const title = row['Fun "Trick-or-Treat Name"'] || 
                     row['Fun Trick-or-Treat Name'] ||
                     row['Trick-or-Treat Name'] ||
                     'Haunted House';
        
        const address = row['Address'] || '';
        
        if (!address) {
          console.warn('Skipping row ' + i + ': no address');
          continue;
        }

        houses.push({
          title,
          address,
          subtitle: makeSubtitle(title),
          icon: resolveIcon(title),
          slug: slugify(title)
        });
      }

      // Add Graveyard house if not present
      if (!houses.some(h => /restless graveyard/i.test(h.title))) {
        houses.push({
          title: 'Red Bird Restless Graveyard',
          address: '3821 SW 60th Ave, Miami, FL 33155',
          subtitle: 'Fog, flicker, and friendly frights among the headstones.',
          icon: ICON_BASE + 'tombstone-graveyard.png',
          slug: 'red-bird-restless-graveyard'
        });
      }
      
      console.log('Loaded ' + houses.length + ' houses');
      return houses;
    } catch (error) {
      console.error('Error loading houses:', error);
      return [];
    }
  }

  async function renderHouses() {
    const container = document.getElementById('houses-unified-container');
    if (!container) {
      console.warn('Container #houses-unified-container not found');
      return;
    }

    const houses = await loadHouses();
    
    if (houses.length === 0) {
      container.innerHTML = '<div class="houses-container"><p style="text-align: center; color: #a8b0c0; padding: 2rem;">No houses available at this time. Check back soon!</p></div>';
      return;
    }

    // Use correct CSS classes matching featured-houses-unified.css
    const houseItems = houses.map(h => 
      '<li class="house-item">' +
        '<img class="house-icon" src="' + h.icon + '" alt="' + h.title + ' icon" width="64" height="64" loading="lazy" decoding="async" onerror="this.src=\'' + ICON_BASE + ICON_FALLBACK + '\'">' +
        '<div class="house-details">' +
          '<h5 class="house-name">' + h.title + '</h5>' +
          '<p class="house-subtitle">' + h.subtitle + '</p>' +
          '<address class="house-address">' + h.address + '</address>' +
        '</div>' +
      '</li>'
    ).join('');

    container.innerHTML = 
      '<div class="houses-container">' +
        '<div class="container-header">' +
          '<h4>Participating Houses</h4>' +
          '<p>' + houses.length + ' spooky stops on the trail</p>' +
        '</div>' +
        '<ul class="house-grid" role="list">' +
          houseItems +
        '</ul>' +
      '</div>';
    
    console.log('Houses rendered successfully');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHouses);
  } else {
    renderHouses();
  }
})();
