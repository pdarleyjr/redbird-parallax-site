// Geographic helpers shared by browser, build scripts and Workers.
const R = 6371008.8;
const rad = d => d * Math.PI / 180;
const finite = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

export function distanceMeters(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDegrees(a, b) {
  const [p1, p2, dl] = [rad(a.lat), rad(b.lat), rad(b.lng - a.lng)];
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

const LABELS = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
export const compassLabel = degrees => LABELS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];

export function formatDistance(meters) {
  const feet = meters * 3.28084;
  if (feet < 528) return `${Math.max(10, Math.round(feet / 10) * 10)} ft`;
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

/** polygon = ring of [lng, lat]. Ray casting. */
export function pointInPolygon(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > point.lat) !== (yj > point.lat) && point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToSegment(p, [x1, y1], [x2, y2]) {
  const k = Math.cos(rad(p.lat)), mx = 111320;
  const [px, py, ax, ay, bx, by] = [p.lng * k * mx, p.lat * 110574, x1 * k * mx, y1 * 110574, x2 * k * mx, y2 * 110574];
  const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len2)) : 0;
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
}

export function inBoundary(point, ring, bufferMeters = 0) {
  if (!finite(point) || point.lat < 25.70 || point.lat > 25.77 || point.lng < -80.33 || point.lng > -80.26) return false;
  if (pointInPolygon(point, ring)) return true;
  return ring.some((v, i) => distanceToSegment(point, v, ring[(i + 1) % ring.length]) <= bufferMeters);
}

/** Houses with coordinates sorted by distance (ties: lower map number). Visited ids are skipped. */
export function nearest(houses, here, visited = new Set()) {
  return houses
    .filter(h => finite(h) && !visited.has(h.id))
    .map(house => ({ house, meters: distanceMeters(here, house), bearing: bearingDegrees(here, house) }))
    .sort((a, b) => a.meters - b.meters || a.house.mapNumber - b.house.mapNumber);
}

/** Web-Mercator helpers for the print overlay. */
export const mercatorY = lat => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2));
export function projectToBounds({ lat, lng }, [west, south, east, north], width, height) {
  return {
    x: (lng - west) / (east - west) * width,
    y: (mercatorY(north) - mercatorY(lat)) / (mercatorY(north) - mercatorY(south)) * height
  };
}

/** Small deterministic hash (FNV-1a) of the print extent so browser and Node agree synchronously. */
export function extentHash(extent) {
  const text = JSON.stringify((extent || []).map(v => Number(v.toFixed(5))));
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
