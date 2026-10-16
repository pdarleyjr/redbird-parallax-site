// Bottom sheets: nearest house, house details, and the "which house?" chooser. textContent only.
import { compassLabel, formatDistance } from '../../../shared/geo.mjs';
import { directionsURL, isApplePlatform } from '../../../shared/directions.mjs';

const NS = 'http://www.w3.org/2000/svg';
let root = null;

function container() {
  if (!root) {
    root = document.createElement('section');
    root.className = 'sheet'; root.hidden = true; root.id = 'house-sheet';
    document.body.append(root);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !root.hidden) hideSheet(); });
  }
  return root;
}
const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
const button = (label, handler, className) => { const b = el('button', className, label); b.type = 'button'; b.addEventListener('click', handler); return b; };

function arrow(degrees) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 56 56'); svg.setAttribute('class', 'arrow'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M28 4l16 40-16-9-16 9z');
  svg.append(path);
  svg.style.transform = `rotate(${Math.round(degrees)}deg)`;
  return svg;
}

export function hideSheet() { if (root) { root.hidden = true; root.replaceChildren(); delete root.dataset.kind; delete root.dataset.sig; } }

function frame(title) {
  const r = container(); r.replaceChildren(); r.hidden = false;
  r.setAttribute('aria-label', title);
  r.append(button('×', hideSheet, 'close'));
  r.lastChild.setAttribute('aria-label', 'Close');
  return r;
}

function directionsLink(house) {
  const a = el('a', null, 'Walking directions ↗');
  a.href = directionsURL(house, isApplePlatform(navigator.userAgent, navigator.platform));
  a.target = '_blank'; a.rel = 'noopener';
  return a;
}

export function showNearest({ entry, visited, compass, onShow, onVisited, onNext, onCompass }) {
  const { house, meters, bearing } = entry;
  const shown = compass.heading == null ? bearing : (bearing - compass.heading + 360) % 360;
  const subText = `About ${formatDistance(meters)} · ${compassLabel(bearing)} (straight-line)${compass.heading == null ? ' · arrow points north-up' : ''}`;
  const sig = [house.id, visited, compass.supported, compass.on].join('|');
  if (root && !root.hidden && root.dataset.kind === 'nearest' && root.dataset.sig === sig) { // same house: update in place so focus and taps are not lost
    root.querySelector('.arrow').style.transform = `rotate(${Math.round(shown)}deg)`; root.querySelector('.sub').textContent = subText;
    return;
  }
  const r = frame('Nearest house');
  r.dataset.kind = 'nearest'; r.dataset.sig = sig;
  const wrap = el('div', 'arrow-wrap');
  wrap.append(arrow(shown));
  const text = el('div');
  text.append(el('h3', null, `Nearest: #${house.mapNumber} ${house.name}`));
  text.append(el('p', 'sub', subText));
  wrap.append(text);
  r.append(wrap);
  const row = el('div', 'row');
  row.append(button('Show on map', () => onShow(house.id), 'main'));
  row.append(button(visited ? 'Visited ✓ (undo)' : 'Mark visited', () => onVisited(house.id, !visited)));
  row.append(button('Next nearest', onNext));
  row.append(directionsLink(house));
  r.append(row);
  if (compass.supported) {
    const toggle = button(compass.on ? 'Stop using compass' : 'Point arrow using compass', onCompass);
    toggle.setAttribute('aria-pressed', String(compass.on));
    r.append(toggle);
  }
  r.append(el('p', 'note', 'Opens your maps app. Check that the route is safe to walk.'));
}

export function showHouse({ house, visited, onVisited }) {
  const r = frame(`Stop ${house.mapNumber}`);
  r.append(el('h3', null, `#${house.mapNumber} ${house.name}`));
  r.append(el('p', 'sub', house.address));
  if (house.description) r.append(el('p', null, house.description));
  if (house.location === 'approximate') r.append(el('p', 'note', 'Location approximate.'));
  const row = el('div', 'row');
  row.append(button(visited ? 'Visited ✓ (undo)' : 'Mark visited', () => onVisited(house.id, !visited), 'main'));
  if (house.location !== 'none') row.append(directionsLink(house));
  r.append(row);
}

export function showChooser({ houses, onPick }) {
  const r = frame('Choose a house');
  r.append(el('h3', null, 'Several houses are close together'));
  const row = el('div', 'row');
  for (const h of houses) row.append(button(`#${h.mapNumber} ${h.name}`, () => onPick(h.id)));
  r.append(row);
}

/** A small sheet of links (used by the mobile "Print" entry). */
export function showLinks({ title, links }) {
  const r = frame(title);
  r.append(el('h3', null, title));
  const row = el('div', 'row');
  for (const { label, href, main } of links) {
    const a = el('a', main ? 'main' : null, label);
    a.href = href;
    row.append(a);
  }
  r.append(row);
  r.querySelector('a')?.focus();
}
