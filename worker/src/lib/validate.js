// Input validation for admin requests. Plain checks (no dependency), friendly messages.
import { normalizeAddress } from '../../../shared/address.mjs';
import { inBoundary } from '../../../shared/geo.mjs';
import { HttpError } from './http.js';

const clean = value => (typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim() : value);

export function validateName(value) {
  const name = clean(value);
  if (typeof name !== 'string' || name.length < 1 || name.length > 80) throw new HttpError(422, 'Give the house a name of 1 to 80 characters.');
  return name;
}

export function validateDescription(value) {
  if (value == null || value === '') return null;
  const text = clean(value);
  if (typeof text !== 'string' || text.length > 280) throw new HttpError(422, 'The description can be at most 280 characters.');
  return text;
}

export function validateAddress(value) {
  const a = normalizeAddress(typeof value === 'string' ? value : '');
  if (a.warnings.includes('unparsed')) throw new HttpError(422, 'That address could not be read. Use a format like “3800 SW 58th Avenue”.');
  return a;
}

export function validateIcon(value, known) {
  if (typeof value !== 'string' || !/^[a-z0-9-]{1,60}$/.test(value) || (known && !known.has(value))) throw new HttpError(422, 'Choose an icon from the list.');
  return value;
}

/** Returns {lat,lng,location_status} with inBoundary check, or nulls when no coordinates given. */
export function validateLocation(input, ring) {
  const { lat, lng } = input || {};
  if (lat == null && lng == null) return { lat: null, lng: null, location_status: 'none', location_source: null };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(422, 'The pin location is not valid.');
  if (!inBoundary({ lat, lng }, ring, 50)) throw new HttpError(422, 'That pin is outside the trail area.');
  const verified = input.verified === true;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), location_status: verified ? 'verified' : 'suggested', location_source: ['manual', 'census', 'nominatim'].includes(input.source) ? input.source : 'manual' };
}

export function requireString(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, `${label} is required.`);
  return value.trim();
}
