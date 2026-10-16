// Reconcile registration rows (date/address/name only) against the published houses.
import { normalizeAddress } from './address.mjs';
import { compareNames, normalizeName, similarNames } from './names.mjs';
import { idForNumber, nextNumber } from './numbering.mjs';

/**
 * @param {{rowIndex:number, submittedOn:string|null, address:string, houseName:string}[]} registrations export order = newest first
 * @param {{id:string, mapNumber:number, name:string, address:string}[]} published
 */
export function reconcile(registrations, published) {
  const publishedByKey = new Map(published.map(h => [normalizeAddress(h.address).key, h]));
  const groups = new Map();
  const items = [];
  for (const reg of registrations) {
    const addr = normalizeAddress(reg.address);
    if (addr.warnings.includes('unparsed')) { items.push({ class: 'unparsed_address', rowIndex: reg.rowIndex, flags: ['unparsed'] }); continue; }
    if (!groups.has(addr.key)) groups.set(addr.key, { addr, rows: [] });
    groups.get(addr.key).rows.push(reg);
  }

  const matched = [], fresh = [];
  for (const [key, { addr, rows }] of groups) {
    // Newest submission wins; equal dates: lower row index is newer (export is newest-first).
    const sorted = [...rows].sort((a, b) => (b.submittedOn || '').localeCompare(a.submittedOn || '') || a.rowIndex - b.rowIndex);
    const latest = sorted[0];
    const flags = [...addr.warnings];
    const names = new Set(rows.map(r => normalizeName(r.houseName)).filter(Boolean));
    let duplicate = null;
    if (rows.length > 1) duplicate = names.size > 1 ? 'duplicate_conflict' : 'duplicate_same';
    const house = publishedByKey.get(key);
    const base = { key, address: addr.display, submittedOn: latest.submittedOn, rowIndexes: rows.map(r => r.rowIndex), submittedName: latest.houseName, flags };
    if (duplicate) flags.push(duplicate);
    if (house) {
      let cls;
      if (!normalizeName(latest.houseName)) { cls = 'incomplete_name'; flags.push('missing_name'); }
      else if (latest.houseName.trim() === house.name) cls = 'unchanged';
      else cls = compareNames(house.name, latest.houseName);
      if (duplicate === 'duplicate_conflict') cls = 'duplicate_conflict';
      matched.push({ ...base, class: cls, houseId: house.id, mapNumber: house.mapNumber, publishedName: house.name });
    } else {
      let cls = 'new';
      if (!normalizeName(latest.houseName)) { cls = 'incomplete_name'; flags.push('missing_name'); }
      if (duplicate === 'duplicate_conflict') cls = 'duplicate_conflict';
      const earliest = [...rows].sort((a, b) => (a.submittedOn || '').localeCompare(b.submittedOn || '') || b.rowIndex - a.rowIndex)[0];
      fresh.push({ ...base, class: cls, isNew: true, earliestOn: earliest.submittedOn, earliestRow: earliest.rowIndex });
    }
  }

  // New houses get numbers by earliest submission; same-day ties by reverse export order.
  fresh.sort((a, b) => (a.earliestOn || '').localeCompare(b.earliestOn || '') || b.earliestRow - a.earliestRow);
  let cursor = nextNumber(published);
  const added = fresh.map(f => {
    const mapNumber = cursor++;
    return { ...f, mapNumber, houseId: idForNumber(mapNumber) };
  });
  for (const a of added) {
    for (const other of [...published.map(h => h.name), ...added.filter(x => x !== a).map(x => x.submittedName)]) {
      if (a.submittedName && similarNames(a.submittedName, other) && !a.flags.includes('similar_name')) a.flags.push('similar_name');
    }
  }
  const seen = new Set(matched.map(m => m.houseId));
  const notInExport = published.filter(h => !seen.has(h.id)).map(h => h.id);
  const summary = {
    rows: registrations.length,
    addresses: groups.size + items.length,
    matched: matched.length,
    new: added.length,
    notInExport: notInExport.length
  };
  return { matched, added, items, notInExport, summary };
}
