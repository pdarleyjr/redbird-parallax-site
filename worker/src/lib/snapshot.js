// Build and validate the public snapshot from D1 rows.
import { assertSnapshot } from '../../../shared/snapshot-schema.mjs';
import { printExtentFromRing } from './extent.js';

export function rowToPublicHouse(row) {
  const located = row.location_status !== 'none' && row.lat != null && row.lng != null;
  return {
    id: row.id, mapNumber: row.map_number, name: row.name, address: row.address_display,
    description: row.description || null, icon: row.icon,
    lat: located ? row.lat : null, lng: located ? row.lng : null,
    location: located ? (row.location_status === 'verified' ? 'verified' : 'approximate') : 'none'
  };
}

/** event: D1 events row. houses: all D1 houses rows for the event (any status). */
export function buildSnapshot({ event, houses, version, now, boundary }) {
  const ring = boundary.coordinates[0];
  const published = houses.filter(h => h.status === 'published').map(rowToPublicHouse).sort((a, b) => a.mapNumber - b.mapNumber);
  const extent = event.print_extent_json ? JSON.parse(event.print_extent_json) : printExtentFromRing(ring);
  return assertSnapshot({
    schema: 1, eventId: event.id, version, publishedAt: now,
    event: { name: event.title, year: event.year, date: event.date, start: event.start_time, end: event.end_time, timeZone: event.time_zone, status: event.status },
    boundary, printExtent: extent, trail: event.trail_geojson ? JSON.parse(event.trail_geojson) : null, houses: published
  });
}

export async function etagFor(payloadText) {
  const bytes = new TextEncoder().encode(payloadText);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}
