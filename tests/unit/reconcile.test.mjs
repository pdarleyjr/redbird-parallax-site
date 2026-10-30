import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reconcile } from '../../shared/reconcile.mjs';

const roster = JSON.parse(await readFile(new URL('../../data/reconcile/roster-2026-10-09.json', import.meta.url), 'utf8')).houses;

// Synthetic export: every published house (address variants), a conflict, a blank name, 15 fictional new houses.
function syntheticExport() {
  const rows = [];
  let index = 0;
  const add = (submittedOn, address, houseName) => rows.push({ rowIndex: index++, submittedOn, address, houseName });
  for (let n = 15; n >= 1; n--) add(n < 8 ? '2026-10-14' : '2026-10-15', `${100 + n} sw ${30 + n} st miami, fl 33155`.replace(/ st /, ' st '), `Synthetic Fixture ${n}`);
  for (const house of roster) {
    if (house.id === 'stop-10') continue;
    add('2026-09-10', house.address.toUpperCase().replace('STREET', 'St'), house.id === 'stop-05' ? '' : house.name + ' 🎃');
  }
  add('2026-10-04', roster.find(h => h.id === 'stop-10').address, 'Corner House of Horrors');
  add('2026-09-08', roster.find(h => h.id === 'stop-10').address.replace('Avenue', 'Ave'), 'The House of Screams');
  return rows;
}

test('synthetic export reconciles with the expected shape', () => {
  const rows = syntheticExport();
  const out = reconcile(rows, roster);
  assert.equal(out.summary.rows, rows.length);
  assert.equal(out.summary.matched, roster.length);
  assert.equal(out.summary.new, 15);
  assert.equal(out.summary.notInExport, 0);
  assert.equal(out.matched.filter(m => m.class === 'duplicate_conflict').length, 1);
  assert.equal(out.matched.find(m => m.houseId === 'stop-10').class, 'duplicate_conflict');
  assert.equal(out.matched.find(m => m.houseId === 'stop-05').class, 'incomplete_name');
  assert.equal(out.matched.filter(m => m.class === 'cosmetic').length, roster.length - 2);
  assert.deepEqual(out.added.map(a => a.mapNumber), Array.from({ length: 15 }, (_, i) => roster.length + 1 + i));
  assert.equal(out.added[0].houseId, `stop-${roster.length + 1}`);
});
test('new houses are numbered by earliest submission, ties by reverse export order', () => {
  const rows = [
    { rowIndex: 0, submittedOn: '2026-10-15', address: '1 SW 40th Street', houseName: 'Newest' },
    { rowIndex: 1, submittedOn: '2026-10-15', address: '2 SW 40th Street', houseName: 'Same day later in export' },
    { rowIndex: 2, submittedOn: '2026-10-09', address: '3 SW 40th Street', houseName: 'Oldest' }
  ];
  const out = reconcile(rows, []);
  assert.deepEqual(out.added.map(a => a.submittedName), ['Oldest', 'Same day later in export', 'Newest']);
});
test('re-reconciling with the new houses published yields no new rows (idempotent)', () => {
  const first = reconcile(syntheticExport(), roster);
  const published = [...roster, ...first.added.map(a => ({ id: a.houseId, mapNumber: a.mapNumber, name: a.submittedName, address: a.address }))];
  const second = reconcile(syntheticExport(), published);
  assert.equal(second.summary.new, 0);
  assert.equal(second.summary.notInExport, 0);
});
test('published houses absent from the export are only reported, never removed', () => {
  const out = reconcile([], roster);
  assert.equal(out.notInExport.length, roster.length);
});
test('a name change never overwrites; it is flagged', () => {
  const out = reconcile([{ rowIndex: 0, submittedOn: '2026-10-10', address: roster[0].address, houseName: 'Totally Different' }], roster);
  assert.equal(out.matched[0].class, 'name_changed');
  assert.equal(out.matched[0].publishedName, roster[0].name);
});
test('zip mismatch flag is carried onto new houses', () => {
  const out = reconcile([{ rowIndex: 0, submittedOn: '2026-10-10', address: '9 SW 40th St, Miami, FL 33154', houseName: 'X' }], []);
  assert.ok(out.added[0].flags.includes('zip_mismatch'));
});
test('local private CSV (if present) reproduces the documented totals', async t => {
  const path = process.env.RB_CSV || 'C:/Users/Peter Darley/Downloads/Red_Bird_Trick-or-Treat_Trail_2026-10-16_05_15_39.csv';
  let text;
  try { text = await readFile(path, 'utf8'); } catch { t.skip('private CSV not available'); return; }
  const { parseCsv, toRegistrations } = await import('../../shared/csv.mjs');
  const { registrations } = toRegistrations(parseCsv(text));
  const out = reconcile(registrations, roster);
  assert.equal(out.summary.rows, 47);
  assert.equal(out.summary.addresses, 46);
  assert.equal(out.summary.matched, 31);
  assert.equal(out.summary.new, 15);
  assert.equal(out.matched.find(m => m.houseId === 'stop-10').class, 'duplicate_conflict');
  assert.equal(out.matched.find(m => m.houseId === 'stop-05').class, 'incomplete_name');
  assert.equal(out.added.filter(a => a.flags.includes('zip_mismatch')).length, 1);
});

