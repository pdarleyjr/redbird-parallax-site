// Icon resolver with available PNG files
const resolveIcon = (nameRaw) => {
  const name = (nameRaw || '').toLowerCase();
  
  // Check for specific keywords and return corresponding icon
  const iconMappings = [
    [/graveyard|tombstone|restless/, 'tombstone-graveyard.png'],
    [/witch|trio|three-witch/, 'pumpkin.png'],
    [/spider|web|cottage/, 'haunted-house.svg'],
    [/cabin|woods/, 'haunted-house.svg'],
    [/rizzler|rizzlers/, 'pumpkin.png'],
    [/(^| )sweet( |$)|spooky/, 'haunted-house.svg'],
    [/candy|critters/, 'pumpkin.png'],
    [/blue|blues/, 'haunted-house.svg'],
    [/white house/, 'haunted-house.svg'],
    [/monster/, 'haunted-house.svg'],
    [/snake|sand/, 'haunted-house.svg'],
    [/pumpkin/, 'pumpkin.png'],
    [/bat/, 'bat.png'],
    [/haunted|ghost/, 'haunted-house.svg']
  ];
  
  for (const [pattern, icon] of iconMappings) {
    if (pattern.test(name)) {
      return `/assets/img/icons/${icon}`;
    }
  }
  
  // Default fallback
  return '/assets/img/icons/haunted-house.svg';
};

// Subtitle generator
const makeSubtitle = (nameRaw) => {
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
  if (/pumpkin/.test(n)) return 'Glowing jack-o\'-lantern smiles.';
  return 'Friendly frights for all ages.';
};

// Slugify helper
const slugify = s => s.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Load and render houses
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
        subtitle: 'Fog, flicker, and friendly frights among the headstones.',
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

// Render houses to grid
async function renderHouses() {
  const grid = document.getElementById('house-grid');
  if (!grid) return;

  const houses = await loadHouses();
  
  if (houses.length === 0) {
    grid.innerHTML = '<li class="no-houses">No houses available at this time.</li>';
    return;
  }
  
  const houseHTML = houses.map(house => `
    <li class="house-card">
      <img src="${house.icon}" alt="" width="48" height="48" loading="lazy" decoding="async">
      <div class="house-meta">
        <h4>${house.title}</h4>
        <p class="house-sub">${house.subtitle}</p>
        <address>${house.address}</address>
      </div>
    </li>
  `).join('');
  
  grid.innerHTML = houseHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderHouses);
} else {
  renderHouses();
}