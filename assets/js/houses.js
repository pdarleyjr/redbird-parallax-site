import { approvedHouses, localAsset } from './content.js';

export async function initHouses(event) {
  const grid = document.querySelector('#house-list');
  const status = document.querySelector('#house-status');
  const search = document.querySelector('#house-search');
  const controls = document.querySelector('#house-controls');
  const message = text => { status.textContent = text; grid.replaceChildren(); controls.hidden = true; };
  if (event.houses?.status !== 'approved') {
    message('The participating-house directory will be announced here once it is approved.');
    return;
  }
  try {
    const path = localAsset(event.houses.path, 'data/');
    if (!path) throw new Error('Invalid roster path');
    const response = await fetch(path);
    if (!response.ok) throw new Error('Directory unavailable');
    const houses = approvedHouses(await response.json(), event.year);
    if (!houses.length) { message('The participating-house directory will be announced here once it is approved.'); return; }
    const render = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const filtered = houses.filter(h => `${h.mapNumber} ${h.name} ${h.address}`.toLocaleLowerCase().includes(query));
      const fragment = document.createDocumentFragment();
      for (const house of filtered) {
        const li = document.createElement('li');
        li.className = 'house-card';
        const art = document.createElement('div'); art.className = 'house-art';
        const number = document.createElement('span'); number.className = 'stop-number'; number.textContent = house.mapNumber;
        number.setAttribute('aria-label', `Map stop ${house.mapNumber}`);
        if (house.image) {
          const image = document.createElement('img');
          image.src = house.image; image.alt = ''; image.width = 96; image.height = 96;
          image.loading = 'lazy'; image.decoding = 'async';
          image.addEventListener('error', () => image.remove(), { once: true });
          art.append(image);
        }
        art.append(number);
        const copy = document.createElement('div');
        const title = document.createElement('h3'); title.textContent = house.name;
        const address = document.createElement('p'); address.textContent = house.address;
        copy.append(title, address); li.append(art, copy); fragment.append(li);
      }
      grid.replaceChildren(fragment);
      status.textContent = query ? `${filtered.length} of ${houses.length} stops match your search.` : `${houses.length} participating stops. Numbers match the trail map.`;
      document.querySelector('#house-empty').hidden = filtered.length !== 0;
    };
    controls.hidden = false;
    search.addEventListener('input', render);
    render();
  } catch {
    message('The house directory could not load. Please try refreshing, or use the directory on the full map.');
  }
}