test('the committed sanitized fixture (date, address, house name only) reproduces the documented totals', async () => {
  const { parseCsv, toRegistrations } = await import('../../shared/csv.mjs');
  const text = await readFile(new URL('../fixtures/registrations-2026-10-16.sanitized.csv', import.meta.url), 'utf8');
  const parsed = parseCsv(text);
  assert.deepEqual(parsed.header, ['Submission Date', 'Address', 'Give Your House a Halloween Name']);
  const { registrations } = toRegistrations(parsed);
  const out = reconcile(registrations, roster);
  assert.deepEqual(out.summary, { rows: 47, addresses: 46, matched: 31, new: 15, notInExport: 0 });
  assert.equal(out.matched.find(m => m.houseId === 'stop-10').class, 'duplicate_conflict');
  assert.equal(out.matched.find(m => m.houseId === 'stop-05').class, 'incomplete_name');
  assert.equal(out.added.filter(a => a.flags.includes('zip_mismatch')).length, 1);
  assert.deepEqual(out.added.map(a => a.mapNumber), Array.from({ length: 15 }, (_, i) => 32 + i));
  const again = reconcile(registrations, [...roster, ...out.added.map(a => ({ id: a.houseId, mapNumber: a.mapNumber, name: a.submittedName, address: a.address }))]);
  assert.equal(again.summary.new, 0);
});

test('archived (reserved) map numbers are never reused for new houses', () => {
  const rows = [{ rowIndex: 0, submittedOn: '2026-10-15', address: '1 SW 40th Street', houseName: 'Fresh' }];
  const out = reconcile(rows, roster.slice(0, 5), { reserved: [1, 2, 3, 4, 5, 31] });
  assert.equal(out.added[0].mapNumber, 32);
  assert.equal(out.added[0].houseId, 'stop-32');
});

test('Oct 23 export (53 rows, 52 addresses): the 46 published houses match and the 6 new ones are numbered 47-52 by earliest submission', async () => {
  const { parseCsv, toRegistrations } = await import('../../shared/csv.mjs');
  const snapshot = JSON.parse(await readFile(new URL('../../data/halloween-2026.public.json', import.meta.url), 'utf8'));
  const published = snapshot.houses.filter(h => h.mapNumber <= 46).map(h => ({ id: h.id, mapNumber: h.mapNumber, name: h.name, address: h.address }));
  const { registrations } = toRegistrations(parseCsv(await readFile(new URL('../fixtures/registrations-2026-10-23.sanitized.csv', import.meta.url), 'utf8')));
  const out = reconcile(registrations, published);
  assert.equal(out.summary.rows, 53);
  assert.equal(out.summary.addresses, 52);
  assert.equal(out.summary.matched, 46);
  assert.equal(out.summary.new, 6);
  assert.deepEqual(out.added.map(a => a.mapNumber), [47, 48, 49, 50, 51, 52]);
  assert.deepEqual(out.added.map(a => a.houseId), ['stop-47', 'stop-48', 'stop-49', 'stop-50', 'stop-51', 'stop-52']);
  // the two houses submitted on the same day (49 and 50) keep the tie rule: reverse export order
  assert.deepEqual(out.added.map(a => a.submittedName.slice(0, 8)), ['Refreshm', 'Scully’s', 'Bob the ', 'The Litt', 'CARME-NA', 'Coraline']);
  // after publishing them, a second run finds nothing new
  const again = reconcile(registrations, [...published, ...out.added.map(a => ({ id: a.houseId, mapNumber: a.mapNumber, name: a.submittedName, address: a.address }))]);
  assert.equal(again.summary.new, 0);
});
test('the earlier Oct 16 fixture still reconciles to 31 matched + 15 new', async () => {
  const { parseCsv, toRegistrations } = await import('../../shared/csv.mjs');
  const { registrations } = toRegistrations(parseCsv(await readFile(new URL('../fixtures/registrations-2026-10-16.sanitized.csv', import.meta.url), 'utf8')));
  const out = reconcile(registrations, roster);
  assert.equal(out.summary.matched, 31);
  assert.equal(out.summary.new, 15);
});

test('Oct 30 export (58 rows, 57 addresses): the 52 published houses match and the 4 new ones are numbered 53-56 by earliest submission', async () => {
  const { parseCsv, toRegistrations } = await import('../../shared/csv.mjs');
  const snapshot = JSON.parse(await readFile(new URL('../../data/halloween-2026.public.json', import.meta.url), 'utf8'));
  const published = snapshot.houses.filter(h => h.mapNumber <= 52).map(h => ({ id: h.id, mapNumber: h.mapNumber, name: h.name, address: h.address }));
  const { registrations } = toRegistrations(parseCsv(await readFile(new URL('../fixtures/registrations-2026-10-30.sanitized.csv', import.meta.url), 'utf8')));
  const out = reconcile(registrations, published);
  assert.deepEqual([out.summary.rows, out.summary.addresses, out.summary.matched, out.summary.new], [58, 57, 52, 4]);
  assert.deepEqual(out.added.map(a => a.houseId), ['stop-53', 'stop-54', 'stop-55', 'stop-56']);
  assert.deepEqual(out.added.map(a => a.address), ['3930 SW 60th Avenue', '3715 SW 60th Place', '3801 SW 60th Avenue', '3800 SW 59th Avenue']);
  // the published snapshot holds exactly these, so a second run finds nothing new
  const again = reconcile(registrations, snapshot.houses.map(h => ({ id: h.id, mapNumber: h.mapNumber, name: h.name, address: h.address })));
  assert.equal(again.summary.new, 0);
});
