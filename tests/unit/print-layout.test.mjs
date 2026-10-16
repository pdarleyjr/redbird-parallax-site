import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutMarkers } from '../../shared/print-layout.mjs';
import { projectToBounds, extentHash } from '../../shared/geo.mjs';

const clusterPoints = () => Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, mapNumber: i + 1, x: 500 + (i % 3) * 4, y: 400 + Math.floor(i / 3) * 3 }));

test('no two marker circles intersect, even for a tight cluster', () => {
  const D = 30;
  const placed = layoutMarkers(clusterPoints(), D);
  assert.equal(placed.length, 12);
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const d = Math.hypot(placed[i].cx - placed[j].cx, placed[i].cy - placed[j].cy);
    assert.ok(d >= D - 1e-6, `circles ${i} and ${j} overlap (${d.toFixed(1)})`);
  }
});
test('a lone marker stays on its true point without a leader line', () => {
  const [m] = layoutMarkers([{ id: 'a', mapNumber: 1, x: 100, y: 120 }], 30);
  assert.deepEqual([m.cx, m.cy, m.leader], [100, 120, false]);
});
test('displaced markers get leader lines back to the true point', () => {
  const placed = layoutMarkers(clusterPoints(), 30);
  assert.ok(placed.filter(m => m.leader).length >= 1);
  for (const m of placed.filter(x => x.leader)) assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y));
});
test('layout is deterministic regardless of input order', () => {
  const a = layoutMarkers(clusterPoints(), 30);
  const b = layoutMarkers(clusterPoints().reverse(), 30);
  assert.deepEqual(a.map(m => [m.id, m.cx, m.cy]), b.map(m => [m.id, m.cx, m.cy]));
});
test('Mercator projection maps the bounds corners to the image corners', () => {
  const b = [-80.3, 25.73, -80.28, 25.74];
  const nw = projectToBounds({ lat: 25.74, lng: -80.3 }, b, 1000, 500);
  const se = projectToBounds({ lat: 25.73, lng: -80.28 }, b, 1000, 500);
  assert.ok(Math.abs(nw.x) < 1e-9 && Math.abs(nw.y) < 1e-9);
  assert.ok(Math.abs(se.x - 1000) < 1e-9 && Math.abs(se.y - 500) < 1e-9);
});
test('extent hash is stable and changes with the extent', () => {
  assert.equal(extentHash([1, 2, 3, 4]), extentHash([1, 2, 3, 4]));
  assert.notEqual(extentHash([1, 2, 3, 4]), extentHash([1, 2, 3, 5]));
});
