// Pin layout shared by the live map and the print page (same look as tools/flyer-map/build_flyer.py).
// Each house has a ground point (anchor). Its themed icon sits on a round head lifted above the anchor on a needle.
// Heads never overlap, never cover another unit's ground dot, stay above their own anchor and inside the bounds.
// With `maxNeedle` set, no needle is longer than that; houses that cannot get a head within reach are grouped into a cluster
// (one head standing for several houses). Needles never cross. Pure and deterministic. No DOM.

const TAU = Math.PI * 2;
const MERGE_BIAS = 14;                 // px of extra distance per house already in a cluster, so clusters stay small

/**
 * @param {{id:string, x:number, y:number}[]} anchors ground points in screen/drawing px (y grows downward)
 * @param {{radius:number, gap?:number, bounds?:{width:number,height:number}, avoid?:{x:number,y:number,width:number,height:number}[],
 *          maxNeedle?:number, maxUp?:number, maxSide?:number}} options  maxNeedle = longest visible needle (below the head), enables clustering
 * @returns {{key:string, ids:string[], ax:number, ay:number, hx:number, hy:number}[]} units ordered by their first input house
 */
export function layoutPins(anchors, options) {
  const R = options.radius;
  const s = R / 14;                         // the flyer was tuned for R = 14
  const gap = options.gap ?? 4 * s;
  const clustering = options.maxNeedle != null;
  const maxLen = clustering ? options.maxNeedle + R : Infinity;      // head centre to anchor
  const lift = Math.min(36 * s, maxLen);    // preferred needle length (centre to anchor)
  const minLift = Math.min(18 * s, lift);   // heads sit at least this far above their anchor
  const maxUp = options.maxUp ?? 400 * s;
  const maxSide = options.maxSide ?? 400 * s;
  const bounds = options.bounds;
  const avoid = options.avoid ?? [];        // screen rects (map controls) a head must stay clear of
  const need = 2 * R + gap;
  const clearDot = R + 5 * s;               // a head stays this far from any other unit's ground dot
  const step = R / 3;
  const finite = Number.isFinite(maxLen);

  const inside = (x, y, u) => {
    // a single house's head sits above it; a cluster head may sit in any direction (that is what keeps clusters from snowballing)
    if (u.n === 1 ? y > u.ay - minLift : Math.hypot(x - u.ax, y - u.ay) < minLift) return false;
    if (y < u.ay - maxUp || Math.abs(x - u.ax) > maxSide) return false;
    if (finite && Math.hypot(x - u.ax, y - u.ay) > maxLen) return false;
    for (const r of avoid) if (x > r.x - R && x < r.x + r.width + R && y > r.y - R && y < r.y + r.height + R) return false;
    return !bounds || (x >= R + 4 && x <= bounds.width - R - 4 && y >= R + 4 && y <= bounds.height - R - 4);
  };
  const free = (x, y, u, placed, units) => {
    for (const q of placed) if (Math.hypot(x - q.hx, y - q.hy) < need) return false;
    for (const d of units) if (d !== u && Math.hypot(x - d.ax, y - d.ay) < clearDot) return false;
    return true;
  };
  const maxRing = Math.ceil((finite ? 2 * maxLen : Math.max(bounds?.width ?? 2000, bounds?.height ?? 2000)) / step);

  /** Greedy placement, top units first. Returns the units that found no spot (only when clustering is on). */
  function place(units) {
    const failed = [];
    const placed = [];
    for (const u of [...units].sort((a, b) => a.ay - b.ay || a.ax - b.ax)) {
      const px = u.ax, py = u.ay - lift;
      let spot = null;
      search: for (let ring = 0; ring <= maxRing; ring++) {
        const r = ring * step;
        const count = ring === 0 ? 1 : Math.max(8, Math.round((TAU * r) / step));
        for (let i = 0; i < count; i++) {
          const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);        // alternate right/left so the result does not lean one way
          const ang = (k / count) * TAU;
          const x = px + Math.sin(ang) * r, y = py - Math.cos(ang) * r;
          if (inside(x, y, u) && free(x, y, u, placed, units)) { spot = { x, y }; break search; }
        }
      }
      if (!spot) {
        if (clustering) { failed.push(u); continue; }
        spot = { x: Math.min(Math.max(px, R + 4), (bounds?.width ?? px + R) - R - 4), y: Math.max(Math.min(py, u.ay - minLift), R + 4) }; // overcrowded: keep the preferred spot
      }
      u.hx = spot.x; u.hy = spot.y;
      placed.push(u);
    }
    return failed;
  }

  let units = anchors.map((a, i) => ({ key: a.id, ids: [a.id], first: i, n: 1, ax: a.x, ay: a.y, hx: a.x, hy: a.y - lift }));
  for (let pass = 0; clustering && pass < 60; pass++) {
    const failed = place(units);
    if (!failed.length) break;
    // Merge each house that found no room with its nearest neighbour (once per pass); the cluster stands at their centre of gravity.
    const gone = new Set(), made = [];
    for (const u of failed) {
      if (gone.has(u)) continue;
      let best = null, bestD = Infinity;
      for (const v of units) if (v !== u && !gone.has(v)) { const d = Math.hypot(u.ax - v.ax, u.ay - v.ay) + MERGE_BIAS * (v.n - 1); if (d < bestD) { bestD = d; best = v; } }
      if (!best) { u.hx = u.ax; u.hy = u.ay - minLift; continue; }
      gone.add(u); gone.add(best);
      const n = u.n + best.n;
      made.push({ key: [...u.ids, ...best.ids].sort().join('+'), ids: [...u.ids, ...best.ids], first: Math.min(u.first, best.first), n,
        ax: (u.ax * u.n + best.ax * best.n) / n, ay: (u.ay * u.n + best.ay * best.n) / n, hx: 0, hy: 0 });
    }
    units = [...units.filter(u => !gone.has(u)), ...made];
  }
  if (!clustering) place(units);
  untangle(units, { inside });
  return units.sort((a, b) => a.first - b.first).map(({ key, ids, ax, ay, hx, hy }) => ({ key, ids, ax, ay, hx, hy }));
}

const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
/** Do the needles (anchor to head) of two units intersect? */
export function needlesCross(u, v) {
  const p1 = { x: u.ax, y: u.ay }, p2 = { x: u.hx, y: u.hy }, p3 = { x: v.ax, y: v.ay }, p4 = { x: v.hx, y: v.hy };
  const d1 = cross(p3, p4, p1), d2 = cross(p3, p4, p2), d3 = cross(p1, p2, p3), d4 = cross(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

/** Crossing penalty: where two needles cross, swap their heads when both heads stay valid. */
function untangle(units, { inside }) {
  for (let round = 0; round < 8; round++) {
    let swapped = false;
    for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
      const u = units[i], v = units[j];
      if (!needlesCross(u, v)) continue;
      if (inside(v.hx, v.hy, u) && inside(u.hx, u.hy, v)) {
        [u.hx, v.hx] = [v.hx, u.hx]; [u.hy, v.hy] = [v.hy, u.hy]; swapped = true;
      }
    }
    if (!swapped) break;
  }
}

/** Closest pair of heads (for tests and diagnostics). */
export function closestHeads(pins) {
  let best = Infinity;
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) best = Math.min(best, Math.hypot(pins[i].hx - pins[j].hx, pins[i].hy - pins[j].hy));
  return best;
}

/** Number of crossing needle pairs (for tests and diagnostics). */
export function crossings(pins) {
  let n = 0;
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) if (needlesCross(pins[i], pins[j])) n++;
  return n;
}
