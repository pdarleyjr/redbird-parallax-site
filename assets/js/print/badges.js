// Themed icon badges for the printed map (the flyer look), laid out by the same shared/pin-layout.mjs as the live map.
import { layoutPins } from '../../../shared/pin-layout.mjs';
import { projectToBounds } from '../../../shared/geo.mjs';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };

/** Wait until every badge icon has loaded so the print preview and PDF never show empty discs. */
export function iconsLoaded(svg) {
  return Promise.all([...svg.querySelectorAll('image')].map(image => new Promise(resolve => {
    const probe = new Image();
    probe.onload = probe.onerror = () => resolve();
    probe.src = image.getAttribute('href');
  })));
}

/**
 * Draws one badge per located house into `svg` and returns how many were drawn.
 * @param {SVGSVGElement} svg      overlay, viewBox 0 0 W H
 * @param {object[]} houses        snapshot houses
 * @param {{bounds:number[], W:number, H:number, radius:number, root:string}} view
 */
export function drawBadges(svg, houses, { bounds, W, H, radius: R, root }) {
  const located = houses.filter(h => h.location !== 'none').sort((a, b) => a.mapNumber - b.mapNumber);
  const anchors = located.map(h => ({ id: h.id, ...projectToBounds(h, bounds, W, H) }));
  const placed = layoutPins(anchors, { radius: R, bounds: { width: W, height: H } });
  const defs = svgEl('defs');
  const grad = svgEl('radialGradient', { id: 'pm-head', cx: '35%', cy: '30%', r: '75%' });
  grad.append(svgEl('stop', { offset: 0, class: 'pm-stop-hi' }), svgEl('stop', { offset: .62, class: 'pm-stop-mid' }), svgEl('stop', { offset: 1, class: 'pm-stop-lo' }));
  const shine = svgEl('radialGradient', { id: 'pm-shine', cx: '32%', cy: '22%', r: '50%' });
  shine.append(svgEl('stop', { offset: 0, class: 'pm-shine-a' }), svgEl('stop', { offset: 1, class: 'pm-shine-b' }));
  defs.append(grad, shine); svg.append(defs);

  const group = svgEl('g', { class: 'pm' });
  const byId = new Map(located.map(h => [h.id, h]));
  placed.forEach(p => {
    const h = byId.get(p.ids[0]);
    const g = svgEl('g', { 'data-n': h.mapNumber, 'data-x': p.hx.toFixed(1), 'data-y': p.hy.toFixed(1) });
    g.append(
      svgEl('ellipse', { class: 'pm-shadow', cx: (p.ax + R * .17).toFixed(1), cy: (p.ay + R * .07).toFixed(1), rx: (R * .36).toFixed(1), ry: (R * .14).toFixed(1) }),
      svgEl('line', { class: 'pm-needle', x1: p.ax.toFixed(1), y1: p.ay.toFixed(1), x2: p.hx.toFixed(1), y2: p.hy.toFixed(1) }),
      svgEl('circle', { class: 'pm-ground', cx: p.ax.toFixed(1), cy: p.ay.toFixed(1), r: (R * .17).toFixed(1) }),
      svgEl('circle', { class: 'pm-glow', cx: p.hx.toFixed(1), cy: p.hy.toFixed(1), r: (R + R * .12).toFixed(1) }),
      svgEl('circle', { class: 'pm-head', cx: p.hx.toFixed(1), cy: p.hy.toFixed(1), r: R.toFixed(1), fill: 'url(#pm-head)' }),
      svgEl('image', { href: `${root}assets/img/markers/${h.icon}.webp`, x: (p.hx - R * .92).toFixed(1), y: (p.hy - R * .92).toFixed(1), width: (R * 1.84).toFixed(1), height: (R * 1.84).toFixed(1), preserveAspectRatio: 'xMidYMid meet' }),
      svgEl('circle', { class: 'pm-ring', cx: p.hx.toFixed(1), cy: p.hy.toFixed(1), r: (R - 1.2).toFixed(1) }),
      svgEl('circle', { class: 'pm-shine', cx: p.hx.toFixed(1), cy: p.hy.toFixed(1), r: R.toFixed(1), fill: 'url(#pm-shine)' }),
      svgEl('circle', { class: 'pm-tag', cx: (p.hx + R * .74).toFixed(1), cy: (p.hy + R * .74).toFixed(1), r: (R * .4).toFixed(1) })
    );
    const t = svgEl('text', { x: (p.hx + R * .74).toFixed(1), y: (p.hy + R * .74).toFixed(1), style: `font-size:${(R * .47).toFixed(1)}px` });
    t.textContent = String(h.mapNumber);
    g.append(t); group.append(g);
  });
  svg.append(group);
  return placed.length;
}
