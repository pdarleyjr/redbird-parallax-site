import { beforeEach, describe, expect, it } from 'vitest';
import { api, env, publicGet, resetDatabase, startSession } from './helpers.js';

beforeEach(async () => { await resetDatabase(); await startSession(); });

const goodHouse = (over = {}) => ({ name: 'Fixture Manor', address: '3700 SW 61st Avenue', icon: 'ghost', lat: 25.7365, lng: -80.2925, ...over });
const snapshotVersion = async () => (await env.DB.prepare('SELECT MAX(version) AS v FROM snapshots WHERE event_id = ?').bind('halloween-2026').first()).v;
const created = async over => (await api('/api/houses', { method: 'POST', body: goodHouse(over) })).body.data;

describe('houses', () => {
  it('lists the seeded 31 published houses', async () => {
    const res = await api('/api/houses');
    expect(res.body.data.houses).toHaveLength(46);
    expect(res.body.data.counts.published).toBe(46);
    expect(res.body.data.snapshotVersion).toBe(2);
  });
  it('creates a draft with the next number, without changing the public snapshot', async () => {
    const before = await snapshotVersion();
    const house = await created();
    expect(house).toMatchObject({ id: 'stop-47', mapNumber: 47, status: 'draft', address: '3700 SW 61st Avenue', locationStatus: 'suggested' });
    expect(await snapshotVersion()).toBe(before);
  });
  it('rejects a duplicate address with 409 and an out-of-boundary pin with 422', async () => {
    expect((await api('/api/houses', { method: 'POST', body: goodHouse({ address: '3911 sw 60 court' }) })).status).toBe(409);
    const out = await api('/api/houses', { method: 'POST', body: goodHouse({ lat: 25.75, lng: -80.2925 }) });
    expect(out.status).toBe(422);
    expect(out.body.error.message).toMatch(/outside the trail area/);
  });
  it('publish and unpublish regenerate the snapshot with an incremented version and the right house set', async () => {
    const house = await created();
    const pub = await api(`/api/houses/${house.id}/publish`, { method: 'POST', body: {} });
    expect(pub.status).toBe(200);
    expect(pub.body.data.snapshotVersion).toBe(3);
    let latest = (await (await publicGet('/v1/events/halloween-2026/public')).json()).data;
    expect(latest.version).toBe(3);
    expect(latest.houses).toHaveLength(47);
    const un = await api(`/api/houses/${house.id}/unpublish`, { method: 'POST', body: {} });
    expect(un.body.data.snapshotVersion).toBe(4);
    latest = (await (await publicGet('/v1/events/halloween-2026/public')).json()).data;
    expect(latest.houses).toHaveLength(46);
  });
  it('If-Match conflicts return 409 and missing If-Match returns 428', async () => {
    const house = await created();
    const ok = await api(`/api/houses/${house.id}`, { method: 'PATCH', body: { name: 'Renamed' }, headers: { 'If-Match': String(house.version) } });
    expect(ok.status).toBe(200);
    expect(ok.body.data.version).toBe(2);
    expect((await api(`/api/houses/${house.id}`, { method: 'PATCH', body: { name: 'Stale' }, headers: { 'If-Match': '1' } })).status).toBe(409);
    expect((await api(`/api/houses/${house.id}`, { method: 'PATCH', body: { name: 'NoVersion' } })).status).toBe(428);
  });
  it('editing a published house updates the snapshot; archiving keeps the number reserved', async () => {
    const res = await api('/api/houses/stop-01', { method: 'PATCH', body: { name: 'Skeleton Dog Deluxe' }, headers: { 'If-Match': '1' } });
    expect(res.status).toBe(200);
    expect(await snapshotVersion()).toBe(3);
    const arch = await api('/api/houses/stop-46/archive', { method: 'POST', body: {} });
    expect(arch.status).toBe(200);
    const next = await created();
    expect(next.mapNumber).toBe(47);
    const back = await api('/api/houses/stop-46/restore', { method: 'POST', body: {} });
    expect(back.body.data.house.mapNumber).toBe(46);
  });
  it('renumber assigns contiguous numbers in the requested order and keeps ids', async () => {
    const list = (await api('/api/houses')).body.data.houses.map(h => h.id);
    const order = [list[1], list[0], ...list.slice(2)];
    const res = await api('/api/houses/renumber', { method: 'POST', body: { order } });
    expect(res.status).toBe(200);
    const after = (await api('/api/houses')).body.data.houses;
    expect(after.find(h => h.id === list[1]).mapNumber).toBe(1);
    expect(after.find(h => h.id === list[0]).mapNumber).toBe(2);
    expect((await api('/api/houses/renumber', { method: 'POST', body: { order: order.slice(1) } })).status).toBe(422);
  });
  it('validates names, descriptions and icons', async () => {
    expect((await api('/api/houses', { method: 'POST', body: goodHouse({ name: '' }) })).status).toBe(422);
    expect((await api('/api/houses', { method: 'POST', body: goodHouse({ description: 'x'.repeat(281) }) })).status).toBe(422);
    expect((await api('/api/houses', { method: 'POST', body: goodHouse({ icon: 'not-a-real-icon' }) })).status).toBe(422);
    expect((await api('/api/houses', { method: 'POST', body: goodHouse({ address: 'the corner house' }) })).status).toBe(422);
  });
});

