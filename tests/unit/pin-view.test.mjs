import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planPins, chooseDefaultView, project, MAX_CLUSTERS, MIN_SINGLE_SHARE } from '../../shared/pin-view.mjs';
import { crossings, closestHeads } from '../../shared/pin-layout.mjs';

const snapshot = JSON.parse(await readFile(new URL('../../data/halloween-2026.public.json', import.meta.url), 'utf8'));
const houses = snapshot.houses.filter(h => h.location !== 'none');
const ring = snapshot.boundary.coordinates[0];

/** Zoom at which the trail boundary fits the width (what the map opens at before the phone default view). */
function fitZoom(width) {
  const lngs = ring.map(p => p[0]);
  return Math.log2(((width - 48) * 360) / (512 * (Math.max(...lngs) - Math.min(...lngs))));
}
const controls = [{ x: 190, y: 10, width: 180, height: 50 }, { x: 305, y: 70, width: 56, height: 160 }, { x: 190, y: 236, width: 175, height: 50 }];

for (const [w, h] of [[375, 812], [390, 844], [430, 932]]) {
  test(`the phone default view (${w}x${h}) meets the density limits`, () => {
    const view = chooseDefaultView(houses, { fitZoom: fitZoom(w), width: w, height: h, avoid: controls });
    assert.equal(view.plan.mode, 'needles');
    const { stats, units } = view.plan;
    assert.ok(stats.clusters <= MAX_CLUSTERS, `${stats.clusters} clusters`);
    assert.ok(stats.singles >= MIN_SINGLE_SHARE * stats.total, `${stats.singles}/${stats.total} individual`);
    assert.ok(stats.maxNeedle <= 20.01, `needle ${stats.maxNeedle}`);
    assert.equal(crossings(units), 0);
    assert.ok(closestHeads(units) >= 40);
  });
}

test('whole-trail view on a phone uses flat 28 px badges without needles', () => {
  const [w, h] = [390, 844], center = { lng: ring.reduce((s, p) => s + p[0], 0) / ring.length, lat: ring.reduce((s, p) => s + p[1], 0) / ring.length };
  const anchors = houses.map(x => ({ id: x.id, ...project(x, center, fitZoom(w), w, h) }));
  const plan = planPins(anchors, { phone: true, width: w, height: h, avoid: controls });
  assert.equal(plan.mode, 'flat');
  assert.equal(plan.radius, 14);
  assert.ok(plan.units.every(u => u.hx === u.ax && u.hy === u.ay));
  assert.ok(closestHeads(plan.units) >= 28);
  assert.deepEqual(plan.units.flatMap(u => u.ids).sort(), anchors.map(a => a.id).sort());
});
