// Printable map: pre-rendered base image + SVG overlay computed from the same snapshot as the live map.
import { loadSnapshots, siteRoot } from '../data.js';
import { projectToBounds, extentHash, distanceMeters } from '../../../shared/geo.mjs';
import { drawBadges, iconsLoaded } from './badges.js';

const $ = selector => document.querySelector(selector);
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };
const BLOCK_INCHES = { 'letter-portrait': 7.5, 'letter-landscape': 10.2 };

function setPaper(paper) {
  document.documentElement.dataset.paper = paper;
  let style = $('#paper-style');
  if (!style) { style = document.createElement('style'); style.id = 'paper-style'; document.head.append(style); }
  style.textContent = `@media print{@page{size:letter ${paper === 'letter-landscape' ? 'landscape' : 'portrait'};margin:.4in}}`;
}

function drawOverlay(svg, snapshot, meta, paper) {
  const entry = meta.maps[paper];
  const W = 1000, H = Math.round(1000 * entry.height / entry.width);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.replaceChildren();
  const ring = snapshot.boundary.coordinates[0].map(([lng, lat]) => projectToBounds({ lat, lng }, entry.bounds, W, H));
  svg.append(svgEl('polygon', { class: 'boundary', points: ring.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }));
  const count = drawBadges(svg, snapshot.houses, { bounds: entry.bounds, W, H, radius: 0.17 / BLOCK_INCHES[paper] * W, root: siteRoot.href });
  // North arrow and scale bar
  const [w, s, e, n] = entry.bounds;
  const metersPerUnit = distanceMeters({ lat: (s + n) / 2, lng: w }, { lat: (s + n) / 2, lng: e }) / W;
  const feet = 500, len = feet / 3.28084 / metersPerUnit;
  const bar = svgEl('g', { class: 'furniture' });
  bar.append(svgEl('rect', { x: 30, y: H - 40, width: len, height: 7, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }));
  const label = svgEl('text', { x: 30, y: H - 48, style: 'font-size:15px;text-anchor:start;fill:currentColor' }); label.textContent = `${feet} ft`;
  const north = svgEl('g', { transform: `translate(${W - 50} 60)` });
  north.append(svgEl('path', { d: 'M0 -28 L12 14 L0 6 L-12 14 Z', fill: 'currentColor' }));
  const nt = svgEl('text', { x: 0, y: 34, style: 'font-size:16px;font-weight:700;fill:currentColor' }); nt.textContent = 'N';
  north.append(nt); bar.append(label, north);
  svg.append(bar);
  return count;
}

function drawLegend(snapshot, include) {
  const list = $('#print-legend-list');
  list.replaceChildren();
  $('#print-legend').hidden = !include;
  for (const h of snapshot.houses) {
    const li = document.createElement('li');
    const img = document.createElement('img'); img.src = new URL(`assets/img/markers/${h.icon}.webp`, siteRoot).href; img.alt = ''; img.width = img.height = 18;
    const b = document.createElement('b'); b.textContent = String(h.mapNumber);
    li.append(img, b, document.createTextNode(`${h.name}, ${h.address}${h.location === 'none' ? ' (map location coming soon)' : ''}`));
    list.append(li);
  }
}

async function main() {
  const config = JSON.parse($('#event-config').textContent);
  const message = text => { const el = $('#print-msg'); el.textContent = text; el.hidden = !text; $('#map-block').hidden = !!text; };
  const button = $('#print-button'), ready = $('#print-ready'), select = $('#paper'), include = $('#include-list');
  const params = new URLSearchParams(location.search);
  const requested = params.get('paper');
  const paper = BLOCK_INCHES[requested] ? requested : 'letter-portrait';
  select.value = paper; include.checked = params.get('list') !== '0';
  const { bundled, livePromise } = await loadSnapshots({ snapshotPath: config.houses.path, apiBase: config.apiBase, eventId: 'halloween-2026', onLive: () => {} });
  const live = await livePromise;
  const snapshot = live && live.version > bundled.version ? live : bundled;
  const meta = await (await fetch(new URL('assets/map/print-base.json', siteRoot))).json();

  async function render() {
    button.disabled = true; ready.textContent = 'Preparing map…';
    const p = BLOCK_INCHES[select.value] ? select.value : 'letter-portrait';
    setPaper(p);
    if (extentHash(snapshot.printExtent) !== meta.extentHash || !meta.maps[p]) { message('The print map is being updated. Please check back soon.'); ready.textContent = 'Print map unavailable'; return; }
    message('');
    const entry = meta.maps[p];
    const img = $('#print-base');
    $('#map-block').style.setProperty('--map-aspect', `${entry.width} / ${entry.height}`);
    $('#map-block').style.width = `${BLOCK_INCHES[p]}in`;
    img.src = new URL(entry.file, siteRoot).href;
    try { await img.decode(); } catch { await new Promise(resolve => { if (img.complete && img.naturalWidth) resolve(); else { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); } }); }
    if (!img.naturalWidth) { message('The print map image could not load. Please try again.'); ready.textContent = 'Print map unavailable'; return; }
    const count = drawOverlay($('#print-overlay'), snapshot, meta, p);
    await iconsLoaded($('#print-overlay'));
    drawLegend(snapshot, include.checked);
    $('#print-version').textContent = `Data version ${snapshot.version} · updated ${new Date(snapshot.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    document.body.dataset.markers = String(count);
    ready.textContent = 'Map ready ✓'; button.disabled = false;
  }
  try { // tell people when the downloadable flyer is older than this live list
    const flyer = await (await fetch(new URL('data/flyer-houses.json', siteRoot))).json();
    const newer = snapshot.houses.filter(h => !flyer.ids.includes(h.id)).length;
    if (newer) { const note = $('#print-newer'); note.textContent = `This is the latest map. The downloadable trail map flyer (made ${flyer.madeOn}) does not include ${newer === 1 ? '1 newer house' : `${newer} newer houses`}.`; note.hidden = false; }
  } catch { /* optional hint */ }
  select.addEventListener('change', render);
  include.addEventListener('change', () => drawLegend(snapshot, include.checked));
  button.addEventListener('click', () => window.print());
  await render();
}

main().catch(error => { console.error(error); const el = $('#print-msg'); if (el) { el.textContent = 'Something went wrong preparing the print map. Please refresh.'; el.hidden = false; } });