describe('imports', () => {
  const sha = 'a'.repeat(64);
  const rows = [
    { rowIndex: 0, submittedOn: '2026-10-15', address: '3300 SW 61st Court', houseName: 'Brand New Boo' },
    { rowIndex: 1, submittedOn: '2026-09-10', address: '3911 sw 60th court', houseName: 'Skeleton Dog 🎃' },
    { rowIndex: 2, submittedOn: '2026-10-10', address: '3934 SW 58th Court', houseName: 'A Completely Different Name' }
  ];
  it('previews, applies accepted rows as review houses, and a repeat preview marks known rows', async () => {
    const p = await api('/api/imports/preview', { method: 'POST', body: { eventId: 'halloween-2026', fileSha256: sha, rows } });
    expect(p.status).toBe(200);
    const classes = Object.fromEntries(p.body.data.groups.map(g => [g.address, g.class]));
    expect(classes['3300 SW 61st Court']).toBe('new');
    expect(classes['3911 SW 60th Court']).toBe('cosmetic');
    expect(classes['3934 SW 58th Court']).toBe('name_changed');
    const nameChange = await api(`/api/imports/${p.body.data.batchId}/apply`, { method: 'POST', body: { decisions: [{ rowIndex: 2, decision: 'accepted' }] } });
    expect(nameChange.status).toBe(422);
    const applied = await api(`/api/imports/${p.body.data.batchId}/apply`, { method: 'POST', body: { decisions: [{ rowIndex: 0, decision: 'accepted' }, { rowIndex: 2, decision: 'rejected' }] } });
    expect(applied.status).toBe(200);
    const list = (await api('/api/houses')).body.data.houses;
    expect(list.find(h => h.id === 'stop-47')).toMatchObject({ status: 'review', name: 'Brand New Boo' });
    expect(await snapshotVersion()).toBe(2);
    const again = await api('/api/imports/preview', { method: 'POST', body: { eventId: 'halloween-2026', fileSha256: sha, rows } });
    expect(again.body.data.alreadyImportedOn).toBeTruthy();
    expect(again.body.data.groups.find(g => g.address === '3300 SW 61st Court').class).toBe('known_fingerprint');
  });
  it('rollback removes the created houses and restores the previous state; refuses if edited afterwards', async () => {
    const run = async () => {
      const p = await api('/api/imports/preview', { method: 'POST', body: { eventId: 'halloween-2026', fileSha256: sha, rows: [rows[0]] } });
      await api(`/api/imports/${p.body.data.batchId}/apply`, { method: 'POST', body: { decisions: [{ rowIndex: 0, decision: 'accepted' }] } });
      return p.body.data.batchId;
    };
    const batch = await run();
    expect((await api(`/api/imports/${batch}/rollback`, { method: 'POST', body: {} })).status).toBe(200);
    expect((await api('/api/houses')).body.data.houses.some(h => h.name === 'Brand New Boo')).toBe(false);
    const again = await api('/api/imports/preview', { method: 'POST', body: { eventId: 'halloween-2026', fileSha256: 'b'.repeat(64), rows: [rows[0]] } });
    await api(`/api/imports/${again.body.data.batchId}/apply`, { method: 'POST', body: { decisions: [{ rowIndex: 0, decision: 'accepted' }] } });
    await api('/api/houses/stop-47', { method: 'PATCH', body: { name: 'Edited after import' }, headers: { 'If-Match': '1' } });
    const refused = await api(`/api/imports/${again.body.data.batchId}/rollback`, { method: 'POST', body: {} });
    expect(refused.status).toBe(409);
  });
  it('stores no personal fields: import_rows only has date, address and house name', async () => {
    const cols = (await env.DB.prepare("SELECT name FROM pragma_table_info('import_rows')").all()).results.map(c => c.name);
    expect(cols.sort()).toEqual(['address_raw', 'batch_id', 'classification', 'decision', 'fingerprint', 'house_name_raw', 'row_index', 'submitted_on', 'target_house_id']);
  });
});

