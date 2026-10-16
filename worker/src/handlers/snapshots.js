// Version history and restore. A restore copies an old payload into a NEW (higher) version and re-aligns the house rows.
import { HttpError, json } from '../lib/http.js';
import { loadState, commit, nowISO } from '../lib/db.js';
import { normalizeAddress } from '../../../shared/address.mjs';
import { assertSnapshot } from '../../../shared/snapshot-schema.mjs';
import { insertStatement } from './houses.js';

export async function list(ctx) {
  const eventId = ctx.url.searchParams.get('event') || 'halloween-2026';
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
  const wanted = new Map(old.houses.map(h => [h.id, h]));
  const statements = [], nextHouses = [];
  const now = nowISO();
  for (const h of state.houses) {
    const w = wanted.get(h.id);
    if (w) {
      const next = {
        ...h, name: w.name, address_display: w.address, address_key: normalizeAddress(w.address).key, description: w.description, icon: w.icon, lat: w.lat, lng: w.lng,
        location_status: w.location === 'none' ? 'none' : (w.location === 'verified' ? 'verified' : 'suggested'), status: 'published', version: h.version + 1, updated_at: now, updated_by: ctx.actor
      };
      statements.push(ctx.db.prepare('UPDATE houses SET name=?, address_display=?, address_key=?, description=?, icon=?, lat=?, lng=?, location_status=?, status=?, version=?, updated_at=?, updated_by=? WHERE id=?')
        .bind(next.name, next.address_display, next.address_key, next.description, next.icon, next.lat, next.lng, next.location_status, next.status, next.version, now, ctx.actor, h.id));
      nextHouses.push(next);
      wanted.delete(h.id);
    } else if (h.status === 'published') {
      statements.push(ctx.db.prepare("UPDATE houses SET status='draft', version=version+1, updated_at=?, updated_by=? WHERE id=?").bind(now, ctx.actor, h.id));
      nextHouses.push({ ...h, status: 'draft', version: h.version + 1 });
    } else nextHouses.push(h);
  }
  for (const w of wanted.values()) { // houses deleted since then (e.g. an undone import) come back as published rows
    const a = normalizeAddress(w.address);
    const r = { id: w.id, event_id: eventId, map_number: w.mapNumber, name: w.name, address_display: w.address, address_key: a.key, description: w.description, icon: w.icon, lat: w.lat, lng: w.lng,
      location_status: w.location === 'none' ? 'none' : (w.location === 'verified' ? 'verified' : 'suggested'), location_source: 'restore', status: 'published', version: 1, created_at: now, updated_at: now, updated_by: ctx.actor };
    statements.push(insertStatement(ctx.db, r)); nextHouses.push(r);
  }
  const { snapshot } = await commit(ctx.db, state, { statements, nextHouses, actor: ctx.actor, force: true, audits: [{ action: 'snapshot.restore', entity: 'snapshot', entityId: `${eventId}@${version}`, after: { restoredFrom: Number(version) } }] });
  return json({ version: snapshot.version, restoredFrom: Number(version) });
}
