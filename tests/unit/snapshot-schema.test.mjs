import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot, pickNewest } from '../../shared/snapshot-schema.mjs';

const boundary = { type: 'Polygon', coordinates: [[[-80.30, 25.733], [-80.286, 25.733], [-80.286, 25.7392], [-80.30, 25.7392], [-80.30, 25.733]]] };
const house = (n, extra = {}) => ({ id: `stop-0${n}`, mapNumber: n, name: `House ${n}`, address: `${n} SW 1st Street`, description: null, icon: 'ghost', lat: 25.736, lng: -80.29, location: 'approximate', ...extra });
const snapshot = (over = {}) => ({
  schema: 1, eventId: 'halloween-2026', version: 1, publishedAt: '2026-10-16T00:00:00Z',
  event: { name: 'Red Bird Trick-or-Treat Trail', year: 2026, date: '2026-10-31', start: '18:00', end: '21:00', timeZone: 'America/New_York', status: 'published' },
  boundary, printExtent: null, trail: null, houses: [house(1), house(2)], ...over
});

test('a valid snapshot has no errors', () => assert.deepEqual(validateSnapshot(snapshot()), []));
test('rejects extra fields such as email (privacy)', () => {
  assert.ok(validateSnapshot(snapshot({ houses: [house(1, { email: 'a@example.invalid' })] })).some(e => /unexpected house field: email/.test(e)));
  assert.ok(validateSnapshot({ ...snapshot(), contact: 'x' }).some(e => /unexpected field/.test(e)));
});
test('rejects duplicate ids and numbers, and unsorted houses', () => {
  assert.ok(validateSnapshot(snapshot({ houses: [house(1), house(1)] })).length > 0);
  assert.ok(validateSnapshot(snapshot({ houses: [house(2), house(1)] })).some(e => /sorted/.test(e)));
});
test('location none requires null coordinates; others require finite ones', () => {
  assert.deepEqual(validateSnapshot(snapshot({ houses: [house(1, { location: 'none', lat: null, lng: null })] })), []);
  assert.ok(validateSnapshot(snapshot({ houses: [house(1, { location: 'none' })] })).length > 0);
  assert.ok(validateSnapshot(snapshot({ houses: [house(1, { lat: null, lng: null })] })).length > 0);
});
test('coordinates outside the boundary are rejected', () => assert.ok(validateSnapshot(snapshot({ houses: [house(1, { lat: 25.75 })] })).some(e => /outside/.test(e))));
test('pickNewest prefers higher valid versions and ignores invalid data', () => {
  assert.equal(pickNewest(snapshot(), snapshot({ version: 3 }), { bad: true }).version, 3);
  assert.equal(pickNewest(snapshot(), null).version, 1);
  assert.equal(pickNewest({ bad: true }), null);
});
