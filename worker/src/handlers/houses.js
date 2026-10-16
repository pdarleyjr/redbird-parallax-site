// House CRUD, publication transitions and renumbering. All writes go through commit().
import { HttpError, json, readJSON } from '../lib/http.js';
import { loadState, commit, houseToAdmin, nowISO } from '../lib/db.js';
import { validateName, validateDescription, validateAddress, validateIcon, validateLocation } from '../lib/validate.js';
import { idForNumber, nextNumber } from '../../../shared/numbering.mjs';
import icons from '../../../data/icons.json';

const KNOWN_ICONS = new Set(icons.icons.map(i => i.key));
const DEFAULT_EVENT = 'halloween-2026';

function assertNoDuplicate(houses, key, exceptId) {
  const dup = houses.find(h => h.address_key === key && h.status !== 'archived' && h.id !== exceptId);
  if (dup) throw new HttpError(409, `That address is already on the trail as #${dup.map_number} ${dup.name}.`);
}

const insertSQL = `INSERT INTO houses (id, event_id, map_number, name, address_display, address_key, description, icon, lat, lng, location_status, location_source, status, version, created_at, updated_at, updated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`;

export function newHouseRow(ctx, { eventId, number, name, address, description, icon, location, status }) {
  const now = nowISO();
  return {
    id: idForNumber(number), event_id: eventId, map_number: number, name, address_display: address.display, address_key: address.key, description,
    icon, lat: location.lat, lng: location.lng, location_status: location.location_status, location_source: location.location_source,
    status, version: 1, created_at: now, updated_at: now, updated_by: ctx.actor
  };
}

export const insertStatement = (db, r) => db.prepare(insertSQL).bind(r.id, r.event_id, r.map_number, r.name, r.address_display, r.address_key, r.description, r.icon, r.lat, r.lng, r.location_status, r.location_source, r.status, r.created_at, r.updated_at, r.updated_by);

export async function listHouses(ctx) {
  const eventId = ctx.url.searchParams.get('event') || DEFAULT_EVENT;
  const status = ctx.url.searchParams.get('status');
  const state = await loadState(ctx.db, eventId);
  const flags = await ctx.db.prepare('SELECT house_id, code, detail FROM house_flags WHERE resolved_at IS NULL AND house_id IN (SELECT id FROM houses WHERE event_id = ?)').bind(eventId).all();
  const byHouse = new Map();
  for (const f of flags.results) byHouse.set(f.house_id, [...(byHouse.get(f.house_id) || []), { code: f.code, detail: f.detail }]);
  const rows = state.houses.filter(h => !status || h.status === status);
  const count = s => state.houses.filter(h => h.status === s).length;
  return json({
    houses: rows.map(h => ({ ...houseToAdmin(h), flags: byHouse.get(h.id) || [] })),
    counts: { published: count('published'), draft: count('draft'), review: count('review'), archived: count('archived'), approximate: state.houses.filter(h => h.status === 'published' && h.location_status === 'suggested').length },
    snapshotVersion: state.version, boundary: state.boundary, event: { id: state.event.id, status: state.event.status }
  });
}

