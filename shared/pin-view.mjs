// What the map shows for a given view: planPins() picks needle pins or flat compact badges and groups houses into clusters;
// chooseDefaultView() picks where a phone should open. Pure (no DOM) so it is unit-tested and shared by the live map.
import { layoutPins, layoutFlat } from './pin-layout.mjs';

// Pin sizes to try, largest first: badge radius, longest visible needle (0 = flat, straight on the house).
export const LADDER = {
  phone: [{ radius: 20, needle: 20 }, { radius: 14, needle: 0 }],                 // 40 px on short needles, then 28 px flat badges
  desktop: [{ radius: 22, needle: 36 }, { radius: 18, needle: 26 }, { radius: 15, needle: 0 }]
};
export const MAX_CLUSTERS = 12, MIN_SINGLE_SHARE = 0.6;

/**
 * @param {{id:string,x:number,y:number}[]} anchors houses that are on screen
 * @param {{phone:boolean, width:number, height:number, avoid?:object[], margin?:number}} view  margin tightens the limits (used when choosing a view)
 * @returns {{mode:'needles'|'flat', radius:number, units:object[], stats:{total:number, clusters:number, singles:number, maxNeedle:number}}}
 */
export function planPins(anchors, { phone, width, height, avoid = [], margin = 0 }) {
  const bounds = { width, height };
  let result = null;
  for (const { radius, needle } of phone ? LADDER.phone : LADDER.desktop) {
    const units = needle ? layoutPins(anchors, { radius, maxNeedle: needle, bounds, avoid }) : layoutFlat(anchors, { radius });
    const clusters = units.filter(u => u.ids.length > 1).length;
    const stats = { total: anchors.length, clusters, singles: units.length - clusters, maxNeedle: Math.max(0, ...units.map(u => Math.hypot(u.hx - u.ax, u.hy - u.ay) - (needle ? radius : 0))) };
    result = { mode: needle ? 'needles' : 'flat', radius, units, stats };
    if (clusters <= MAX_CLUSTERS - margin && stats.singles >= (MIN_SINGLE_SHARE + margin / 20) * stats.total) break;
  }
  return result;
}


/** Web-mercator screen position (MapLibre: 512 px tiles) of lng/lat for a camera. */
export function project({ lng, lat }, center, zoom, width, height) {
  const ws = 512 * 2 ** zoom, my = l => Math.log(Math.tan(Math.PI / 4 + (l * Math.PI) / 360));
  return { x: width / 2 + ((lng - center.lng) / 360) * ws, y: height / 2 - ((my(lat) - my(center.lat)) / (2 * Math.PI)) * ws };
}

/**
 * Where the map opens: the lowest zoom (from `fitZoom + 0.5` up) at which the densest block is shown with the largest pins, at most
 * MAX_CLUSTERS clusters and at least MIN_SINGLE_SHARE of the houses as individual pins (with a safety margin); centred on the densest block.
 * @param {{id:string,lat:number,lng:number}[]} houses located houses
 */
export function chooseDefaultView(houses, { fitZoom, width, height, avoid = [], maxZoom = 18, phone = true }) {
  const mean = { lng: houses.reduce((s, h) => s + h.lng, 0) / houses.length, lat: houses.reduce((s, h) => s + h.lat, 0) / houses.length };
  const safe = { left: 24, right: width - 24, top: 2 * (phone ? LADDER.phone : LADDER.desktop)[0].radius + 8, bottom: height - 16 };
  let fallback = null;
  for (let zoom = fitZoom + 0.5; zoom <= maxZoom + 1e-9; zoom += 0.25) {
    let best = null;
    for (const c of [mean, ...houses]) {
      const anchors = houses.map(h => ({ id: h.id, ...project(h, c, zoom, width, height) })).filter(a => a.x > safe.left && a.x < safe.right && a.y > safe.top && a.y < safe.bottom);
      const dist = Math.hypot(c.lng - mean.lng, c.lat - mean.lat);
      if (!best || anchors.length > best.anchors.length || (anchors.length === best.anchors.length && dist < best.dist)) best = { center: c, anchors, dist };
    }
    const plan = planPins(best.anchors, { phone, width, height, avoid, margin: 2 });
    fallback = { zoom, center: { lng: best.center.lng, lat: best.center.lat }, plan };
    if (plan.mode === 'needles') return fallback;   // the first (largest) pins already read cleanly
  }
  return fallback;
}
