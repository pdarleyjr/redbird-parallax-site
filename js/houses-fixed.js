// Fixed houses display with correct icon mapping
(function() {
  // Base path and fallback icon - using relative paths
  const ICON_BASE = "assets/img/icons/";
  const ICON_FALLBACK = "pumpkin.png";
  
  // Complete icon mappings with all variations
  const ICON_MAP = {
    "the three witch house": "three-witch-house.png",
    "three-witch-house": "three-witch-house.png",
    "the haunted white house": "white-house.png",
    "haunted-white-house": "white-house.png",
    "white-house": "white-house.png",
    "the monster house": "monster-house.png",
    "monster-house": "monster-house.png",
    "the spooky-rizzlers": "spooky-rizzlers.png",
    "spooky-rizzlers": "spooky-rizzlers.png",
    "spiderweb cottage": "spiderweb-cottage.png",
    "sweet & spooky stop": "sweet-spooky.png",
    "sweet-spooky-stop": "sweet-spooky.png",
    "casa sandsnake": "sandsnake.png",
    "sandsnake": "sandsnake.png",
    "blues boooooo house": "blues-house.png",
    "blues-house": "blues-house.png",
    "caballosa candy critters": "candy-critters.png",
    "candy-critters": "candy-critters.png",
    "the not-so-scary house!": "not-so-scary.png",
    "not-so-scary": "not-so-scary.png",
    "cabin in the woods": "cabin-woods.png",
    "cabin-woods": "cabin-woods.png",
    "red bird restless graveyard": "tombstone-graveyard.png",
    "tombstone-graveyard": "tombstone-graveyard.png",
    "haunted house": "haunted-generic.png",
    "haunted-generic": "haunted-generic.png"
  };
  
  // Slugify helper for consistent key generation
  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Robust icon resolver
  function resolveIcon(houseName, iconKey) {
    const name = (houseName || '').toLowerCase().trim();
    const slug = iconKey || slugify(houseName);
    
    // Try exact match first
    let iconFile = ICON_MAP[name] || ICON_MAP[slug];
    
    // If no exact match, try to find a partial match
    if (!iconFile) {
      const nameWords = name.split(/\s+/);
      for (const [key, value] of Object.entries(ICON_MAP)) {
        // Check if any significant word matches
        if (nameWords.some(word => word.length > 3 && key.includes(word))) {
          iconFile = value;
          break;
        }
      }
    }
    
    // Use fallback if still no match
    if (!iconFile) {
      console.warn(`No icon mapping found for "${houseName}", using fallback`);
      iconFile = ICON_FALLBACK;
    }
    
    return ICON_BASE + iconFile;
  }

  // Generate subtitle based on house name
  function makeSubtitle(nameRaw) {
    const n = (nameRaw || '').toLowerCase();
    
    if (n.includes('witch')) return 'Witchy trio casts spooky spells';
    if (n.includes('white house')) return 'Classic haunt with friendly ghosts';
    if (n.includes('monster')) return 'Cute monsters welcome all ages';
    if (n.includes('rizzler')) return 'Spooky but sweet treats await';
    if (n.includes('spider') || n.includes('web')) return 'Friendly webs and cozy cottage';
    if (n.includes('sweet') || n.includes('spooky')) return 'Sweet treats with spooky twists';
    if (n.includes('sandsnake')) return 'Miami sandsnake guards candy';
    if (n.includes('blues') || n.includes('boooo')) return 'Cool blue spirits and boo vibes';
    if (n.includes('candy') || n.includes('critter')) return 'Candy paradise with cute critters';
    if (n.includes('scary')) return 'Not too scary, perfect for kids';
    if (n.includes('cabin') || n.includes('woods')) return 'Mysterious cabin lights the way';
    if (n.includes('graveyard')) return 'Fog and friendly frights await';
    return 'Halloween fun for all ages';
  }

  // Main function to load and render houses
  async function renderHouses() {
    const container = document.getElementById('houses-unified-container');
    if (!container) {
      console.error('Houses container not found');
      return;
    }

    try {
      // Fetch the CSV data
      const response = await fetch('data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv');
      if (!response.ok) throw new Error('Failed to fetch CSV');
      
      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV has no data');
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim());
      const houses = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const funName = values[2] || 'Haunted House';
        const address = values[1] || '';
        
        if (address) {
          const iconPath = resolveIcon(funName);
          houses.push({
            title: funName,
            subtitle: makeSubtitle(funName),
            address: address,
            icon: iconPath,
            slug: slugify(funName)
          });
        }
      }
      
      // Add Graveyard house
      houses.push({
        title: 'Red Bird Restless Graveyard',
        subtitle: 'Fog and friendly frights await',
        address: '3821 SW 60th Ave, Miami, FL 33155',
        icon: resolveIcon('Red Bird Restless Graveyard'),
        slug: 'red-bird-restless-graveyard'
      });

      // Build the HTML with proper icon structure
      const html = `
        <div class="houses-container">
          <div class="container-header">
            <h4>🎃 ${houses.length} Participating Houses 🎃</h4>
            <p>Visit each house for unique Halloween treats!</p>
          </div>
          <ul class="house-grid">
            ${houses.map(house => `
              <li class="house-item">
                <div class="house-card__icon">
                  <img src="${house.icon}" 
                       alt="${house.title} icon" 
                       class="house-icon" 
                       loading="lazy" 
                       decoding="async"
                       onerror="this.src='${ICON_BASE}${ICON_FALLBACK}'">
                </div>
                <div class="house-details">
                  <h5 class="house-name">${house.title}</h5>
                  <p class="house-subtitle">${house.subtitle}</p>
                  <address class="house-address">${house.address}</address>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      
      container.innerHTML = html;
      console.log(`Successfully rendered ${houses.length} houses with icons`);
      
      // Log icon paths for debugging
      houses.forEach(house => {
        console.log(`House: "${house.title}" -> Icon: "${house.icon}"`);
      });
      
    } catch (error) {
      console.error('Error loading houses:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #ff7a1a;">
          <p>Unable to load houses data. Please refresh the page.</p>
          <p style="color: #666; font-size: 0.9rem;">Error: ${error.message}</p>
        </div>
      `;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHouses);
  } else {
    renderHouses();
  }
})();