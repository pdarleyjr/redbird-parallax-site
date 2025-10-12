// Fixed houses display with correct icon mapping
(function() {
  // Base path and fallback icon - using relative paths
  const ICON_BASE = "assets/img/icons/";
  const ICON_FALLBACK = "pumpkin.png";
  
  // Complete icon mappings with all variations (Updated for 27 houses)
  const ICON_MAP = {
    "milo's dudgeon of treats": "milos-dudgeon.png",
    "milos-dudgeon": "milos-dudgeon.png",
    "halloween corner": "halloween-corner.png",
    "cancela's crypt": "cancelas-crypt.png",
    "cancelas-crypt": "cancelas-crypt.png",
    "trick or treat realty": "trick-or-treat-realty.png",
    "rivera haunted mansion": "rivera-haunted-mansion.png",
    "merino house": "merino-house.png",
    "the three witch house": "three-witch-house.png",
    "three-witch-house": "three-witch-house.png",
    "the three-witch house": "three-witch-house.png",
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
    "carballosa candy critters": "candy-critters.png",
    "candy-critters": "candy-critters.png",
    "caballosa candy critters": "candy-critters.png",
    "the not-so-scary house!": "not-so-scary.png",
    "not-so-scary": "not-so-scary.png",
    "cabin in the woods": "cabin-woods.png",
    "cabin-woods": "cabin-woods.png",
    "red bird cemetery": "tombstone-graveyard.png",
    "red bird restless graveyard": "tombstone-graveyard.png",
    "tombstone-graveyard": "tombstone-graveyard.png",
    "candyland carnage": "candyland-carnage.png",
    "the skeleton house": "skeleton-house.png",
    "skeleton house": "skeleton-house.png",
    "scary cat": "scary-cat.png",
    "barbie boo": "barbie-boo.png",
    "the webbed manor": "webbed-manor.png",
    "webbed manor": "webbed-manor.png",
    "echeverri haunt": "echeverri-haunt.png",
    "carter-goldberg haunted house": "haunted-generic.png",
    "grape family haunted house": "haunted-generic.png",
    "fisher family haunted house": "haunted-generic.png",
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
    
    if (n.includes('milo') || n.includes('dudgeon')) return 'Dog-friendly treats await!';
    if (n.includes('halloween corner')) return 'Where spooky meets sweet';
    if (n.includes('crypt')) return 'Ancient secrets and spooky treasures';
    if (n.includes('realty')) return 'Haunted properties for brave souls';
    if (n.includes('rivera') && n.includes('mansion')) return 'Grand estate with ghostly elegance';
    if (n.includes('merino')) return 'Mysterious treats and surprises';
    if (n.includes('witch')) return 'Witchy trio casts spooky spells';
    if (n.includes('white house')) return 'Classic haunt with friendly ghosts';
    if (n.includes('monster')) return 'Cute monsters welcome all ages';
    if (n.includes('rizzler')) return 'Spooky but sweet treats await';
    if (n.includes('spider') || n.includes('web')) return 'Friendly webs and cozy cottage';
    if (n.includes('webbed manor')) return 'Tangled webs and gothic mystery';
    if (n.includes('sweet') || n.includes('spooky stop')) return 'Sweet treats with spooky twists';
    if (n.includes('sandsnake')) return 'Miami sandsnake guards candy';
    if (n.includes('blues') || n.includes('boooo')) return 'Cool blue spirits and boo vibes';
    if (n.includes('candyland') && n.includes('carnage')) return 'Sweet chaos in candy paradise';
    if (n.includes('candy') || n.includes('critter')) return 'Candy paradise with cute critters';
    if (n.includes('skeleton')) return 'Bony friends greet trick-or-treaters';
    if (n.includes('scary cat')) return 'Black cats and magical mischief';
    if (n.includes('scary')) return 'Not too scary, perfect for kids';
    if (n.includes('barbie boo')) return 'Pink glamour meets spooky fun';
    if (n.includes('cabin') || n.includes('woods')) return 'Mysterious cabin lights the way';
    if (n.includes('cemetery') || n.includes('graveyard')) return 'Fog and friendly frights await';
    if (n.includes('echeverri')) return 'Mysterious haunt with surprises';
    if (n.includes('carter-goldberg')) return 'Family-friendly haunted fun';
    if (n.includes('grape')) return 'Vintage scares and fruity treats';
    if (n.includes('fisher')) return 'Nautical nightmares and sea spirits';
    return 'Halloween fun for all ages';
  }

  // Main function to load and render houses
  async function renderHouses() {
    const container = document.getElementById('houses-unified-container');
    if (!container) {
      console.error('Houses container not found');
      return;
    }

    // Check if we're running from file:// protocol
    const isFileProtocol = window.location.protocol === 'file:';
    
    // If running locally and we have embedded data, use it
    if (isFileProtocol && window.HOUSES_DATA) {
      console.log('Using embedded houses data for local viewing');
      renderEmbeddedHouses(container);
      return;
    }

    // Check if PapaParse is available
    if (!window.Papa) {
      console.error('PapaParse not loaded - falling back to manual parsing');
      renderHousesManual();
      return;
    }

    try {
      // Fetch the CSV data
      const response = await fetch('data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv');
      if (!response.ok) throw new Error('Failed to fetch CSV');
      
      const text = await response.text();
      
      // Parse CSV with PapaParse
      const result = Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: false
      });
      
      if (result.errors.length > 0) {
        console.warn('CSV parsing warnings:', result.errors);
      }
      
      const houses = [];
      // Skip header row, start from index 1
      for (let i = 1; i < result.data.length; i++) {
        const row = result.data[i];
        if (row.length >= 3) {
          const funName = row[2] || 'Haunted House';
          const address = row[1] || '';
          
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
      }
      
      // Add Graveyard house if not already present
      if (!houses.some(h => h.title.toLowerCase().includes('graveyard'))) {
        houses.push({
          title: 'Red Bird Restless Graveyard',
          subtitle: 'Fog and friendly frights await',
          address: '3821 SW 60th Ave, Miami, FL 33155',
          icon: resolveIcon('Red Bird Restless Graveyard'),
          slug: 'red-bird-restless-graveyard'
        });
      }

      // Render the houses
      renderHouseHTML(container, houses);
      
    } catch (error) {
      console.error('Error loading houses:', error);
      // If fetch fails and we have embedded data, use it as fallback
      if (window.HOUSES_DATA) {
        console.log('Using embedded data as fallback');
        renderEmbeddedHouses(container);
      } else {
        showError(container, error);
      }
    }
  }
  
  // Render houses from embedded data
  function renderEmbeddedHouses(container) {
    if (!window.HOUSES_DATA) {
      showError(container, new Error('No houses data available'));
      return;
    }
    
    const houses = window.HOUSES_DATA.map(item => ({
      title: item.funName || 'Haunted House',
      subtitle: makeSubtitle(item.funName),
      address: item.address || '',
      icon: resolveIcon(item.funName),
      slug: slugify(item.funName)
    }));
    
    renderHouseHTML(container, houses);
  }

  // Manual CSV parsing fallback
  async function renderHousesManual() {
    const container = document.getElementById('houses-unified-container');
    if (!container) return;

    try {
      const response = await fetch('data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv');
      if (!response.ok) throw new Error('Failed to fetch CSV');
      
      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV has no data');
      }

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

      renderHouseHTML(container, houses);
      
    } catch (error) {
      console.error('Error loading houses:', error);
      showError(container, error);
    }
  }

  // Shared HTML rendering function
  function renderHouseHTML(container, houses) {
    // Update the main section header count if it exists
    const countElement = document.getElementById('houses-count');
    if (countElement) {
      countElement.textContent = `${houses.length} PARTICIPATING HOUSES`;
    }
    
    // Also update any h3 elements that contain "PARTICIPATING HOUSES"
    const headings = document.querySelectorAll('h3');
    headings.forEach(h3 => {
      if (h3.textContent.includes('PARTICIPATING HOUSES')) {
        h3.textContent = `${houses.length} PARTICIPATING HOUSES`;
      }
    });
    
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
                     style="max-width: 100%; height: auto; display: block;"
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
  }

  // Error display function
  function showError(container, error) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #ff7a1a;">
        <p>Unable to load houses data. Please refresh the page.</p>
        <p style="color: #666; font-size: 0.9rem;">Error: ${error.message}</p>
      </div>
    `;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHouses);
  } else {
    renderHouses();
  }
})();