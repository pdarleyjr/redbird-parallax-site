// Themed icon pins for the live map (the flyer look): a glossy disc with the house's icon, a number tag, a needle and a ground dot.
// One DOM marker per located house. Heads are laid out by shared/pin-layout.mjs after the map settles; while the map moves the markers
// simply move with it.
import { layoutPins } from '../../../shared/pin-layout.mjs';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };

export const badgeRadius = () => (window.matchMedia('(min-width: 768px)').matches ? 20 : 18);

/** Map controls overlay the canvas; keep pin heads out from under them. */
function controlRects(el) {
  const box = el.getBoundingClientRect();
  return [...el.parentElement.querySelectorAll('.map-controls button, .maplibregl-ctrl')].map(c => c.getBoundingClientRect())
    .filter(r => r.width && r.height).map(r => ({ x: r.x - box.x, y: r.y - box.y, width: r.width, height: r.height }));
}

export function createPins({ map, maplibre, houses, root, onSelect }) {
  let pins = new Map();           // id -> { house, wrapper, button, tag, line, marker }
  let selected = null, nearest = null, visited = new Set();
  let frame = 0;

  const build = house => {
    const wrapper = document.createElement('div');
    wrapper.className = `pin${house.location === 'approximate' ? ' is-approx' : ''}`;
    const needle = svgEl('svg', { class: 'pin-needle', width: 1, height: 1, 'aria-hidden': 'true', focusable: 'false' });
    const shadow = svgEl('ellipse', { cx: 2.4, cy: 1, rx: 5, ry: 1.9, class: 'pin-shadow' });
    const line = svgEl('line', { x1: 0, y1: -30, x2: 0, y2: 0, class: 'pin-line' });
    const dot = svgEl('circle', { cx: 0, cy: 0, r: 2.4, class: 'pin-dot' });
    needle.append(shadow, line, dot);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'pin-head';
    button.setAttribute('aria-label', `Stop ${house.mapNumber}, ${house.name}, ${house.address}`);
    const disc = document.createElement('span'); disc.className = 'pin-disc';
    const img = document.createElement('img');
    img.alt = ''; img.width = 64; img.height = 64; img.decoding = 'async'; img.src = `${root}assets/img/markers/${house.icon}.webp`;
    disc.append(img);
    const tag = document.createElement('span'); tag.className = 'pin-num'; tag.textContent = String(house.mapNumber);
    button.append(disc, tag);
    button.addEventListener('click', () => onSelect(house.id));
    wrapper.append(needle, button);
    const marker = new maplibre.Marker({ element: wrapper, anchor: 'center' }).setLngLat([house.lng, house.lat]).addTo(map);
    return { house, wrapper, button, tag, line, marker };
  };

  const classes = p => {
    const { house, wrapper, tag } = p;
    const isVisited = visited.has(house.id);
    wrapper.classList.toggle('is-selected', selected === house.id);
    wrapper.classList.toggle('is-nearest', nearest === house.id);
    wrapper.classList.toggle('is-visited', isVisited);
    tag.textContent = isVisited ? '✓' : String(house.mapNumber);
    p.button.setAttribute('aria-label', `Stop ${house.mapNumber}, ${house.name}, ${house.address}${isVisited ? ', visited' : ''}`);
  };

  /** Re-run the layout for the current view. */
  function layout() {
    frame = 0;
    if (!pins.size) return;
    const el = map.getContainer();
    const R = badgeRadius();
    const list = [...pins.values()];
    const anchors = list.map(p => { const pt = map.project([p.house.lng, p.house.lat]); return { id: p.house.id, x: pt.x, y: pt.y }; });
    const result = layoutPins(anchors, { radius: R, bounds: { width: el.clientWidth, height: el.clientHeight }, avoid: controlRects(el) });
    result.forEach((r, i) => {
      const p = list[i];
      const dx = r.hx - r.ax, dy = r.hy - r.ay;
      p.wrapper.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      p.wrapper.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      p.wrapper.style.zIndex = String(Math.round(r.ay) + (selected === p.house.id ? 1000 : 0));
      p.line.setAttribute('x1', dx.toFixed(1)); p.line.setAttribute('y1', (dy + R - 1).toFixed(1));
    });
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(layout); };
  map.on('moveend', schedule); map.on('zoomend', schedule); map.on('resize', schedule);
  matchMedia('(min-width: 768px)').addEventListener('change', schedule);

  function set(list) {
    for (const p of pins.values()) p.marker.remove();
    pins = new Map();
    for (const house of [...list].filter(h => h.location !== 'none' && Number.isFinite(h.lat)).sort((a, b) => a.mapNumber - b.mapNumber)) {
      const p = build(house);
      pins.set(house.id, p); classes(p);
    }
    schedule();
  }
  set(houses);

  return {
    count: () => pins.size,
    setHouses: set,
    setSelected(id) { selected = id; for (const p of pins.values()) classes(p); schedule(); },
    setNearest(id) { nearest = id; for (const p of pins.values()) classes(p); },
    setVisited(set) { visited = new Set(set); for (const p of pins.values()) classes(p); },
    refresh: schedule,
    destroy() { for (const p of pins.values()) p.marker.remove(); pins = new Map(); }
  };
}
