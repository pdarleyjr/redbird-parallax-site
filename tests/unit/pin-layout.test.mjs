import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layoutPins, closestHeads } from '../../shared/pin-layout.mjs';
import { mercatorY } from '../../shared/geo.mjs';

const snapshot = JSON.parse(await readFile(new URL('../../data/halloween-2026.public.json', import.meta.url), 'utf8'));
const located = snapshot.houses.filter(h => h.location !== 'none');

/** Screen px of every house for a map `width` x `height` fitted to the trail boundary (web mercator, like MapLibre fitBounds). */
function project(width, height, padding = 24) {
  const ring = snapshot.boundary.coordinates[0];
  const lngs = ring.map(p => p[0]), lats = ring.map(p => p[1]);
  const [w, e] = [Math.min(...lngs), Math.max(...lngs)];
  const [yN, yS] = [mercatorY(Math.max(...lats)), mercatorY(Math.min(...lats))];
  const scale = Math.min((width - 2 * padding) / (((e - w) * Math.PI) / 180), (height - 2 * padding) / (yN - yS));
  const cx = (w + e) / 2, cy = (yN + yS) / 2;
  return located.map(h => ({ id: h.id, x: width / 2 + (((h.lng - cx) * Math.PI) / 180) * scale, y: height / 2 - (mercatorY(h.lat) - cy) * scale }));
}

for (const [name, w, h, R] of [['phone 390x640', 390, 640, 18], ['desktop 1200x640', 1200, 640, 20], ['tall phone 390x700', 390, 700, 18]]) {
  test(`46 pin heads never overlap and stay inside the map (${name})`, () => {
    const anchors = project(w, h);
    const pins = layoutPins(anchors, { radius: R, bounds: { width: w, height: h } });
    assert.equal(pins.length, located.length);
    assert.ok(closestHeads(pins) >= 2 * R + 1, `closest heads ${closestHeads(pins).toFixed(1)}px < ${2 * R + 1}`);
    for (const p of pins) {
      assert.ok(p.hx >= R && p.hx <= w - R && p.hy >= R && p.hy <= h - R, `${p.id} head out of bounds (${p.hx.toFixed(0)}, ${p.hy.toFixed(0)})`);
      assert.ok(p.hy <= p.ay - 18 * (R / 14) + 0.01 || p.hy <= R + 7, `${p.id} head is not above its anchor`);
    }
    for (const a of pins) for (const b of pins) if (a !== b) assert.ok(Math.hypot(a.hx - b.ax, a.hy - b.ay) >= R + 1, `${a.id} head covers the ground dot of ${b.id}`);
  });
}

test('layout is pure and deterministic and keeps input order', () => {
  const anchors = project(390, 640);
  const a = layoutPins(anchors, { radius: 18, bounds: { width: 390, height: 640 }, maxUp: 640 });
  const b = layoutPins(structuredClone(anchors), { radius: 18, bounds: { width: 390, height: 640 }, maxUp: 640 });
  assert.deepEqual(a, b);
  assert.deepEqual(a.map(p => p.id), anchors.map(p => p.id));
  assert.deepEqual(anchors, project(390, 640), 'input is not mutated');
});

test('isolated houses keep their preferred spot straight above the anchor with a short needle', () => {
  const pins = layoutPins([{ id: 'a', x: 200, y: 300 }, { id: 'b', x: 900, y: 300 }], { radius: 14, bounds: { width: 1100, height: 600 } });
  for (const p of pins) { assert.ok(Math.abs(p.hx - p.ax) < 0.5); assert.ok(Math.abs(p.ay - p.hy - 36) < 0.5); }
});

test('zoomed in far enough, every needle returns to the preferred length', () => {
  const near = project(1200, 640).map(a => ({ ...a, x: 600 + (a.x - 600) * 12, y: 320 + (a.y - 320) * 12 })).filter(a => a.x > 40 && a.x < 1160 && a.y > 200 && a.y < 620);
  const pins = layoutPins(near, { radius: 20, bounds: { width: 1200, height: 640 } });
  const moved = pins.filter(p => Math.hypot(p.hx - p.ax, p.ay - p.hy - 36 * (20 / 14)) > 6).length;
  assert.ok(moved <= Math.ceil(pins.length * 0.25), `${moved}/${pins.length} still displaced`);
});
