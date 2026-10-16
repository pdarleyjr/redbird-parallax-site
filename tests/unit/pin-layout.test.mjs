import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layoutPins, closestHeads, crossings } from '../../shared/pin-layout.mjs';
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

/** Same projection, zoomed in by `zoom` around the houses' centre of gravity (what the phone default view does). */
function projectZoom(width, height, zoom) {
  const base = project(width, height);
  const cx = base.reduce((s, a) => s + a.x, 0) / base.length, cy = base.reduce((s, a) => s + a.y, 0) / base.length;
  return base.map(a => ({ ...a, x: width / 2 + (a.x - cx) * zoom, y: height / 2 + (a.y - cy) * zoom })).filter(a => a.x > 0 && a.x < width && a.y > 0 && a.y < height);
}

const CASES = [['phone 390x640 whole trail', 390, 640, 20, 28, 1], ['phone 390x640 zoomed', 390, 640, 20, 28, 2.8], ['phone 390x700 zoomed', 390, 700, 20, 28, 2.8],
  ['phone 390x640 close', 390, 640, 20, 28, 4], ['desktop 1200x640', 1200, 640, 22, 36, 1], ['desktop 1200x640 zoomed', 1200, 640, 22, 36, 2.5]];
for (const [name, w, h, R, cap, zoom] of CASES) {
  test(`pins: no overlap, no crossing, needles within the cap, every house shown once (${name})`, () => {
    const anchors = projectZoom(w, h, zoom);
    const units = layoutPins(anchors, { radius: R, maxNeedle: cap, bounds: { width: w, height: h } });
    assert.deepEqual(units.flatMap(u => u.ids).sort(), anchors.map(a => a.id).sort(), 'each house is in exactly one pin or cluster');
    assert.ok(closestHeads(units) >= 2 * R + 1, `closest heads ${closestHeads(units).toFixed(1)}px`);
    assert.equal(crossings(units), 0, 'needles cross');
    for (const u of units) {
      assert.ok(u.hx >= R && u.hx <= w - R && u.hy >= R && u.hy <= h - R, `${u.key} head out of bounds`);
      assert.ok(Math.hypot(u.hx - u.ax, u.hy - u.ay) - R <= cap + 0.01, `${u.key} needle over the cap`);
      if (u.ids.length === 1) assert.ok(u.hy < u.ay, `${u.key} head is not above its anchor`);
    }
    for (const a of units) for (const b of units) if (a !== b) assert.ok(Math.hypot(a.hx - b.ax, a.hy - b.ay) >= R + 1, `${a.key} head covers the ground dot of ${b.key}`);
  });
}

test('without a cap (print) every house keeps its own badge and needles never cross', () => {
  const anchors = projectZoom(1000, 800, 1);
  const units = layoutPins(anchors, { radius: 20, bounds: { width: 1000, height: 800 } });
  assert.equal(units.length, anchors.length);
  assert.equal(crossings(units), 0);
  assert.ok(closestHeads(units) >= 41);
});

test('layout is pure and deterministic', () => {
  const anchors = projectZoom(390, 640, 2);
  const a = layoutPins(anchors, { radius: 20, maxNeedle: 28, bounds: { width: 390, height: 640 } });
  const b = layoutPins(structuredClone(anchors), { radius: 20, maxNeedle: 28, bounds: { width: 390, height: 640 } });
  assert.deepEqual(a, b);
});

test('isolated houses keep a short straight needle and never cluster', () => {
  const units = layoutPins([{ id: 'a', x: 200, y: 300 }, { id: 'b', x: 900, y: 300 }], { radius: 14, maxNeedle: 28, bounds: { width: 1100, height: 600 } });
  assert.equal(units.length, 2);
  for (const u of units) { assert.ok(Math.abs(u.hx - u.ax) < 0.5); assert.ok(u.ay - u.hy <= 28 + 14 + 0.01); }
});

test('houses with no room within the needle cap form a cluster', () => {
  const crowd = Array.from({ length: 12 }, (_, i) => ({ id: 'h' + i, x: 200 + (i % 4) * 6, y: 300 + Math.floor(i / 4) * 6 }));
  const units = layoutPins(crowd, { radius: 20, maxNeedle: 28, bounds: { width: 400, height: 600 } });
  assert.ok(units.some(u => u.ids.length > 1));
  assert.equal(units.flatMap(u => u.ids).length, 12);
});
