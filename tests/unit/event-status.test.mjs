import test from 'node:test';
import assert from 'node:assert/strict';
import { eventStatus, zonedInstant } from '../../shared/event-status.mjs';

const halloween = { date: '2026-10-31', start: '18:00', end: '21:00', tz: 'America/New_York' };
const at = iso => Date.parse(iso);

test('18:00 on Oct 31 in New York is 22:00 UTC (EDT)', () => assert.equal(zonedInstant('2026-10-31', '18:00'), at('2026-10-31T22:00:00Z')));
test('the zone is honoured across the DST change (Nov 1, 2026 is EST)', () => assert.equal(zonedInstant('2026-11-02', '18:00'), at('2026-11-02T23:00:00Z')));
test('three days ahead: "In 3 days"', () => assert.deepEqual(eventStatus(halloween, at('2026-10-28T15:00:00Z')), { kind: 'upcoming', label: 'In 3 days' }));
test('late evening in New York still counts that New York day', () => assert.equal(eventStatus(halloween, at('2026-10-29T02:30:00Z')).label, 'In 3 days'));   // 10:30 PM Oct 28 in New York
test('the day before: Tomorrow', () => assert.equal(eventStatus(halloween, at('2026-10-30T20:00:00Z')).label, 'Tomorrow · 6 PM'));
test('the morning of: Today', () => assert.equal(eventStatus(halloween, at('2026-10-31T14:00:00Z')).label, 'Today · 6 PM'));
test('6 PM to 9 PM Eastern: Happening now, with exact edges', () => {
  assert.equal(eventStatus(halloween, at('2026-10-31T21:59:59Z')).kind, 'upcoming');
  assert.deepEqual(eventStatus(halloween, at('2026-10-31T22:00:00Z')), { kind: 'live', label: 'Happening now' });
  assert.equal(eventStatus(halloween, at('2026-11-01T00:59:59Z')).kind, 'live');
  assert.deepEqual(eventStatus(halloween, at('2026-11-01T01:00:00Z')), { kind: 'ended', label: 'Ended' });
});
test('afterwards: Ended', () => assert.equal(eventStatus(halloween, at('2026-11-05T12:00:00Z')).kind, 'ended'));
