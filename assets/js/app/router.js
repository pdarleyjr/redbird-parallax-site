// Hash routes for the four views: #map, #houses, #info, #more (plus #house-stop-N = the map with that house selected).
// Old anchors from the long page keep working and are rewritten to the new route. The back button walks through the views.
export const VIEWS = ['map', 'houses', 'info', 'more'];
export const LEGACY = {
  hero: 'map', nearest: 'map', 'what-to-expect': 'info', 'how-it-works': 'info',
  'featured-houses': 'houses', 'house-list': 'houses', printables: 'more', 'get-app': 'more'
};
const SUFFIX = 'Red Bird Trick-or-Treat Trail';

/** @returns {{view: string, houseId: string|null, canonical: string|null}} canonical is set when the hash should be rewritten. */
export function parseHash(hash) {
  const id = String(hash || '').replace(/^#/, '');
  if (!id) return { view: 'map', houseId: null, canonical: null };
  if (VIEWS.includes(id)) return { view: id, houseId: null, canonical: null };
  const house = id.match(/^house-(stop-\d+)$/);
  if (house) return { view: 'map', houseId: house[1], canonical: null };
  if (LEGACY[id]) return { view: LEGACY[id], houseId: null, canonical: `#${LEGACY[id]}` };
  return { view: 'map', houseId: null, canonical: null };
}

export function initRouter({ onChange, reducedMotion }) {
  const views = Object.fromEntries(VIEWS.map(v => [v, document.getElementById(v)]));
  const tabs = [...document.querySelectorAll('#tabbar a[data-tab]')];
  let current = null;

  const apply = (view, houseId, first) => {
    document.body.dataset.view = view;
    for (const v of VIEWS) if (v !== 'map') views[v].hidden = v !== view;   // the map view and the dock are shown by CSS (the desktop layout keeps the map on screen)
    for (const t of tabs) { if (t.dataset.tab === view) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); }
    document.title = `${views[view].dataset.title} · ${SUFFIX} 2026`;
    if (!first) views[view].focus({ preventScroll: true });
    if (view !== 'map') views[view].scrollTop = 0;
    onChange({ view, houseId, previous: current, first });
    current = view;
  };

  const route = first => {
    const { view, houseId, canonical } = parseHash(location.hash);
    if (canonical) history.replaceState(null, '', canonical);
    const run = () => apply(view, houseId, first);
    if (!first && view !== current && !reducedMotion && document.startViewTransition) document.startViewTransition(run); else run();
  };
  addEventListener('hashchange', () => route(false));
  route(true);
  return { go: (view, houseId) => { const next = houseId ? `#house-${houseId}` : `#${view}`; if (location.hash === next) route(false); else location.hash = next; }, current: () => current };
}
