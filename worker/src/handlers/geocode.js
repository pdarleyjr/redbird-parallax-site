// Admin-only geocoding (never called from public pages). US Census first, Nominatim as a fallback.
import { HttpError, json, readJSON } from '../lib/http.js';
import { normalizeAddress } from '../../../shared/address.mjs';
import { inBoundary } from '../../../shared/geo.mjs';
import { loadState } from '../lib/db.js';

const cache = new Map();
let lastNominatim = 0;

async function census(display) {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
  url.search = new URLSearchParams({ address: `${display}, Miami, FL 33155`, benchmark: 'Public_AR_Current', format: 'json' });
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const m = (await res.json()).result?.addressMatches?.[0];
  return m ? { lat: Number(m.coordinates.y.toFixed(6)), lng: Number(m.coordinates.x.toFixed(6)), matched: m.matchedAddress, source: 'census' } : null;
}

async function nominatim(display) {
  const wait = 1100 - (Date.now() - lastNominatim);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastNominatim = Date.now();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: `${display}, Miami, FL`, format: 'json', limit: '1' });
  const res = await fetch(url, { headers: { 'User-Agent': 'redbird-trails-admin/1.0 (neighborhood event; contact via github.com/pdarleyjr)' }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const hit = (await res.json())[0];
  return hit ? { lat: Number(Number(hit.lat).toFixed(6)), lng: Number(Number(hit.lon).toFixed(6)), matched: hit.display_name, source: 'nominatim' } : null;
}

/** Only trust a match whose street agrees with the request; otherwise the admin places the pin by hand. */
export async function geocodeAddress(display, ring) {
  const expected = normalizeAddress(display).key;
  if (cache.has(expected)) return cache.get(expected);
  let hit = await census(display).catch(() => null);
  if (hit && normalizeAddress(hit.matched).key !== expected) hit = null;
  if (!hit) hit = await nominatim(display).catch(() => null);
  const result = hit ? { ...hit, inBoundary: inBoundary(hit, ring, 50) } : null;
  cache.set(expected, result);
  return result;
}

export async function geocode(ctx) {
  const body = await readJSON(ctx.request);
  const a = normalizeAddress(String(body.address || ''));
  if (a.warnings.includes('unparsed')) throw new HttpError(422, 'That address could not be read.');
  const state = await loadState(ctx.db, body.eventId || 'halloween-2026');
  const hit = await geocodeAddress(a.display, state.boundary.coordinates[0]);
  return json({ address: a.display, suggestions: hit ? [{ lat: hit.lat, lng: hit.lng, source: hit.source, matched: hit.matched }] : [], inBoundary: hit?.inBoundary ?? false });
}
