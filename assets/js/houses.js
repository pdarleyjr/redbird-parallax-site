// House directory: server-rendered in HTML, enhanced here (search, visited, show on map, live refresh).
import { getVisited, setVisited, resetVisited, onVisitedChange, prune, storageAvailable } from './visited.js';

const $ = selector => document.querySelector(selector);

function buildCard(house, root) {
  const li = document.createElement('li');
  li.className = 'house-card'; li.id = `house-${house.id}`; li.dataset.id = house.id; li.dataset.n = house.mapNumber;
  const main = document.createElement('div'); main.className = 'house-main';
  const art = document.createElement('div'); art.className = 'house-art';
  const img = document.createElement('img');
  img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.width = 80; img.height = 80; // set loading before src, or the image starts fetching immediately
  img.src = `${root}assets/img/markers/${house.icon}.webp`;
  img.addEventListener('error', () => img.remove(), { once: true });
  const number = document.createElement('span'); number.className = 'stop-number'; number.textContent = house.mapNumber;
  number.setAttribute('aria-label', `Map stop ${house.mapNumber}`);
  art.append(img, number);
  const copy = document.createElement('div');
  const h3 = document.createElement('h3'); h3.textContent = house.name;
  const address = document.createElement('p'); address.textContent = house.address;
  copy.append(h3, address);
  if (house.location === 'none') { const soon = document.createElement('p'); soon.className = 'muted'; soon.textContent = 'Map location coming soon'; copy.append(soon); }
  main.append(art, copy);
  const actions = document.createElement('div'); actions.className = 'house-actions'; actions.hidden = true;
  if (house.location !== 'none') {
    const show = document.createElement('button'); show.type = 'button'; show.dataset.show = '';
    show.textContent = 'Show on map';
    const hidden = document.createElement('span'); hidden.className = 'sr-only'; hidden.textContent = ` for ${house.name}`;
    show.append(hidden); actions.append(show);
  }
  const label = document.createElement('label');
  const box = document.createElement('input'); box.type = 'checkbox'; box.dataset.visited = ''; box.setAttribute('aria-label', `Mark ${house.name} visited`);
  label.append(box, document.createTextNode(' Visited'));
  actions.append(label);
  li.append(main, actions);
  return li;
}

export function initHouses({ snapshot, root, onShow }) {
  const list = $('#house-list'), controls = $('#house-controls'), search = $('#house-search');
  const status = $('#house-status'), empty = $('#house-empty'), count = $('#house-count');
  const row = $('#visited-row'), visitedCount = $('#visited-count');
  let houses = snapshot.houses;

  const renderCount = () => {
    const n = houses.length;
    count.textContent = `${n} ${n === 1 ? 'house' : 'houses'} on the trail`;
  };
  const sync = () => {
    const visited = getVisited();
    for (const li of list.children) {
      const on = visited.has(li.dataset.id);
      li.classList.toggle('is-visited', on);
      const box = li.querySelector('[data-visited]'); if (box) box.checked = on;
    }
    visitedCount.textContent = `${[...visited].filter(id => houses.some(h => h.id === id)).length} of ${houses.length} visited`;
  };
  const filter = () => {
    const q = search.value.trim().toLocaleLowerCase();
    let shown = 0;
    for (const li of list.children) {
      const h = houses.find(x => x.id === li.dataset.id);
      const match = !q || `${h.mapNumber} ${h.name} ${h.address}`.toLocaleLowerCase().includes(q);
      li.hidden = !match; if (match) shown++;
    }
    empty.hidden = shown > 0;
  };
  const enhance = () => {
    for (const actions of list.querySelectorAll('.house-actions')) actions.hidden = false;
    controls.hidden = false; row.hidden = false;
    sync(); filter();
  };
  const render = next => {
    if (JSON.stringify(next.houses) === JSON.stringify(houses) && list.children.length === houses.length) { list.dataset.version = String(next.version); return; } // same content: keep the DOM
    houses = next.houses;
    list.replaceChildren(...houses.map(h => buildCard(h, root)));
    list.dataset.version = String(next.version);
    renderCount(); enhance();
  };

  prune(new Set(houses.map(h => h.id)));
  if (Number(list.dataset.version) !== snapshot.version || list.children.length !== houses.length) render(snapshot); else enhance();
  if (!storageAvailable()) status.textContent = 'Visited marks work for this visit only because your browser blocks saved data.';
  search.addEventListener('input', filter);
  list.addEventListener('change', event => { const li = event.target.closest('.house-card'); if (li && event.target.matches('[data-visited]')) setVisited(li.dataset.id, event.target.checked); });
  list.addEventListener('click', event => { const li = event.target.closest('.house-card'); if (li && event.target.closest('[data-show]')) onShow(li.dataset.id); });
  $('#visited-reset').addEventListener('click', resetVisited);
  onVisitedChange(sync);
  return { update: render };
}
