// The one compact house list used in the Houses view and in the map dock: same rows, same search, filter and sort.
// Rows are buttons (tap = show that house on the map) with a visited checkbox. Built with textContent only.
import { iconURL } from '../../../shared/icon-url.mjs';
import { formatDistance } from '../../../shared/geo.mjs';

const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };

/** Shared state for every list and its tools (search text, filter, sort, visited set, distances). */
export function createListStore({ houses }) {
  const state = { houses, query: '', filter: 'all', sort: 'number', visited: new Set(), distances: new Map(), selected: null };
  const subs = new Set();
  const emit = () => subs.forEach(fn => fn(state));
  return {
    state,
    subscribe: fn => { subs.add(fn); return () => subs.delete(fn); },
    set(patch) { Object.assign(state, patch); emit(); },
    setHouses(next) { state.houses = next; emit(); },
    setDistances(map) { state.distances = map; if (!map.size && state.sort === 'nearest') state.sort = 'number'; emit(); }
  };
}

/** Houses that match the store's search and filter, in the store's order. */
export function visibleHouses(state) {
  const q = state.query.trim().toLocaleLowerCase();
  let list = state.houses.filter(h => (!q || `${h.mapNumber} ${h.name} ${h.address}`.toLocaleLowerCase().includes(q))
    && (state.filter === 'all' || (state.filter === 'visited') === state.visited.has(h.id)));
  if (state.sort === 'nearest' && state.distances.size) list = [...list].sort((a, b) => (state.distances.get(a.id) ?? Infinity) - (state.distances.get(b.id) ?? Infinity) || a.mapNumber - b.mapNumber);
  else list = [...list].sort((a, b) => a.mapNumber - b.mapNumber);
  return list;
}

function buildRow(house, { root, state, onSelect, onVisited }) {
  const visited = state.visited.has(house.id), meters = state.distances.get(house.id);
  const li = el('li', `hrow house-card${visited ? ' is-visited' : ''}${state.selected === house.id ? ' is-selected' : ''}${state.pulse === house.id ? ' just-visited' : ''}`);
  li.dataset.id = house.id; li.dataset.n = house.mapNumber;
  const main = el('button', 'hr-main'); main.type = 'button'; main.dataset.id = house.id;
  const art = el('span', 'hr-art');
  const img = el('img'); img.alt = ''; img.width = 40; img.height = 40; img.loading = 'lazy'; img.decoding = 'async';
  img.src = iconURL(house.icon, root, { small: true });
  img.addEventListener('error', () => img.remove(), { once: true });
  const n = el('span', 'hr-n'); n.append(el('span', 'sr-only', 'Stop '), document.createTextNode(String(house.mapNumber)));
  art.append(img, n);
  const text = el('span', 'hr-t');
  text.append(el('b', null, house.name), el('small', null, house.location === 'none' ? `${house.address} · map location coming soon` : house.address));
  main.append(art, text);
  if (meters != null) main.append(el('span', 'hr-dist', formatDistance(meters)));
  if (visited) main.append(el('span', 'sr-only', ', visited'));
  main.addEventListener('click', () => onSelect(house.id));
  const label = el('label', 'hr-check');
  const box = el('input'); box.type = 'checkbox'; box.dataset.visited = ''; box.checked = visited;
  box.setAttribute('aria-label', `Mark ${house.name} visited`);
  box.addEventListener('change', () => onVisited(house.id, box.checked, li));
  label.append(box);
  li.append(main, label);
  return li;
}

/** Fills `ol` with the store's rows and keeps it in sync. Returns { render, destroy }. */
export function bindHouseList({ ol, store, root, onSelect, onVisited, emptyText = 'No houses match.', emptyEl = null }) {
  const render = () => {
    const rows = visibleHouses(store.state);
    const a = document.activeElement, keep = a && ol.contains(a) && a.closest('li[data-id]') ? { id: a.closest('li').dataset.id, input: a.matches('input') } : null;   // keep keyboard focus across a re-render
    ol.replaceChildren(...rows.map(h => buildRow(h, { root, state: store.state, onSelect, onVisited })));
    if (emptyEl) emptyEl.hidden = rows.length > 0;
    else if (!rows.length) { const li = el('li', 'hlist-empty', emptyText); ol.append(li); }
    if (keep) ol.querySelector(`li[data-id="${keep.id}"] ${keep.input ? 'input' : '.hr-main'}`)?.focus({ preventScroll: true });
  };
  render();
  const off = store.subscribe(render);
  return { render, destroy: off };
}

/** Wires one tools block (search box, filter chips, sort chips) to the store. */
export function bindListTools({ tools, store }) {
  const input = tools.querySelector('.list-search');
  const chips = [...tools.querySelectorAll('[data-filter]')];
  const toggle = tools.querySelector('[data-sort-toggle]');
  const paint = state => {
    if (input && input.value !== state.query) input.value = state.query;
    for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.filter === state.filter));
    if (toggle) {
      const nearest = state.sort === 'nearest' && state.distances.size > 0;
      toggle.textContent = `Sort: ${nearest ? 'Nearest' : 'Number'}`;
      toggle.setAttribute('aria-label', `Sort: ${nearest ? 'Nearest' : 'Number'}. ${state.distances.size ? 'Change sort order' : 'Turn on location to sort by distance'}`);
      toggle.setAttribute('aria-disabled', String(!state.distances.size));
    }
  };
  input?.addEventListener('input', () => store.set({ query: input.value }));
  tools.addEventListener('click', event => {
    const c = event.target.closest('[data-filter],[data-sort-toggle]');
    if (!c) return;
    if (c.dataset.filter) store.set({ filter: c.dataset.filter });
    else if (store.state.distances.size) store.set({ sort: store.state.sort === 'nearest' ? 'number' : 'nearest' });
    else store.emitMessage?.('Turn on location to sort by distance.');
  });
  paint(store.state);
  return store.subscribe(paint);
}
