// CSV import: the browser parses the file and sends only date, address and house name (never contact details).
import { HttpError, json, readJSON } from '../lib/http.js';
import { loadState, commit, nowISO, auditStatement } from '../lib/db.js';
import { reconcile } from '../../../shared/reconcile.mjs';
import { normalizeAddress } from '../../../shared/address.mjs';
import { normalizeName } from '../../../shared/names.mjs';
import { nextNumber } from '../../../shared/numbering.mjs';
import { validateName, validateIcon } from '../lib/validate.js';
import { geocodeAddress } from './geocode.js';
import { newHouseRow, insertStatement } from './houses.js';

const MAX_ROWS = 500;
const SKIP = new Set(['unchanged', 'cosmetic']);

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) throw new HttpError(422, `Send between 1 and ${MAX_ROWS} rows.`);
  return rows.map((r, i) => ({
    rowIndex: Number.isInteger(r.rowIndex) ? r.rowIndex : i,
    submittedOn: /^\d{4}-\d{2}-\d{2}$/.test(r.submittedOn || '') ? r.submittedOn : null,
    address: String(r.address ?? '').slice(0, 200), houseName: String(r.houseName ?? '').slice(0, 200)
  }));
}

export async function preview(ctx) {
  const body = await readJSON(ctx.request, 400_000);
  const eventId = body.eventId || 'halloween-2026';
  const rows = validateRows(body.rows);
  if (!/^[0-9a-f]{64}$/.test(body.fileSha256 || '')) throw new HttpError(422, 'Missing file fingerprint.');
  const state = await loadState(ctx.db, eventId);
  const existing = state.houses.filter(h => h.status !== 'archived').map(h => ({ id: h.id, mapNumber: h.map_number, name: h.name, address: h.address_display }));
  const result = reconcile(rows, existing, { reserved: state.houses.map(h => h.map_number) });
  const prior = await ctx.db.prepare("SELECT created_at FROM import_batches WHERE event_id = ? AND file_sha256 = ? AND status = 'applied' ORDER BY created_at DESC LIMIT 1").bind(eventId, body.fileSha256).first();
  const known = new Set((await ctx.db.prepare("SELECT ir.fingerprint FROM import_rows ir JOIN import_batches ib ON ib.id = ir.batch_id WHERE ib.event_id = ? AND ib.status = 'applied' AND ir.decision IN ('accepted','skipped_known')").bind(eventId).all()).results.map(r => r.fingerprint));
  const groups = [...result.matched, ...result.added, ...result.items];
  const batchId = crypto.randomUUID();
  const rowStatements = [];
  for (const g of groups) {
    for (const idx of g.rowIndexes || [g.rowIndex]) {
      const src = rows.find(r => r.rowIndex === idx);
      const fp = await sha256Hex(`${eventId}|${src.submittedOn}|${normalizeAddress(src.address).key}|${normalizeName(src.houseName)}`);
      const isKnown = known.has(fp);
      g.known = g.known || isKnown;
      const cls = isKnown ? 'known_fingerprint' : g.class;
      const decision = isKnown || SKIP.has(g.class) ? 'skipped_known' : 'pending';
      rowStatements.push(ctx.db.prepare('INSERT INTO import_rows (batch_id, row_index, fingerprint, submitted_on, address_raw, house_name_raw, classification, target_house_id, decision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(batchId, idx, fp, src.submittedOn, src.address, src.houseName, cls, g.houseId ?? null, decision));
    }
  }
  await ctx.db.batch([
    ctx.db.prepare("INSERT INTO import_batches (id, event_id, file_sha256, row_count, status, summary_json, created_at, created_by) VALUES (?, ?, ?, ?, 'previewed', ?, ?, ?)")
      .bind(batchId, eventId, body.fileSha256, rows.length, JSON.stringify(result.summary), nowISO(), ctx.actor),
    ...rowStatements,
    auditStatement(ctx.db, { actor: ctx.actor, meta: ctx.meta, action: 'import.preview', entity: 'import', entityId: batchId, after: result.summary, batchId })
  ]);
  const view = g => ({ key: g.key, address: g.address, class: g.known ? 'known_fingerprint' : g.class, flags: g.flags || [], rowIndexes: g.rowIndexes || [g.rowIndex], submittedOn: g.submittedOn || null, submittedName: g.submittedName ?? null, publishedName: g.publishedName ?? null, houseId: g.houseId ?? null, mapNumber: g.mapNumber ?? null });
  return json({ batchId, summary: result.summary, alreadyImportedOn: prior?.created_at || null, groups: groups.map(view), notInExport: result.notInExport });
}

export async function apply(ctx, batchId) {
  const body = await readJSON(ctx.request);
  const batch = await ctx.db.prepare('SELECT * FROM import_batches WHERE id = ?').bind(batchId).first();
  if (!batch) throw new HttpError(404, 'That import was not found.');
  if (batch.status !== 'previewed') throw new HttpError(409, 'That import was already applied or undone.');
  const state = await loadState(ctx.db, batch.event_id);
  const rows = (await ctx.db.prepare('SELECT * FROM import_rows WHERE batch_id = ? ORDER BY row_index').bind(batchId).all()).results;
  const decisions = new Map((Array.isArray(body.decisions) ? body.decisions : []).filter(d => d && Number.isInteger(d.rowIndex)).map(d => [d.rowIndex, d]));
  const registrations = rows.map(r => ({ rowIndex: r.row_index, submittedOn: r.submitted_on, address: r.address_raw, houseName: r.house_name_raw }));
  const result = reconcile(registrations, state.houses.filter(h => h.status !== 'archived').map(h => ({ id: h.id, mapNumber: h.map_number, name: h.name, address: h.address_display })), { reserved: state.houses.map(h => h.map_number) });
  const statements = [], audits = [], nextHouses = [...state.houses];
  let number = nextNumber(state.houses.map(h => ({ mapNumber: h.map_number })));
  const accepted = new Set();
  let geocodes = 0;
  for (const g of [...result.added, ...result.matched]) {
    const lead = (g.rowIndexes || []).map(i => decisions.get(i)).find(d => d?.decision === 'accepted');
    if (!lead) continue;
    if (g.rowIndexes.every(i => rows.find(r => r.row_index === i)?.decision === 'skipped_known')) continue;
    if (g.isNew) {
      const name = validateName(lead.override?.name ?? g.submittedName);
      const address = normalizeAddress(g.address);
      let location = { lat: null, lng: null, location_status: 'none', location_source: null };
      if (geocodes++ < 25) {
        const hit = await geocodeAddress(address.display, state.boundary.coordinates[0]).catch(() => null);
        if (hit?.inBoundary) location = { lat: hit.lat, lng: hit.lng, location_status: 'suggested', location_source: hit.source };
      }
      const row = newHouseRow(ctx, { eventId: state.event.id, number: number++, name, address, description: null, icon: validateIcon(lead.override?.icon || 'candy-pumpkin'), location, status: 'review' });
      statements.push(insertStatement(ctx.db, row));
      nextHouses.push(row);
      audits.push({ action: 'house.create', entity: 'house', entityId: row.id, after: row, batchId });
      for (const f of g.flags.filter(x => ['zip_mismatch', 'similar_name', 'duplicate_conflict', 'missing_name'].includes(x))) {
        statements.push(ctx.db.prepare('INSERT INTO house_flags (house_id, code, detail, created_at) VALUES (?, ?, ?, ?)').bind(row.id, f, null, nowISO()));
      }
    } else if (g.class === 'name_changed') {
      if (!lead.override?.name) throw new HttpError(422, `Choose the name to use for ${g.address} before accepting a name change.`);
      const next = { ...state.houses.find(h => h.id === g.houseId) };
      const before = { ...next };
      next.name = validateName(lead.override.name); next.version += 1; next.updated_at = nowISO(); next.updated_by = ctx.actor;
      statements.push(ctx.db.prepare('UPDATE houses SET name=?, version=?, updated_at=?, updated_by=? WHERE id=?').bind(next.name, next.version, next.updated_at, next.updated_by, next.id));
      nextHouses[nextHouses.findIndex(h => h.id === next.id)] = next;
      audits.push({ action: 'house.update', entity: 'house', entityId: next.id, before: { name: before.name, version: before.version }, after: { name: next.name, version: next.version }, batchId });
    } else continue;
    for (const idx of g.rowIndexes) accepted.add(idx);
  }
  for (const r of rows) {
    const d = decisions.get(r.row_index)?.decision;
    const final = accepted.has(r.row_index) ? 'accepted' : (d === 'rejected' ? 'rejected' : r.decision);
    statements.push(ctx.db.prepare('UPDATE import_rows SET decision = ? WHERE batch_id = ? AND row_index = ?').bind(final, batchId, r.row_index));
  }
  statements.push(ctx.db.prepare("UPDATE import_batches SET status = 'applied' WHERE id = ?").bind(batchId));
  audits.push({ action: 'import.apply', entity: 'import', entityId: batchId, after: { accepted: accepted.size }, batchId });
  await commit(ctx.db, state, { statements, audits, nextHouses, actor: ctx.actor, meta: ctx.meta });
  return json({ batchId, accepted: accepted.size });
}

export async function rollback(ctx, batchId) {
  const batch = await ctx.db.prepare('SELECT * FROM import_batches WHERE id = ?').bind(batchId).first();
  if (!batch) throw new HttpError(404, 'That import was not found.');
  if (batch.status !== 'applied') throw new HttpError(409, 'Only an applied import can be undone.');
  const state = await loadState(ctx.db, batch.event_id);
  const log = (await ctx.db.prepare("SELECT * FROM audit_log WHERE batch_id = ? AND action IN ('house.create','house.update') ORDER BY id DESC").bind(batchId).all()).results;
  const edited = [], statements = [];
  let nextHouses = [...state.houses];
  for (const entry of log) {
    const current = state.houses.find(h => h.id === entry.entity_id);
    const after = JSON.parse(entry.after_json);
    if (!current || current.version !== after.version) { edited.push(entry.entity_id); continue; }
    if (entry.action === 'house.create') {
      statements.push(ctx.db.prepare('DELETE FROM house_flags WHERE house_id = ?').bind(entry.entity_id), ctx.db.prepare('DELETE FROM houses WHERE id = ?').bind(entry.entity_id));
      nextHouses = nextHouses.filter(h => h.id !== entry.entity_id);
    } else {
      const before = JSON.parse(entry.before_json);
      statements.push(ctx.db.prepare('UPDATE houses SET name = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ?').bind(before.name, nowISO(), ctx.actor, entry.entity_id));
      nextHouses = nextHouses.map(h => (h.id === entry.entity_id ? { ...h, name: before.name, version: h.version + 1 } : h));
    }
  }
  if (edited.length) throw new HttpError(409, `These houses were edited after the import, so it cannot be undone automatically: ${edited.join(', ')}.`, { houses: edited });
  statements.push(ctx.db.prepare("UPDATE import_batches SET status = 'rolled_back' WHERE id = ?").bind(batchId));
  await commit(ctx.db, state, { statements, nextHouses, actor: ctx.actor, meta: ctx.meta, audits: [{ action: 'import.rollback', entity: 'import', entityId: batchId, batchId: null }] });
  return json({ batchId, undone: log.length });
}

export async function listBatches(ctx) {
  const rows = await ctx.db.prepare('SELECT id, event_id, row_count, status, summary_json, created_at, created_by FROM import_batches ORDER BY created_at DESC LIMIT 30').all();
  return json(rows.results.map(r => ({ ...r, summary: JSON.parse(r.summary_json) })));
}
