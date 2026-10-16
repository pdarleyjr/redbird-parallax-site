// Version history and restore. A restore copies an old payload into a NEW (higher) version and re-aligns the house rows,
// including their map numbers, so printed maps and deep links match the restored data.
import { HttpError, json } from '../lib/http.js';
import { loadState, commit, nowISO, versionGuard } from '../lib/db.js';
import { normalizeAddress } from '../../../shared/address.mjs';
import { assertSnapshot } from '../../../shared/snapshot-schema.mjs';
import { insertStatement } from './houses.js';

const OFFSET = 1_000_000;
const locationStatus = l => (l === 'none' ? 'none' : l === 'verified' ? 'verified' : 'suggested');

export async function list(ctx) {
  const eventId = ctx.url.searchParams.get('event') || 'halloween-2026';
  if (!/^[\w-]{1,60}$/.test(eventId)) throw new HttpError(400, 'Unknown event.');
  const rows = await ctx.db.prepare('SELECT version, created_at, created_by, payload_json FROM snapshots WHERE event_id = ? ORDER BY version DESC LIMIT 60').bind(eventId).all();
  return json(rows.results.map(r => {
    const payload = JSON.parse(r.payload_json);
    return { version: r.version, createdAt: r.created_at, createdBy: r.created_by, houseCount: payload.houses.length, located: payload.houses.filter(h => h.location !== 'none').length };
  }));
}

export async function restore(ctx, eventId, version) {
  const row = await ctx.db.prepare('SELECT payload_json FROM snapshots WHERE event_id = ? AND version = ?').bind(eventId, Number(version)).first();
  if (!row) throw new HttpError(404, 'That version was not found.');
  const old = assertSnapshot(JSON.parse(row.payload_json));
  const state = await loadState(ctx.db, eventId);
  const now = nowISO();
  const wanted = new Map(old.houses.map(h => [h.id, h]));
  const skipped = [];

  // A restored house cannot share an address with an active house that is NOT being restored.
  const activeOutside = new Set(state.houses.filter(h => h.status !== 'archived' && !wanted.has(h.id)).map(h => h.address_key));
  const restorable = new Map();
  for (const [id, w] of wanted) {
    if (activeOutside.has(normalizeAddress(w.address).key)) skipped.push(id); else restorable.set(id, w);
  }

  const maxOld = Math.max(0, ...old.houses.map(h => h.mapNumber));
  let spare = maxOld;
  const statements = [ctx.db.prepare('UPDATE houses SET map_number = map_number + ? WHERE event_id = ?').bind(OFFSET, eventId)];
  const nextHouses = [];
  for (const h of state.houses) {
    const w = restorable.get(h.id);
    if (w) {
      const next = {
        ...h, name: w.name, address_display: w.address, address_key: normalizeAddress(w.address).key, description: w.description, icon: w.icon, lat: w.lat, lng: w.lng,
        location_status: locationStatus(w.location), status: 'published', map_number: w.mapNumber, version: h.version + 1, updated_at: now, updated_by: ctx.actor
      };
      statements.push(ctx.db.prepare('UPDATE houses SET name=?, address_display=?, address_key=?, description=?, icon=?, lat=?, lng=?, location_status=?, status=?, map_number=?, version=?, updated_at=?, updated_by=? WHERE id=?')
        .bind(next.name, next.address_display, next.address_key, next.description, next.icon, next.lat, next.lng, next.location_status, next.status, next.map_number, next.version, now, ctx.actor, h.id));
      nextHouses.push(next);
      restorable.delete(h.id);
      continue;
    }
    const number = ++spare; // houses that were not part of that version move to fresh numbers after it
    const unpublish = h.status === 'published';
    const next = { ...h, map_number: number, status: unpublish ? 'draft' : h.status, version: h.version + 1 };
    statements.push(ctx.db.prepare('UPDATE houses SET map_number=?, status=?, version=version+1, updated_at=?, updated_by=? WHERE id=?').bind(number, next.status, now, ctx.actor, h.id));
    nextHouses.push(next);
  }
  for (const w of restorable.values()) { // houses deleted since then (for example an undone import) come back as published rows
    const a = normalizeAddress(w.address);
    const r = {
      id: w.id, event_id: eventId, map_number: w.mapNumber, name: w.name, address_display: w.address, address_key: a.key, description: w.description, icon: w.icon, lat: w.lat, lng: w.lng,
      location_status: locationStatus(w.location), location_source: 'restore', status: 'published', version: 1, created_at: now, updated_at: now, updated_by: ctx.actor
    };
    statements.push(insertStatement(ctx.db, r)); nextHouses.push(r);
  }
  const guards = state.houses.map(h => versionGuard(ctx.db, h.id, h.version));
  const { snapshot } = await commit(ctx.db, state, {
    statements: [...guards, ...statements], nextHouses, actor: ctx.actor, meta: ctx.meta, force: true,
    audits: [{ action: 'snapshot.restore', entity: 'snapshot', entityId: `${eventId}@${version}`, after: { restoredFrom: Number(version), skipped } }]
  });
  return json({ version: snapshot.version, restoredFrom: Number(version), skipped });
}