describe('snapshots and events', () => {
  it('restore copies an old payload into a new higher version and realigns the rows', async () => {
    await api('/api/houses/stop-01/unpublish', { method: 'POST', body: {} });
    expect(await snapshotVersion()).toBe(3);
    const res = await api('/api/snapshots/halloween-2026/2/restore', { method: 'POST', body: {} });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ version: 4, restoredFrom: 2 });
    const latest = (await (await publicGet('/v1/events/halloween-2026/public')).json()).data;
    expect(latest.houses).toHaveLength(46);
    expect((await api('/api/houses/stop-01')).body.data.status).toBe('published');
    const versions = (await api('/api/snapshots')).body.data.map(v => v.version);
    expect(versions).toEqual([4, 3, 2]);
  });
  it('restoring after a renumber brings back the old numbers, so printed maps and deep links match', async () => {
    const before = (await api('/api/houses')).body.data.houses.map(h => [h.id, h.mapNumber]);
    const order = before.map(([id]) => id).reverse();
    expect((await api('/api/houses/renumber', { method: 'POST', body: { order } })).status).toBe(200);
    const res = await api('/api/snapshots/halloween-2026/2/restore', { method: 'POST', body: {} });
    expect(res.status).toBe(200);
    const after = (await api('/api/houses')).body.data.houses.map(h => [h.id, h.mapNumber]);
    expect(after).toEqual(before);
    const latest = (await (await publicGet('/v1/events/halloween-2026/public')).json()).data;
    expect(latest.houses.map(h => [h.id, h.mapNumber])).toEqual(before);
  });
  it('event status changes need confirmation; publishing needs title, date and description', async () => {
    expect((await api('/api/events/christmas-2026', { method: 'PATCH', body: { status: 'published', confirm: true } })).status).toBe(422);
    expect((await api('/api/events/christmas-2026', { method: 'PATCH', body: { status: 'archived' } })).status).toBe(422);
    const ok = await api('/api/events/christmas-2026', { method: 'PATCH', body: { date: '2026-12-19', start: '18:00', end: '21:00', description: 'Lights and cocoa.', status: 'published', confirm: true } });
    expect(ok.status).toBe(200);
    const events = await (await publicGet('/v1/events')).json();
    expect(events.data.find(e => e.id === 'christmas-2026').status).toBe('published');
  });
  it('exports a CSV without personal data and with formula-injection protection', async () => {
    await api('/api/houses/stop-02', { method: 'PATCH', body: { name: '=HYPERLINK("x")' }, headers: { 'If-Match': '1' } });
    const csv = await api('/api/export.csv');
    expect(csv.status).toBe(200);
    expect(csv.text.split('\n')[0]).toBe('number,name,address,icon,lat,lng,location,status');
    expect(csv.text).toContain("'=HYPERLINK");
  });
  it('records an audit trail', async () => {
    await created();
    const audit = await api('/api/audit?limit=5');
    expect(audit.body.data[0]).toMatchObject({ action: 'house.create', actor: 'admin' });
  });
});

describe('public worker', () => {
  it('serves the latest snapshot with an ETag and answers 304', async () => {
    const res = await publicGet('/v1/events/halloween-2026/public');
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const etag = res.headers.get('ETag');
    const body = await res.json();
    expect(body.data.houses).toHaveLength(46);
    expect(await (await publicGet('/v1/events/halloween-2026/public', { 'If-None-Match': etag })).status).toBe(304);
  });
  it('only exposes schema fields (no emails or phones can leak)', async () => {
    const body = await (await publicGet('/v1/events/halloween-2026/public')).json();
    expect(Object.keys(body.data.houses[0]).sort()).toEqual(['address', 'description', 'icon', 'id', 'lat', 'lng', 'location', 'mapNumber', 'name']);
    expect(JSON.stringify(body)).not.toMatch(/@|phone|email/i);
  });
  it('rejects writes, hides draft events and 404s unknown routes', async () => {
    expect((await publicGet('/v1/events', {}, 'POST')).status).toBe(405);
    expect((await publicGet('/v1/nothing')).status).toBe(404);
    await env.DB.prepare("UPDATE events SET status = 'draft' WHERE id = 'christmas-2026'").run();
    expect((await publicGet('/v1/events/christmas-2026/public')).status).toBe(404);
    const events = await (await publicGet('/v1/events')).json();
    expect(events.data.map(e => e.id)).toEqual(['halloween-2026']);
  });
});
