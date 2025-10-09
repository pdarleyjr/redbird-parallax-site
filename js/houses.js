// --- Utilities ---
const slugify = s => s.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const resolveIcon = (nameRaw) => {
  const name = (nameRaw || '').toLowerCase();

  const rules = [
    [/witch|trio|three-witch/, 'witches-trio.svg'],
    [/spider|web|cottage/, 'spiderweb-cottage.svg'],
    [/cabin|woods/, 'cabin-woods.svg'],
    [/rizzler|rizzlers/, 'spooky-rizzlers.svg'],
    [/(^| )sweet( |$)|spooky/, 'sweet-spooky.svg'],
    [/candy|critters/, 'candy-critters.svg'],
    [/blue|blues/, 'ghost-cool.svg'],
    [/white house/, 'haunted-white-house.svg'],
    [/monster/, 'monster-house.svg'],
    [/snake|sand/, 'sandsnake.svg'],
    [/pumpkin/, 'pumpkin.svg'],
    [/graveyard|tombstone/, 'tombstone-graveyard.svg'],
    [/haunted|ghost/, 'haunted-house.svg']
  ];
  
  const rule = rules.find(([re]) => re.test(name));
  const icon = rule ? rule[1] : 'haunted-house.svg';
  
  return `/assets/img/icons/${icon}`;
};

const makeSubtitle = (nameRaw) => {
  const n = (nameRaw || '').toLowerCase();
  
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
  if (/graveyard|tombstone/.test(n)) return 'Fog, flicker, and friendly frights among the headstones.';
  return 'Friendly frights for all ages.';
};

// --- Data Load ---
async function loadHouses() {
  try {
    // 1) Fetch CSV
    const res = await fetch('/data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv');
    const text = await res.text();

    // Simple CSV parser
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [headerLine, ...dataLines] = lines;
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));

    const items = dataLines.map(line => {
      // Handle CSV with quotes
      const cols = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim());
      
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = cols[idx] || '';
      });
      
      const title = obj['Fun "Trick-or-Treat Name"'] || 'Haunted House';
      return {
        title,
        subtitle: makeSubtitle(title),
        address: obj['Address'] || '',
        icon: resolveIcon(title),
        slug: slugify(title)
      };
    });

    // 2) Append Graveyard home if not present
    if (!items.some(i => /restless graveyard/i.test(i.title))) {
      items.push({
        title: 'Red Bird Restless Graveyard',
        subtitle: 'Fog, flicker, and friendly frights among the headstones.',
        address: '3821 SW 60th Ave, Miami, FL 33155',
        icon: '/assets/img/icons/tombstone-graveyard.svg',
        slug: 'red-bird-restless-graveyard'
      });
    }

    return items;
  } catch (error) {
    console.error('Error loading houses:', error);
    // Return demo data if CSV fails
    return [
      {
        title: 'Red Bird Restless Graveyard',
        subtitle: 'Fog, flicker, and friendly frights among the headstones.',
        address: '3821 SW 60th Ave, Miami, FL 33155',
        icon: '/assets/img/icons/tombstone-graveyard.svg',
        slug: 'red-bird-restless-graveyard'
      }
    ];
  }
}

// --- Render ---
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('house-grid');
  if (!grid) return;

  const houses = await loadHouses();
  
  const houseTemplate = (h) => `
    <li class="house-card">
      <img src="${h.icon}" alt="" width="64" height="64" loading="lazy" decoding="async" onerror="this.src='/assets/img/icons/haunted-house.svg'">
      <div class="house-meta">
        <h4>${h.title}</h4>
        <p class="house-sub">${h.subtitle}</p>
        <address>${h.address}</address>
      </div>
    </li>
  `;

  grid.innerHTML = houses.map(houseTemplate).join('');
  
  // Animate the cards as they appear
  if (window.gsap && window.ScrollTrigger) {
    gsap.from(".house-card", {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".featured-houses",
        start: "top 80%",
        toggleActions: "play none none none"
      }
    });
  }
});
