import { loadSnapshots, siteRoot } from './data.js';
import { initHouses } from './houses.js';
import { getVisited, setVisited, onVisitedChange } from './visited.js';
import { webgl2Available } from './map/loader.js';
import { nearest } from '../../shared/geo.mjs';
import { createLocator } from './map/locate.js';
import { showNearest, showHouse, showChooser, hideSheet } from './map/sheet.js';
import { compassSupported, startCompass, stopCompass, currentHeading } from './map/compass.js';
import { initPwa } from './pwa.js';

const $ = selector => document.querySelector(selector);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function initMenu() {
  const toggle = $('#menu-toggle'), close = $('#menu-close'), nav = $('#site-nav'), header = document.querySelector('.site-header');
  const small = matchMedia('(max-width: 959px)');
  const set = (open, focus = true) => {
    document.body.classList.toggle('menu-open', open); header.classList.toggle('menu-ready', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (focus) (open ? nav.querySelector('a') : toggle).focus();
  };
  const sync = () => { toggle.hidden = !small.matches; close.hidden = !small.matches; if (!small.matches) set(false, false); };
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
  close.addEventListener('click', () => set(false));
  nav.addEventListener('click', event => { if (event.target.closest('a')) set(false, false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') set(false); });
  small.addEventListener('change', sync); sync();
}

function setStatus(text) { $('#map-status').textContent = text; }

async function main() {
  initMenu();
  initPwa();
  const config = JSON.parse($('#event-config').textContent);
  const { bundled, livePromise } = await loadSnapshots({ snapshotPath: config.houses.path, apiBase: config.apiBase, eventId: 'halloween-2026', onLive: live => update(live) });
  let snapshot = bundled;
  let view = null, viewPromise = null, ranking = [], offset = 0, position = null, includeVisited = false, compassOn = false;
  const root = siteRoot.href;
  const houseById = id => snapshot.houses.find(h => h.id === id);
  const houses = initHouses({ snapshot, root, onShow: id => openHouse(id) });

  const loadMap = () => {
    if (viewPromise) return viewPromise;
    if (!webgl2Available()) {
      const note = document.createElement('p'); note.className = 'map-fallback'; note.setAttribute('role', 'status');
      note.textContent = 'Interactive map isn’t supported on this device. Use the house list to find each stop.';
      $('#map-stage').append(note); const poster = $('#map-poster'); if (poster) poster.hidden = false;
      setStatus('Interactive map isn’t supported on this device. Use the house list to find each stop.');
      viewPromise = Promise.resolve(null); return viewPromise;
    }
    setStatus('Loading the map…');
    viewPromise = import('./map/map-view.js').then(m => m.createMapView({
      container: $('#map-canvas'), snapshot, reducedMotion,
      onSelect: id => selectHouse(id), onChoose: ids => showChooser({ houses: ids.map(houseById), onPick: id => selectHouse(id) })
    })).then(v => { view = v; v.setSnapshot(snapshot); v.setVisited(getVisited()); setStatus(''); navigator.serviceWorker?.controller?.postMessage({ type: 'warm-map' }); return v; })
      .catch(error => { console.error(error); setStatus('The interactive map couldn’t load. You can still use the house list.'); return null; });
    return viewPromise;
  };
  async function selectHouse(id, fly = true) {
    const v = await loadMap();
    const house = houseById(id);
    if (!house) return;
    v?.select(id, { fly });
    for (const b of document.querySelectorAll('#map-house-list button')) b.setAttribute('aria-current', String(b.dataset.id === id));
    showHouse({ house, visited: getVisited().has(id), onVisited: (hid, on) => { setVisited(hid, on); selectHouse(hid, false); } });
  }
  async function openHouse(id) {
    $('#map').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    await selectHouse(id);
  }
  function renderNearest() {
    if (!position) return;
    const visited = getVisited();
    ranking = nearest(snapshot.houses, position, includeVisited ? new Set() : visited);
    if (!ranking.length) { setStatus('You’ve visited every house on your list! 🎃'); hideSheet(); view?.setNearest(null); return; }
    const entry = ranking[offset % ranking.length];
    view?.setNearest(entry.house.id);
    showNearest({
      entry, visited: visited.has(entry.house.id), compass: { supported: compassSupported(), on: compassOn, heading: compassOn ? currentHeading() : null },
      onShow: id => selectHouse(id), onVisited: (id, on) => { setVisited(id, on); offset = 0; },
      onNext: () => { offset += 1; renderNearest(); },
      onCompass: async () => { if (compassOn) { stopCompass(); compassOn = false; renderNearest(); } else { compassOn = await startCompass(() => renderNearest()); if (!compassOn) setStatus('Compass isn’t available, so the arrow points north-up.'); renderNearest(); } }
    });
  }
  const locator = createLocator({
    ring: snapshot.boundary.coordinates[0],
    onStatus: setStatus,
    onPosition: p => { const first = !position; position = p; view?.setUser(p); if (first) view?.follow(p); renderNearest(); }
  });
  async function locate() {
    $('#map').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    await loadMap();
    setStatus(locator.active() ? '' : 'Finding your location…');
    if (locator.start()) { $('#locate-button').setAttribute('aria-pressed', 'true'); document.documentElement.dataset.tracking = '1'; }
  }
  function update(next) {
    snapshot = next; houses.update(next); view?.setSnapshot(next);
    const list = $('#map-house-list');
    if (list) list.dataset.version = String(next.version);
    renderNearest();
  }
  void livePromise;

  onVisitedChange(set => { view?.setVisited(set); renderNearest(); });
  $('#locate-button').addEventListener('click', locate);
  $('#bar-near').addEventListener('click', locate);
  $('#zoom-in').addEventListener('click', async () => (await loadMap())?.zoom(1));
  $('#zoom-out').addEventListener('click', async () => (await loadMap())?.zoom(-1));
  $('#show-all').addEventListener('click', async () => (await loadMap())?.fitAll());
  $('#map-house-list').addEventListener('click', event => { const b = event.target.closest('button[data-id]'); if (b) selectHouse(b.dataset.id); });
  new IntersectionObserver((entries, observer) => { if (entries.some(e => e.isIntersecting)) { loadMap(); observer.disconnect(); } }, { rootMargin: '400px' }).observe($('#map'));
  const match = location.hash.match(/^#house-(stop-\d+)$/);
  if (match) openHouse(match[1]);

  const banner = $('#offline-banner');
  const online = () => { banner.hidden = navigator.onLine; banner.textContent = navigator.onLine ? '' : 'You’re offline. Showing houses saved on this device.'; };
  addEventListener('online', online); addEventListener('offline', online); online();
}

main().catch(error => {
  console.error(error);
  const status = $('#house-status'); if (status) status.textContent = 'Something went wrong loading the house directory. Please refresh.';
});
