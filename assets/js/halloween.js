// The Halloween page as a small app: four views (Map, Houses, Info, More), one list, one dock, one visited store.
import { loadSnapshots, siteRoot } from './data.js';
import { getVisited, setVisited, resetVisited, onVisitedChange, prune, storageAvailable } from './visited.js';
import { webgl2Available } from './map/loader.js';
import { nearest } from '../../shared/geo.mjs';
import { configureIcons } from '../../shared/icon-url.mjs';
import { createLocator } from './map/locate.js';
import { showNearest, showHouse, showChooser, showPrompt } from './map/sheet.js';
import { compassSupported, startCompass, stopCompass, currentHeading } from './map/compass.js';
import { initPwa } from './pwa.js';
import { initInstallSection, isStandalone } from './install.js';
import { initRouter } from './app/router.js';
import { initDock } from './app/dock.js';
import { createListStore, bindHouseList, bindListTools } from './app/hlist.js';
import { initAppPrint } from './app/print-sheet.js';

const $ = selector => document.querySelector(selector);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 1024px)');

const setStatus = text => { $('#map-status').textContent = text; };
const announce = text => { const n = $('#announce'); n.textContent = ''; setTimeout(() => { n.textContent = text; }, 30); };

async function main() {
  initPwa();
  initInstallSection();
  if (isStandalone()) { const section = $('#get-app'); if (section) section.hidden = true; }
  const banner = $('#offline-banner');
  const online = () => { banner.hidden = navigator.onLine; banner.textContent = navigator.onLine ? '' : 'You’re offline. Showing houses saved on this device.'; };
  addEventListener('online', online); addEventListener('offline', online); online();

  const config = JSON.parse($('#event-config').textContent);
  configureIcons(config.apiBase);
  const { bundled, livePromise } = await loadSnapshots({ snapshotPath: config.houses.path, apiBase: config.apiBase, eventId: 'halloween-2026', onLive: live => update(live) });
  let snapshot = bundled;
  const appPrint = initAppPrint({ getSnapshot: () => snapshot });
  let view = null, viewPromise = null, ranking = [], offset = 0, position = null, compassOn = false, firstDistances = true;
  const root = siteRoot.href;
  const houseById = id => snapshot.houses.find(h => h.id === id);
  prune(new Set(snapshot.houses.map(h => h.id)));

  // ---- list, tools and progress ----
  const store = createListStore({ houses: snapshot.houses });
  store.set({ visited: getVisited() });
  const markVisited = (id, on, row) => {
    setVisited(id, on);
    if (!on) return;
    navigator.vibrate?.(15);
    const house = houseById(id);
    store.set({ pulse: id });
    setTimeout(() => store.set({ pulse: null }), 700);
    const n = visitedCount();
    announce(`Marked ${house?.name ?? 'house'} visited. ${n} of ${snapshot.houses.length}.`);
    if (n === snapshot.houses.length) { setStatus('You visited every house! 🎃'); announce('You visited every house!'); }
    void row;
  };
  const visitedCount = () => [...getVisited()].filter(id => snapshot.houses.some(h => h.id === id)).length;
  let lastCount = visitedCount();
  const progress = () => {
    const n = visitedCount(), total = snapshot.houses.length, ring = $('#progress-ring');
    $('#ring-fill').setAttribute('stroke-dasharray', `${total ? Math.round((n / total) * 1000) / 10 : 0} 100`);
    $('#ring-text').textContent = `${n}/${total}`;
    ring.setAttribute('aria-label', `${n}/${total} houses visited`);
    ring.classList.toggle('is-done', total > 0 && n === total);
    if (n > lastCount && !reducedMotion) { ring.classList.remove('pulse'); void ring.offsetWidth; ring.classList.add('pulse'); }
    lastCount = n;
    $('#visited-count').textContent = `${n} of ${total} visited`;
    $('#house-count').textContent = `${total} ${total === 1 ? 'house' : 'houses'} on the trail`;
  };

  const selectFromList = async id => { router.go('map', id); };
  const dockList = bindHouseList({ ol: $('#map-house-list'), store, root, onSelect: id => selectHouse(id), onVisited: markVisited });
  bindHouseList({ ol: $('#house-list'), store, root, onSelect: selectFromList, onVisited: markVisited, emptyEl: $('#house-empty') });
  for (const tools of document.querySelectorAll('[data-list-tools]')) bindListTools({ tools, store });
  $('#house-controls').hidden = false; $('#visited-row').hidden = false; $('#reset-block').hidden = false;
  if (!storageAvailable()) $('#house-status').textContent = 'Visited marks work for this visit only because your browser blocks saved data.';
  $('#visited-reset').addEventListener('click', () => { $('#reset-confirm').hidden = false; $('#reset-cancel').focus(); });
  $('#reset-cancel').addEventListener('click', () => { $('#reset-confirm').hidden = true; $('#visited-reset').focus(); });
  $('#reset-yes').addEventListener('click', () => { resetVisited(); $('#reset-confirm').hidden = true; announce('Visited marks cleared.'); $('#visited-reset').focus(); });
  progress();

  // ---- first-visit map hint: shown once, gone after the first tap on the map or 6 s ----
  const hint = $('#map-legend'), HINT_KEY = 'rb-map-hint-seen-2026';
  let hintSeen = false;
  try { hintSeen = localStorage.getItem(HINT_KEY) === '1'; } catch { /* storage blocked: show it every visit */ }
  if (hintSeen) hint.hidden = true;
  else {
    const dismiss = () => { hint.hidden = true; try { localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ } };
    setTimeout(dismiss, 6000);
    $('#map-canvas').addEventListener('pointerdown', dismiss, { once: true });
  }

  // ---- dock and map ----
  const dock = initDock({ onState: () => view?.refresh() });
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
      container: $('#map-canvas'), snapshot, reducedMotion, getInsets: () => dock.insets(),
      onSelect: id => selectHouse(id), onChoose: ids => showChooser({ houses: ids.map(houseById), onPick: id => selectHouse(id) })
    })).then(v => { view = v; v.setSnapshot(snapshot); v.setVisited(getVisited()); setStatus(''); $('#map-poster')?.setAttribute('hidden', ''); navigator.serviceWorker?.controller?.postMessage({ type: 'warm-map' }); return v; })
      .catch(error => { console.error(error); setStatus('The interactive map couldn’t load. You can still use the house list.'); return null; });
    return viewPromise;
  };

  async function selectHouse(id, fly = true) {
    const v = await loadMap();
    const house = houseById(id);
    if (!house) return;
    store.set({ selected: id });
    v?.select(id, { fly });
    showHouse({ house, visited: getVisited().has(id), root, onVisited: (hid, on) => { markVisited(hid, on); selectHouse(hid, false); } });
    if (dock.get() !== 'peek') dock.set('peek');
  }

  function renderNearest() {
    if (!position) return;
    const visited = getVisited();
    ranking = nearest(snapshot.houses, position, new Set());
    store.setDistances(new Map(ranking.map(r => [r.house.id, r.meters])));
    if (firstDistances) { firstDistances = false; store.set({ sort: 'nearest' }); }
    const open = nearest(snapshot.houses, position, visited);
    if (!open.length) { setStatus('You’ve visited every house on your list! 🎃'); view?.setNearest(null); return; }
    const entry = open[offset % open.length];
    view?.setNearest(entry.house.id);
    if ($('#house-sheet').dataset.kind === 'house' || $('#house-sheet').dataset.kind === 'chooser') return;   // do not cover a house the visitor is reading
    showNearest({
      entry, visited: visited.has(entry.house.id), compass: { supported: compassSupported(), on: compassOn, heading: compassOn ? currentHeading() : null }, root,
      onShow: id => selectHouse(id), onVisited: (id, on) => { markVisited(id, on); offset = 0; },
      onNext: () => { offset += 1; renderNearest(); },
      onCompass: async () => { if (compassOn) { stopCompass(); compassOn = false; renderNearest(); } else { compassOn = await startCompass(() => renderNearest()); if (!compassOn) setStatus('Compass isn’t available, so the arrow points north-up.'); renderNearest(); } }
    });
  }
  const showDefault = () => { if (position) renderNearest(); else showPrompt({ onLocate: locate }); };
  $('#house-sheet').addEventListener('sheet:hidden', () => { store.set({ selected: null }); view?.select(null, { fly: false }); showDefault(); });

  const locator = createLocator({
    ring: snapshot.boundary.coordinates[0],
    onStatus: setStatus,
    onPosition: p => { const first = !position; position = p; view?.setUser(p); if (first) view?.follow(p); renderNearest(); }
  });
  async function locate() {
    router.go('map');
    await loadMap();
    setStatus(locator.active() ? '' : 'Finding your location…');
    if (locator.start()) { $('#locate-button').setAttribute('aria-pressed', 'true'); document.documentElement.dataset.tracking = '1'; }
  }
  function update(next) {
    snapshot = next; store.setHouses(next.houses); view?.setSnapshot(next); appPrint.refresh();
    progress();
    renderNearest();
  }
  livePromise.then(live => {
    if (live !== null) return;
    const when = new Date(bundled.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    banner.textContent = `Showing the house list saved on ${when}. Live updates are unavailable right now.`; banner.hidden = false;
  });

  onVisitedChange(set => { store.set({ visited: set }); progress(); view?.setVisited(set); renderNearest(); });
  $('#locate-button').addEventListener('click', locate);
  $('#zoom-in').addEventListener('click', async () => (await loadMap())?.zoom(1));
  $('#zoom-out').addEventListener('click', async () => (await loadMap())?.zoom(-1));
  $('#show-all').addEventListener('click', async () => (await loadMap())?.fitAll());

  // ---- routes ----
  let router;
  router = initRouter({
    reducedMotion,
    onChange: async ({ view: name, houseId }) => {
      if (name === 'map' || desktop.matches) {
        const v = await loadMap();
        v?.resize();
        if (houseId) selectHouse(houseId);
      }
      document.body.dataset.dockReady = '1';
    }
  });
  if (desktop.matches) loadMap();
  showDefault();
  void dockList;
}

main().catch(error => {
  console.error(error);
  const status = $('#house-status'); if (status) status.textContent = 'Something went wrong loading the house directory. Please refresh.';
});
