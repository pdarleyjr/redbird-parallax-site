// Specific icon resolver based on exact house names
const resolveIcon = (houseName) => {
  const name = (houseName || '').toLowerCase();
  
  // Map each house to its specific icon based on the screenshot
  const iconMap = {
    'the three witch house': 'three-witch-house.png',
    'the three-witch house': 'three-witch-house.png',
    'the haunted white house': 'white-house.png',
    'the monster house': 'monster-house.png',
    'the spooky-rizzlers': 'spooky-rizzlers.png',
    'spiderweb cottage': 'spiderweb-cottage.png',
    'sweet & spooky stop': 'sweet-spooky.png',
    'sweet and spooky stop': 'sweet-spooky.png',
    'casa sandsnake': 'sandsnake.png',
    'blues boooooo house': 'blues-house.png',
    'blues booooo house': 'blues-house.png',
    'caballosa candy critters': 'candy-critters.png',
    'the not-so-scary house!': 'not-so-scary.png',
    'the not so scary house': 'not-so-scary.png',
    'cabin in the woods': 'cabin-woods.png',
    'red bird restless graveyard': 'tombstone-graveyard.png',
    'haunted house': 'haunted-generic.png'
  };
  
  // Check for exact match first
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name === key) {
      return `/assets/img/icons/${icon}`;
    }
  }
  
  // Check for partial matches
  if (name.includes('witch')) return '/assets/img/icons/three-witch-house.png';
  if (name.includes('white house')) return '/assets/img/icons/white-house.png';
  if (name.includes('monster')) return '/assets/img/icons/monster-house.png';
  if (name.includes('rizzler')) return '/assets/img/icons/spooky-rizzlers.png';
  if (name.includes('spider') || name.includes('web')) return '/assets/img/icons/spiderweb-cottage.png';
  if (name.includes('sweet') || name.includes('spooky')) return '/assets/img/icons/sweet-spooky.png';
  if (name.includes('sandsnake') || name.includes('snake')) return '/assets/img/icons/sandsnake.png';
  if (name.includes('blues') || name.includes('boooo')) return '/assets/img/icons/blues-house.png';
  if (name.includes('candy') || name.includes('critter')) return '/assets/img/icons/candy-critters.png';
  if (name.includes('scary')) return '/assets/img/icons/not-so-scary.png';
  if (name.includes('cabin') || name.includes('woods')) return '/assets/img/icons/cabin-woods.png';
  if (name.includes('graveyard') || name.includes('tombstone')) return '/assets/img/icons/tombstone-graveyard.png';
  if (name.includes('pumpkin')) return '/assets/img/icons/pumpkin.png';
  
  // Default fallback
  return '/assets/img/icons/haunted-generic.png';
};

// Generate subtitle based on house name
const makeSubtitle = (nameRaw) => {
  const n = (nameRaw || '').toLowerCase();
  
  if (n.includes('witch')) return 'Witchy trio casts Halloween spells';
  if (n.includes('white house')) return 'Classic haunt with friendly ghosts';
  if (n.includes('monster')) return 'Cute monsters welcome all ages';
  if (n.includes('rizzler')) return 'Spooky but sweet, playful frights';
  if (n.includes('spider') || n.includes('web')) return 'Friendly webs and cozy cottage';
  if (n.includes('sweet') || n.includes('spooky')) return 'Sweet treats with spooky twists';
  if (n.includes('sandsnake') || n.includes('snake')) return 'Miami sandsnake guards the candy';
  if (n.includes('blues') || n.includes('boooo')) return 'Cool blue spirits and boo vibes';
  if (n.includes('candy') || n.includes('critter')) return 'Candy paradise with cute critters';
  if (n.includes('scary')) return 'Not too scary, just right for kids!';
  if (n.includes('cabin') || n.includes('woods')) return 'Mysterious cabin lights the way';
  if (n.includes('graveyard') || n.includes('tombstone')) return 'Fog, flicker, and friendly frights';
  if (n.includes('pumpkin')) return 'Glowing jack-o\'-lanterns smile';
  
  return 'Friendly Halloween fun for all';
};

// Slugify helper
const slugify = s => s.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Load and render houses in unified container
async function loadHouses() {
  try {
    // Fetch CSV
    const res = await fetch('/data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv');
    const text = await res.text();

    // Parse CSV
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim());
    
    const houses = [];
    
    // Parse CSV rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      
      const funName = row['Fun "Trick-or-Treat Name"'] || 'Haunted House';
      const address = row['Address'] || '';
      
      // Skip empty rows
      if (!address) continue;
      
      houses.push({
        title: funName,
        subtitle: makeSubtitle(funName),
        address: address,
        icon: resolveIcon(funName),
        slug: slugify(funName)
      });
    }
    
    // Add Graveyard house if not present
    if (!houses.some(h => /restless graveyard/i.test(h.title))) {
      houses.push({
        title: 'Red Bird Restless Graveyard',
        subtitle: 'Fog, flicker, and friendly frights',
        address: '3821 SW 60th Ave, Miami, FL 33155',
        icon: '/assets/img/icons/tombstone-graveyard.png',
        slug: 'red-bird-restless-graveyard'
      });
    }
    
    return houses;
  } catch (error) {
    console.error('Error loading houses:', error);
    return [];
  }
}

// Render houses in unified container
async function renderHouses() {
  const container = document.getElementById('houses-unified-container');
  if (!container) return;

  const houses = await loadHouses();
  
  if (houses.length === 0) {
    container.innerHTML = '<p class="no-houses">No houses available at this time.</p>';
    return;
  }
  
  // Build unified container HTML
  const containerHTML = `
    <div class="houses-container">
      <div class="container-header">
        <h4>🎃 ${houses.length} Participating Houses 🎃</h4>
        <p>Visit each house for unique Halloween treats and decorations!</p>
      </div>
      <ul class="house-grid">
        ${houses.map(house => `
          <li class="house-item">
            <img src="${house.icon}" alt="" class="house-icon" loading="lazy" decoding="async">
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
  
  container.innerHTML = containerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderHouses);
} else {
  renderHouses();
}