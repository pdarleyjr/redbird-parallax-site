// Print extent = boundary bbox padded 6% (same rule as scripts/make-snapshot.mjs).
export function printExtentFromRing(ring, pad = 0.06) {
  const lngs = ring.map(p => p[0]), lats = ring.map(p => p[1]);
  const [w, e, s, n] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
  const [dx, dy] = [(e - w) * pad, (n - s) * pad];
  return [w - dx, s - dy, e + dx, n + dy].map(v => Number(v.toFixed(5)));
}