export async function getHouse(ctx, id) {
  const row = await ctx.db.prepare('SELECT * FROM houses WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'That house was not found.');
  return json(houseToAdmin(row));
}

export async function createHouse(ctx) {
  const body = await readJSON(ctx.request);
  const eventId = body.eventId || DEFAULT_EVENT;
  const state = await loadState(ctx.db, eventId);
  const name = validateName(body.name), address = validateAddress(body.address);
  assertNoDuplicate(state.houses, address.key);
  const row = newHouseRow(ctx, {
    eventId, number: nextNumber(state.houses.map(h => ({ mapNumber: h.map_number }))), name, address,
    description: validateDescription(body.description), icon: validateIcon(body.icon || 'candy-pumpkin', KNOWN_ICONS),
    location: validateLocation(body, state.boundary.coordinates[0]), status: 'draft'
  });
  await commit(ctx.db, state, {
    statements: [insertStatement(ctx.db, row)], nextHouses: [...state.houses, row], actor: ctx.actor,
    audits: [{ action: 'house.create', entity: 'house', entityId: row.id, after: row }]
  });
  return json(houseToAdmin(row), { status: 201 });
}

function expectVersion(request, row) {
  const header = request.headers.get('If-Match');
  if (header == null) throw new HttpError(428, 'Reload the house before saving (missing version).');
  if (Number(String(header).replace(/"/g, '')) !== row.version) throw new HttpError(409, 'Someone else changed this house. Reload to see the latest.');
}

export async function patchHouse(ctx, id) {
  const body = await readJSON(ctx.request);
  const state = await loadState(ctx.db, (await ctx.db.prepare('SELECT event_id FROM houses WHERE id = ?').bind(id).first())?.event_id ?? DEFAULT_EVENT);
  const row = state.houses.find(h => h.id === id);
  if (!row) throw new HttpError(404, 'That house was not found.');
  expectVersion(ctx.request, row);
  const next = { ...row, updated_at: nowISO(), updated_by: ctx.actor, version: row.version + 1 };
  if ('name' in body) next.name = validateName(body.name);
  if ('description' in body) next.description = validateDescription(body.description);
  if ('icon' in body) next.icon = validateIcon(body.icon, KNOWN_ICONS);
  if ('address' in body) {
    const a = validateAddress(body.address);
    assertNoDuplicate(state.houses, a.key, id);
    next.address_display = a.display; next.address_key = a.key;
  }
  if ('lat' in body || 'lng' in body) Object.assign(next, validateLocation(body, state.boundary.coordinates[0]));
  else if (body.verified === true && row.location_status !== 'none') next.location_status = 'verified';
  const statement = ctx.db.prepare('UPDATE houses SET name=?, address_display=?, address_key=?, description=?, icon=?, lat=?, lng=?, location_status=?, location_source=?, version=?, updated_at=?, updated_by=? WHERE id=? AND version=?')
    .bind(next.name, next.address_display, next.address_key, next.description, next.icon, next.lat, next.lng, next.location_status, next.location_source, next.version, next.updated_at, next.updated_by, id, row.version);
  await commit(ctx.db, state, {
    statements: [statement], nextHouses: state.houses.map(h => (h.id === id ? next : h)), actor: ctx.actor,
    audits: [{ action: 'house.update', entity: 'house', entityId: id, before: row, after: next }]
  });
  return json(houseToAdmin(next));
}

const TRANSITIONS = {
  publish: { from: ['draft', 'review'], to: 'published' },
  unpublish: { from: ['published'], to: 'draft' },
  archive: { from: ['draft', 'review', 'published'], to: 'archived' },
  restore: { from: ['archived'], to: 'draft' }
};

export async function transition(ctx, id, action) {
  const rule = TRANSITIONS[action];
  const found = await ctx.db.prepare('SELECT event_id FROM houses WHERE id = ?').bind(id).first();
  if (!found) throw new HttpError(404, 'That house was not found.');
  const state = await loadState(ctx.db, found.event_id);
  const row = state.houses.find(h => h.id === id);
  if (!rule.from.includes(row.status)) throw new HttpError(409, `A ${row.status} house cannot be ${action}ed.`);
  if (action === 'restore') assertNoDuplicate(state.houses, row.address_key, id);
  const next = { ...row, status: rule.to, version: row.version + 1, updated_at: nowISO(), updated_by: ctx.actor };
  const statement = ctx.db.prepare('UPDATE houses SET status=?, version=?, updated_at=?, updated_by=? WHERE id=?').bind(next.status, next.version, next.updated_at, next.updated_by, id);
  const { snapshot } = await commit(ctx.db, state, {
    statements: [statement], nextHouses: state.houses.map(h => (h.id === id ? next : h)), actor: ctx.actor,
    audits: [{ action: `house.${action}`, entity: 'house', entityId: id, before: { status: row.status }, after: { status: next.status } }]
  });
  return json({ house: houseToAdmin(next), snapshotVersion: snapshot?.version ?? state.version });
}

export async function renumber(ctx) {
  const body = await readJSON(ctx.request);
  const state = await loadState(ctx.db, body.eventId || DEFAULT_EVENT);
  const active = state.houses.filter(h => h.status !== 'archived');
  const order = Array.isArray(body.order) ? body.order : [];
  if (order.length !== active.length || new Set(order).size !== order.length || !active.every(h => order.includes(h.id))) throw new HttpError(422, 'The new order must list every active house exactly once.');
  const archived = state.houses.filter(h => h.status === 'archived').sort((a, b) => a.map_number - b.map_number).map(h => h.id);
  const finalOrder = [...order, ...archived];
  const OFFSET = 1_000_000;
  const statements = [
    ctx.db.prepare('UPDATE houses SET map_number = map_number + ? WHERE event_id = ?').bind(OFFSET, state.event.id),
    ...finalOrder.map((hid, i) => ctx.db.prepare('UPDATE houses SET map_number = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ?').bind(i + 1, nowISO(), ctx.actor, hid))
  ];
  const nextHouses = state.houses.map(h => ({ ...h, map_number: finalOrder.indexOf(h.id) + 1 }));
  await commit(ctx.db, state, {
    statements, nextHouses, actor: ctx.actor, force: true,
    audits: [{ action: 'house.renumber', entity: 'event', entityId: state.event.id, before: state.houses.map(h => [h.id, h.map_number]), after: finalOrder.map((hid, i) => [hid, i + 1]) }]
  });
  return json({ renumbered: finalOrder.length });
}
