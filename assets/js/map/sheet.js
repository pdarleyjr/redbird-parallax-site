// The card at the top of the map dock: the nearest house, one house's details, a "which house?" chooser, or a location prompt.
// It renders into #house-sheet (inside the dock). textContent only.
import { compassLabel, formatDistance } from '../../../shared/geo.mjs';
import { directionsURL, isApplePlatform } from '../../../shared/directions.mjs';
import { iconURL } from '../../../shared/icon-url.mjs';

const NS = 'http://www.w3.org/2000/svg';
const root = () => document.getElementById('house-sheet');
const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
const button = (label, handler, className) => { const b = el('button', className, label); b.type = 'button'; b.addEventListener('click', handler); return b; };

function arrowBox(degrees, northUp) {
  const box = el('span', 'arrow-box');
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', northUp ? 'Arrow points toward the house, with north at the top of the screen' : 'Arrow points toward the house');
  box.title = northUp ? 'Arrow points toward the house, north-up' : 'Arrow points toward the house';
  box.append(arrow(degrees));
  if (northUp) box.append(el('span', 'arrow-n', 'N'));
  return box;
}

function compassIcon() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attrs] of [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M15.5 8.5l-2 5-5 2 2-5z' }]]) {
    const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); svg.append(n);
  }
  return svg;
}

function arrow(degrees) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 56 56'); svg.setAttribute('class', 'arrow'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M28 4l16 40-16-9-16 9z');
  svg.append(path);
  svg.style.transform = `rotate(${Math.round(degrees)}deg)`;
  return svg;
}

/** Clears the card; the page then shows the nearest house or the location prompt again. */
export function hideSheet() { const r = root(); if (r) { r.replaceChildren(); delete r.dataset.kind; delete r.dataset.sig; r.dispatchEvent(new CustomEvent('sheet:hidden', { bubbles: true })); } }

function frame(title, { closable = false } = {}) {
  const r = root(); r.replaceChildren();
  r.setAttribute('aria-label', title);
  if (closable) { const c = button('×', hideSheet, 'close'); c.setAttribute('aria-label', 'Close'); r.append(c); }
  return r;
}

function directionsLink(house) {
  const a = el('a', null, 'Directions ↗');
  a.href = directionsURL(house, isApplePlatform(navigator.userAgent, navigator.platform));
  a.target = '_blank'; a.rel = 'noopener';
  a.setAttribute('aria-label', `Walking directions to ${house.name} (opens your maps app)`);
  return a;
}

function houseIcon(house, root0) {
  const wrap = el('span', 'hr-art');
  const img = el('img'); img.alt = ''; img.width = 40; img.height = 40; img.src = iconURL(house.icon, root0, { small: true });
  wrap.append(img, el('span', 'hr-n', String(house.mapNumber)));
  return wrap;
}

/** "Find my location" prompt, shown while the location is unknown. */
export function showPrompt({ onLocate, text = 'Find the nearest house. Your location stays on your phone.' }) {
  const r = frame('Find my location');
  r.dataset.kind = 'prompt';
  const wrap = el('div', 'prompt');
  wrap.append(el('p', null, text), button('Find my location', onLocate));
  r.append(wrap);
}

export function showNearest({ entry, visited, compass, root: siteRoot, onShow, onVisited, onNext, onCompass }) {
  const { house, meters, bearing } = entry;
  const shown = compass.heading == null ? bearing : (bearing - compass.heading + 360) % 360;
  const subText = `About ${formatDistance(meters)} · ${compassLabel(bearing)} (straight-line)`;
  const sig = [house.id, visited, compass.supported, compass.on].join('|');
  const existing = root();
  if (existing.dataset.kind === 'nearest' && existing.dataset.sig === sig) { // same house: update in place so focus and taps are not lost
    existing.querySelector('.arrow').style.transform = `rotate(${Math.round(shown)}deg)`; existing.querySelector('.sub').textContent = subText;
    return;
  }
  const r = frame('Nearest house');
  r.dataset.kind = 'nearest'; r.dataset.sig = sig;
  const wrap = el('div', 'arrow-wrap');
  wrap.append(houseIcon(house, siteRoot));
  const text = el('div');
  text.append(el('h3', null, `Nearest: #${house.mapNumber} ${house.name}`));
  text.append(el('p', 'sub', subText));
  text.style.flex = '1'; text.style.minWidth = '0';
  wrap.append(text, arrowBox(shown, compass.heading == null));
  r.append(wrap);
  const row = el('div', 'row');
  row.append(button(visited ? 'Visited ✓ (undo)' : 'Mark visited', () => onVisited(house.id, !visited), 'main'));
  row.append(button('Next', onNext));
  row.append(directionsLink(house));
  if (compass.supported) {
    const toggle = button('', onCompass, 'compass-btn');
    toggle.append(compassIcon());
    toggle.setAttribute('aria-label', compass.on ? 'Compass: on' : 'Compass: off');
    toggle.title = 'Point the arrow with your phone compass';
    toggle.setAttribute('aria-pressed', String(compass.on));
    row.append(toggle);
  }
  r.append(row);
  const detail = button(`Show #${house.mapNumber} on the map`, () => onShow(house.id));
  detail.className = 'sr-only'; r.append(detail);
}

export function showHouse({ house, visited, root: siteRoot, onVisited }) {
  const r = frame(`Stop ${house.mapNumber}`, { closable: true });
  r.dataset.kind = 'house';
  const wrap = el('div', 'arrow-wrap');
  wrap.append(houseIcon(house, siteRoot));
  const text = el('div');
  text.style.flex = '1'; text.style.minWidth = '0';
  text.append(el('h3', null, `#${house.mapNumber} ${house.name}`), el('p', 'sub', house.address));
  wrap.append(text);
  r.append(wrap);
  if (house.description) r.append(el('p', 'sub', house.description));
  if (house.location === 'approximate') r.append(el('p', 'note', 'Location approximate.'));
  const row = el('div', 'row');
  row.append(button(visited ? 'Visited ✓ (undo)' : 'Mark visited', () => onVisited(house.id, !visited), 'main'));
  if (house.location !== 'none') row.append(directionsLink(house));
  r.append(row);
}

export function showChooser({ houses, onPick }) {
  const r = frame('Choose a house');
  r.dataset.kind = 'chooser';
  r.append(el('h3', null, 'Several houses are close together'));
  const row = el('div', 'row');
  for (const h of houses) row.append(button(`#${h.mapNumber} ${h.name}`, () => onPick(h.id)));
  r.append(row);
}
