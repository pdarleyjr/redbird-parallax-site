// Deterministic de-overlap of numbered circles for the printed map.
const DIRECTIONS = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);

/** points: [{id, mapNumber, x, y}] in drawing units; diameter in the same units. */
export function layoutMarkers(points, diameter) {
  const placed = [];
  const free = (cx, cy) => placed.every(p => Math.hypot(p.cx - cx, p.cy - cy) >= diameter);
  for (const point of [...points].sort((a, b) => a.mapNumber - b.mapNumber)) {
    let spot = free(point.x, point.y) ? { cx: point.x, cy: point.y } : null;
    for (let ring = 1; !spot && ring <= 6; ring++) {
      for (const [dx, dy] of DIRECTIONS) {
        const cx = point.x + dx * diameter * 1.2 * ring, cy = point.y + dy * diameter * 1.2 * ring;
        if (free(cx, cy)) { spot = { cx, cy }; break; }
      }
    }
    if (!spot) throw new Error(`No free spot for marker ${point.mapNumber}`);
    placed.push({ ...point, ...spot, leader: spot.cx !== point.x || spot.cy !== point.y });
  }
  return placed;
}
