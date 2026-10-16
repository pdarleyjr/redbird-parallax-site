// D1 access. Every public-affecting change is one db.batch(): row changes + audit rows + the next snapshot.
import { HttpError } from './http.js';
import { buildSnapshot, etagFor, rowToPublicHouse } from './snapshot.js';

export const nowISO = () => new Date().toISOString();

export async function getEvent(db, eventId) {
  const event = await db.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();
  if (!event) throw new HttpError(404, 'That event was not found.');
  return event;
}

export async function loadState(db, eventId) {
  const event = await getEvent(db, eventId);
  const [houses, snap] = await Promise.all([
    db.prepare('SELECT * FROM houses WHERE event_id = ? ORDER BY map_number').bind(eventId).all(),
    db.prepare('SELECT MAX(version) AS v FROM snapshots WHERE event_id = ?').bind(eventId).first()
  ]);
  if (!event.boundary_geojson) throw new HttpError(500, 'This event has no boundary configured.');
  return { event, houses: houses.results, version: snap?.v || 0, boundary: JSON.parse(event.boundary_geojson) };
}

export function auditStatement(db, { actor, action, entity, entityId, before, after, batchId = null }) {
  return db.prepare('INSERT INTO audit_log (at, actor, action, entity, entity_id, before_json, after_json, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(nowISO(), actor, action, entity, entityId ?? null, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, batchId);
}

const publicView = (event, houses) => JSON.stringify({
  e: [event.title, event.status, event.date, event.start_time, event.end_time, event.print_extent_json],
  h: houses.filter(h => h.status === 'published').map(rowToPublicHouse)
});

/**
 * Apply a change. `statements` mutate rows; `nextEvent`/`nextHouses` are the in-memory results used to build the snapshot.
 * A snapshot is written only when what the public sees changed (or `force` is set, e.g. a restore).
 */
export async function commit(db, state, { statements, audits, nextEvent = state.event, nextHouses = state.houses, actor, force = false }) {
  const changed = force || publicView(state.event, state.houses) !== publicView(nextEvent, nextHouses);
  const batch = [...statements, ...audits.map(a => auditStatement(db, { actor, ...a }))];
  let snapshot = null;
  if (changed) {
    const now = nowISO();
    snapshot = buildSnapshot({ event: nextEvent, houses: nextHouses, version: state.version + 1, now, boundary: state.boundary });
    const payload = JSON.stringify(snapshot);
    batch.push(db.prepare('INSERT INTO snapshots (event_id, version, created_at, created_by, payload_json, etag) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(state.event.id, snapshot.version, now, actor, payload, await etagFor(payload)));
  }
  try { await db.batch(batch); }
  catch (error) {
    if (/UNIQUE|constraint/i.test(String(error?.message))) throw new HttpError(409, 'Someone else changed this at the same time (or the address or number is already used). Reload and try again.');
    throw error;
  }
  return { snapshot };
}

export async function latestSnapshot(db, eventId) {
  return db.prepare('SELECT version, payload_json, etag, created_at FROM snapshots WHERE event_id = ? ORDER BY version DESC LIMIT 1').bind(eventId).first();
}

export const houseToAdmin = row => ({
  id: row.id, eventId: row.event_id, mapNumber: row.map_number, name: row.name, address: row.address_display, description: row.description,
  icon: row.icon, lat: row.lat, lng: row.lng, locationStatus: row.location_status, locationSource: row.location_source,
  status: row.status, version: row.version, updatedAt: row.updated_at, updatedBy: row.updated_by
});
