// Pin head layout shared by the live map and the print page (same look as tools/flyer-map/build_flyer.py).
// Each house has a ground point (anchor). Its themed icon sits on a round head lifted above the anchor on a needle.
// Heads never overlap each other, never cover another house's ground dot, stay above their own anchor and stay inside the bounds.
// Pure and deterministic (greedy placement, top houses first, searching outwards from the preferred spot). No DOM.

const TAU = Math.PI * 2;

/**
 * @param {{id:string, x:number, y:number}[]} anchors ground points in screen/drawing px (y grows downward)
 * @param {{radius:number, gap?:number, avoid?:{x:number,y:number,width:number,height:number}[], bounds?:{width:number, height:number}, maxUp?:number, maxSide?:number}} options
 * @returns {{id:string, ax:number, ay:number, hx:number, hy:number}[]} in input order
 */
export function layoutPins(anchors, options) {
  const R = options.radius;
  const s = R / 14;                         // the flyer was tuned for R = 14
  const gap = options.gap ?? 4 * s;
  const lift = 36 * s;                      // preferred needle length
  const minLift = 18 * s;                   // heads sit at least this far above their anchor
  const maxUp = options.maxUp ?? 400 * s;
  const maxSide = options.maxSide ?? 400 * s;
  const bounds = options.bounds;
  const avoid = options.avoid ?? [];           // screen rects (map controls) a head must stay clear of
  const need = 2 * R + gap;
  const clearDot = R + 5 * s;               // a head stays this far from any other house's ground dot
  const step = R / 3;

  const inside = (x, y, p) => {
    if (y > p.ay - minLift || y < p.ay - maxUp || Math.abs(x - p.ax) > maxSide) return false;
    for (const r of avoid) if (x > r.x - R && x < r.x + r.width + R && y > r.y - R && y < r.y + r.height + R) return false;
    return !bounds || (x >= R + 4 && x <= bounds.width - R - 4 && y >= R + 4 && y <= bounds.height - R - 4);
  };
  const free = (x, y, p, placed, dots) => {
    for (const q of placed) if (Math.hypot(x - q.hx, y - q.hy) < need) return false;
    for (const d of dots) if (d !== p && Math.hypot(x - d.ax, y - d.ay) < clearDot) return false;
    return true;
  };

  const pins = anchors.map(a => ({ id: a.id, ax: a.x, ay: a.y, hx: a.x, hy: a.y - lift }));
  const order = [...pins].sort((a, b) => a.ay - b.ay || a.ax - b.ax);   // top houses first: lower ones find room above them
  const placed = [];
  const maxRing = Math.ceil(Math.max(options.bounds?.width ?? 2000, options.bounds?.height ?? 2000) / step);
  for (const p of order) {
    const px = p.ax, py = p.ay - lift;
    let spot = null;
    search: for (let ring = 0; ring <= maxRing; ring++) {
      const r = ring * step;
      const count = ring === 0 ? 1 : Math.max(8, Math.round((TAU * r) / step));
      for (let i = 0; i < count; i++) {
        // angle 0 = straight up; alternate right/left so the result does not lean one way
        const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
        const ang = (k / count) * TAU;
        const x = px + Math.sin(ang) * r, y = py - Math.cos(ang) * r;
        if (inside(x, y, p) && free(x, y, p, placed, pins)) { spot = { x, y }; break search; }
      }
    }
    if (!spot) spot = { x: Math.min(Math.max(px, R + 4), (bounds?.width ?? px + R) - R - 4), y: Math.max(Math.min(py, p.ay - minLift), R + 4) }; // overcrowded: keep the preferred spot
    p.hx = spot.x; p.hy = spot.y;
    placed.push(p);
  }
  return pins;
}

/** Closest pair of heads (for tests and diagnostics). */
export function closestHeads(pins) {
  let best = Infinity;
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) best = Math.min(best, Math.hypot(pins[i].hx - pins[j].hx, pins[i].hy - pins[j].hy));
  return best;
}
