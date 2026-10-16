// Public snapshot contract (05-TECH-SPEC 5.4). Strict: unknown fields are rejected so PII cannot leak.
import { inBoundary } from './geo.mjs';

const TOP = ['schema', 'eventId', 'version', 'publishedAt', 'event', 'boundary', 'printExtent', 'trail', 'houses'];
const EVENT = ['name', 'year', 'date', 'start', 'end', 'timeZone', 'status'];
const HOUSE = ['id', 'mapNumber', 'name', 'address', 'description', 'icon', 'lat', 'lng', 'location'];
const LOCATIONS = ['verified', 'approximate', 'none'];

const extra = (obj, allowed) => Object.keys(obj).filter(k => !allowed.includes(k));
const isStr = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\u0000-\u001f]/.test(v);

/** Returns an array of error strings (empty = valid). */
export function validateSnapshot(s) {
  const errors = [];
  if (!s || typeof s !== 'object' || Array.isArray(s)) return ['snapshot must be an object'];
  for (const k of extra(s, TOP)) errors.push(`unexpected field: ${k}`);
  if (s.schema !== 1) errors.push('schema must be 1');
  if (!isStr(s.eventId, 80)) errors.push('eventId required');
  if (!Number.isInteger(s.version) || s.version < 1) errors.push('version must be a positive integer');
  if (!isStr(s.publishedAt, 40) || Number.isNaN(Date.parse(s.publishedAt))) errors.push('publishedAt must be a date');
  if (!s.event || typeof s.event !== 'object') errors.push('event required');
  else {
    for (const k of extra(s.event, EVENT)) errors.push(`unexpected event field: ${k}`);
    if (!isStr(s.event.name, 120)) errors.push('event.name required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.event.date || '')) errors.push('event.date invalid');
  }
  const ring = s.boundary?.type === 'Polygon' ? s.boundary.coordinates?.[0] : null;
  if (s.boundary != null && !ring) errors.push('boundary must be a Polygon');
  if (!Array.isArray(s.houses)) { errors.push('houses must be an array'); return errors; }
  const ids = new Set(), numbers = new Set();
  let previous = 0;
  for (const h of s.houses) {
    if (!h || typeof h !== 'object') { errors.push('house must be an object'); continue; }
    for (const k of extra(h, HOUSE)) errors.push(`unexpected house field: ${k}`);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(h.id || '')) errors.push(`bad house id: ${h.id}`);
    if (ids.has(h.id)) errors.push(`duplicate id: ${h.id}`);
    ids.add(h.id);
    if (!Number.isInteger(h.mapNumber) || h.mapNumber < 1) errors.push(`bad mapNumber for ${h.id}`);
    if (numbers.has(h.mapNumber)) errors.push(`duplicate mapNumber: ${h.mapNumber}`);
    numbers.add(h.mapNumber);
    if (h.mapNumber < previous) errors.push('houses must be sorted by mapNumber');
    previous = h.mapNumber;
    if (!isStr(h.name, 500)) errors.push(`bad name for ${h.id}`);
    if (!isStr(h.address, 500)) errors.push(`bad address for ${h.id}`);
    if (h.description != null && (typeof h.description !== 'string' || h.description.length > 280)) errors.push(`bad description for ${h.id}`);
    if (!isStr(h.icon, 80)) errors.push(`bad icon for ${h.id}`);
    if (!LOCATIONS.includes(h.location)) errors.push(`bad location for ${h.id}`);
    else if (h.location === 'none') { if (h.lat != null || h.lng != null) errors.push(`${h.id} has coordinates but location is none`); }
    else if (!Number.isFinite(h.lat) || !Number.isFinite(h.lng)) errors.push(`${h.id} needs finite coordinates`);
    else if (ring && !inBoundary(h, ring, 50)) errors.push(`${h.id} is outside the boundary`);
  }
  return errors;
}

export function assertSnapshot(s) {
  const errors = validateSnapshot(s);
  if (errors.length) throw new Error(`Invalid snapshot: ${errors.slice(0, 5).join('; ')}`);
  return s;
}

/** Choose the snapshot with the higher version; invalid candidates are ignored. */
export function pickNewest(...candidates) {
  return candidates.filter(c => c && validateSnapshot(c).length === 0)
    .reduce((best, c) => (!best || c.version > best.version ? c : best), null);
}
