// Event status (draft, updating, published, archived), audit log and the public-safe CSV export.
import { HttpError, json, readJSON } from '../lib/http.js';
import { loadState, commit, nowISO } from '../lib/db.js';

const STATUSES = ['draft', 'updating', 'published', 'archived'];
const eventView = e => ({ id: e.id, kind: e.kind, year: e.year, slug: e.slug, title: e.title, status: e.status, date: e.date, start: e.start_time, end: e.end_time, timeZone: e.time_zone, details: JSON.parse(e.details_json || '{}'), updatedAt: e.updated_at, updatedBy: e.updated_by });

export async function listEvents(ctx) {
  const rows = await ctx.db.prepare('SELECT * FROM events ORDER BY year DESC, kind').all();
  return json(rows.results.map(eventView));
}

export async function getEvent(ctx, id) {
  const e = await ctx.db.prepare('SELECT * FROM events WHERE id = ?').bind(id).first();
  if (!e) throw new HttpError(404, 'That event was not found.');
  return json(eventView(e));
}

export async function patchEvent(ctx, id) {
  const body = await readJSON(ctx.request);
  const state = await loadState(ctx.db, id);
  const next = { ...state.event, updated_at: nowISO(), updated_by: ctx.actor };
  const details = JSON.parse(state.event.details_json || '{}');
  if ('title' in body) { if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 120) throw new HttpError(422, 'The title must be 1 to 120 characters.'); next.title = body.title.trim(); }
  if ('date' in body) { if (body.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) throw new HttpError(422, 'Use the date format YYYY-MM-DD.'); next.date = body.date; }
  for (const [k, col] of [['start', 'start_time'], ['end', 'end_time']]) if (k in body) { if (body[k] != null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body[k])) throw new HttpError(422, 'Use 24-hour times like 18:00.'); next[col] = body[k]; }
  if ('description' in body) { if (body.description != null && String(body.description).length > 500) throw new HttpError(422, 'The description can be at most 500 characters.'); details.description = body.description || null; }
  if ('status' in body) {
    if (!STATUSES.includes(body.status)) throw new HttpError(422, 'Choose a valid status.');
    if (body.status === 'published' && (!next.date || !next.title || !details.description)) throw new HttpError(422, 'Add a title, date and description before publishing this event.');
    if (body.confirm !== true && body.status !== state.event.status) throw new HttpError(422, 'Please confirm the status change.');
    next.status = body.status;
  }
  next.details_json = JSON.stringify(details);
  const statement = ctx.db.prepare('UPDATE events SET title=?, status=?, date=?, start_time=?, end_time=?, details_json=?, updated_at=?, updated_by=? WHERE id=?')
    .bind(next.title, next.status, next.date, next.start_time, next.end_time, next.details_json, next.updated_at, next.updated_by, id);
  await commit(ctx.db, state, { statements: [statement], nextEvent: next, actor: ctx.actor, meta: ctx.meta, audits: [{ action: 'event.update', entity: 'event', entityId: id, before: eventView(state.event), after: eventView(next) }] });
  return json(eventView(next));
}

export async function audit(ctx) {
  const limit = Math.min(Math.max(Math.trunc(Number(ctx.url.searchParams.get('limit'))) || 100, 1), 200);
  const rows = await ctx.db.prepare('SELECT id, at, actor, action, entity, entity_id FROM audit_log ORDER BY id DESC LIMIT ?').bind(limit).all();
  return json(rows.results);
}

const csvCell = v => { const s = v == null ? '' : String(v); return /^[=+\-@\t\r]/.test(s) || /[",\n]/.test(s) ? `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"` : s; };

export async function exportCSV(ctx) {
  const eventId = ctx.url.searchParams.get('event') || 'halloween-2026';
  if (!/^[\w-]{1,60}$/.test(eventId)) throw new HttpError(400, 'Unknown event.');
  const rows = await ctx.db.prepare('SELECT map_number, name, address_display, icon, lat, lng, location_status, status FROM houses WHERE event_id = ? ORDER BY map_number').bind(eventId).all();
  const header = 'number,name,address,icon,lat,lng,location,status';
  const lines = rows.results.map(r => [r.map_number, r.name, r.address_display, r.icon, r.lat, r.lng, r.location_status, r.status].map(csvCell).join(','));
  return new Response([header, ...lines].join('\n') + '\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${eventId}-houses.csv"`, 'X-Content-Type-Options': 'nosniff' } });
}
