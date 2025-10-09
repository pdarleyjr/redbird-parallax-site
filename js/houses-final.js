// Final working houses display with correct icon mapping
(function() {
  // Icon resolver with exact house name matching
  const resolveIcon = (houseName) => {
    const name = (houseName || '').toLowerCase().trim();
    
    // Exact mappings for each house
    switch(name) {
      case 'the three witch house':
        return 'assets/img/icons/three-witch-house.png';
      case 'the haunted white house':
        return 'assets/img/icons/white-house.png';
      case 'the monster house':
        return 'assets/img/icons/monster-house.png';
      case 'the spooky-rizzlers':
        return 'assets/img/icons/spooky-rizzlers.png';
      case 'spiderweb cottage':
        return 'assets/img/icons/spiderweb-cottage.png';
      case 'sweet & spooky stop':
        return 'assets/img/icons/sweet-spooky.png';
      case 'casa sandsnake':
        return 'assets/img/icons/sandsnake.png';
      case 'blues boooooo house':
        return 'assets/img/icons/blues-house.png';
      case 'caballosa candy critters':
        return 'assets/img/icons/candy-critters.png';
      case 'the not-so-scary house!':
        return 'assets/img/icons/not-so-scary.png';
      case 'cabin in the woods':
        return 'assets/img/icons/cabin-woods.png';
      case 'red bird restless graveyard':
        return 'assets/img/icons/tombstone-graveyard.png';
      case 'haunted house':
      default:
        return 'assets/img/icons/haunted-generic.png';
    }
  };

  // Generate subtitle based on house name
  const makeSubtitle = (nameRaw) => {
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
  };

  // Main function to load and render houses
  async function renderHouses() {
    const container = document.getElementById('houses-unified-container');
    if (!container) {
      console.error('Container not found');
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
          houses.push({
            title: funName,
            subtitle: makeSubtitle(funName),
            address: address,
            icon: resolveIcon(funName)
          });
        }
      }
      
      // Add Graveyard house
      houses.push({
        title: 'Red Bird Restless Graveyard',
        subtitle: 'Fog and friendly frights await',
        address: '3821 SW 60th Ave, Miami, FL 33155',
        icon: 'assets/img/icons/tombstone-graveyard.png'
      });

      // Build the HTML
      const html = `
        <div class="houses-container">
          <div class="container-header">
            <h4>🎃 ${houses.length} Participating Houses 🎃</h4>
            <p>Visit each house for unique Halloween treats!</p>
          </div>
          <ul class="house-grid">
            ${houses.map(house => `
              <li class="house-item">
                <img src="${house.icon}" alt="${house.title}" class="house-icon" loading="lazy">
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
      console.log(`Rendered ${houses.length} houses successfully`);
      
    } catch (error) {
      console.error('Error loading houses:', error);
      container.innerHTML = '<p style="color: red;">Error loading houses. Please refresh the page.</p>';
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHouses);
  } else {
    renderHouses();
  }
})();