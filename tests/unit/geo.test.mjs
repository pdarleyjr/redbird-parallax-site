import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, bearingDegrees, compassLabel, formatDistance, pointInPolygon, nearest, inBoundary } from '../../shared/geo.mjs';

test('haversine on a known pair', () => {
  const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(Math.abs(d - 111195) < 20);
});
test('bearing cardinal directions', () => {
  const o = { lat: 25.73, lng: -80.29 };
  assert.ok(Math.abs(bearingDegrees(o, { lat: 25.74, lng: -80.29 }) - 0) < 0.01);
  assert.ok(Math.abs(bearingDegrees(o, { lat: 25.73, lng: -80.28 }) - 90) < 0.1);
  assert.ok(Math.abs(bearingDegrees(o, { lat: 25.72, lng: -80.29 }) - 180) < 0.01);
  assert.ok(Math.abs(bearingDegrees(o, { lat: 25.73, lng: -80.30 }) - 270) < 0.1);
});
test('compass labels', () => {
  assert.equal(compassLabel(0), 'North');
  assert.equal(compassLabel(44), 'Northeast');
  assert.equal(compassLabel(359), 'North');
  assert.equal(compassLabel(200), 'South');
});
test('distance formatting', () => {
  assert.equal(formatDistance(73), '240 ft');
  assert.equal(formatDistance(1000), '0.6 mi');
});
test('point in polygon and buffered boundary', () => {
  const poly = [[-80.30, 25.733], [-80.286, 25.733], [-80.286, 25.7392], [-80.30, 25.7392]];
  assert.equal(pointInPolygon({ lat: 25.736, lng: -80.29 }, poly), true);
  assert.equal(pointInPolygon({ lat: 25.75, lng: -80.29 }, poly), false);
  assert.equal(inBoundary({ lat: 25.7326, lng: -80.29 }, poly, 50), true);
  assert.equal(inBoundary({ lat: 25.70, lng: -80.29 }, poly, 50), false);
});
test('nearest skips visited, breaks ties by number, ignores unlocated', () => {
  const houses = [
    { id: 'a', mapNumber: 2, lat: 25.7300, lng: -80.2900 },
    { id: 'b', mapNumber: 1, lat: 25.7300, lng: -80.2900 },
    { id: 'c', mapNumber: 3, lat: null, lng: null },
    { id: 'd', mapNumber: 4, lat: 25.7400, lng: -80.2900 }
  ];
  const here = { lat: 25.7301, lng: -80.2900 };
  assert.equal(nearest(houses, here)[0].house.id, 'b');
  assert.equal(nearest(houses, here, new Set(['b']))[0].house.id, 'a');
  assert.equal(nearest(houses, here).length, 3);
});
