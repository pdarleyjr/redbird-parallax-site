// One printable sheet (pre-rendered base image + SVG overlay + numbered legend), shared by
// /halloween/print/ and the print-only sheet inside the Halloween app, so both always print the same map.
import { projectToBounds, extentHash, distanceMeters } from '../../../shared/geo.mjs';
import { drawBadges, iconsLoaded } from './badges.js';
import { iconURL } from '../../../shared/icon-url.mjs';
import { siteRoot } from '../data.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };
export const BLOCK_INCHES = { 'letter-portrait': 7.5, 'letter-landscape': 10.2 };
export const paperOrDefault = paper => (BLOCK_INCHES[paper] ? paper : 'letter-portrait');

/** Sets the @page size for the next print. */
export function setPaper(paper) {
  document.documentElement.dataset.paper = paper;
  let style = document.getElementById('paper-style');
  if (!style) { style = document.createElement('style'); style.id = 'paper-style'; document.head.append(style); }
  style.textContent = `@media print{@page{size:letter ${paper === 'letter-landscape' ? 'landscape' : 'portrait'};margin:.4in}}`;
}

let metaPromise = null;
/** print-base.json (bounds of the pre-rendered base maps); cached per page load. */
export function loadPrintMeta() {
  metaPromise ||= fetch(new URL('assets/map/print-base.json', siteRoot)).then(r => { if (!r.ok) throw new Error(`print-base.json HTTP ${r.status}`); return r.json(); }).catch(error => { metaPromise = null; throw error; });
  return metaPromise;
}

function drawOverlay(svg, snapshot, entry, paper) {
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

/** Fills the numbered house list. */
export function drawLegend(list, wrap, snapshot, include) {
  list.replaceChildren();
  wrap.hidden = !include;
  for (const h of snapshot.houses) {
    const li = document.createElement('li');
    const img = document.createElement('img'); img.src = iconURL(h.icon, siteRoot.href, { small: true }); img.alt = ''; img.width = img.height = 18;
    const b = document.createElement('b'); b.textContent = String(h.mapNumber);
    li.append(img, b, document.createTextNode(`${h.name}, ${h.address}${h.location === 'none' ? ' (map location coming soon)' : ''}`));
    list.append(li);
  }
}

const waitForImage = async img => {
  try { await img.decode(); } catch {
    await new Promise(resolve => { if (img.complete && img.naturalWidth) resolve(); else { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); } });
  }
  return img.naturalWidth > 0;
};

/**
 * Renders one sheet. `els` = { block, img, overlay, legendList, legendWrap, version }.
 * Returns { ok: true, count } or { ok: false, reason: 'extent' | 'image' }.
 * The overlay and legend are drawn before the base image finishes, so a print started early still lists every house.
 */
export async function renderSheet(els, { snapshot, meta, paper, includeList = true }) {
  const entry = meta.maps[paper];
  if (!entry || extentHash(snapshot.printExtent) !== meta.extentHash) return { ok: false, reason: 'extent' };
  els.block.style.setProperty('--map-aspect', `${entry.width} / ${entry.height}`);
  els.block.style.width = `${BLOCK_INCHES[paper]}in`;
  const src = new URL(entry.file, siteRoot).href;
  if (els.img.src !== src) els.img.src = src;
  const count = drawOverlay(els.overlay, snapshot, entry, paper);
  drawLegend(els.legendList, els.legendWrap, snapshot, includeList);
  els.version.textContent = `Data version ${snapshot.version} · updated ${new Date(snapshot.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  const [loaded] = await Promise.all([waitForImage(els.img), iconsLoaded(els.overlay)]);
  return loaded ? { ok: true, count } : { ok: false, reason: 'image' };
}
