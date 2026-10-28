// "In 3 days" / "Today · 6 PM" / "Happening now" / "Ended" for an event, in the event's own time zone.
const wallParts = (ms, tz) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
};
const wallAsUTC = (ms, tz) => { const w = wallParts(ms, tz); return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s); };

/** The instant (ms since epoch) at which the wall clock in `tz` reads dateStr (YYYY-MM-DD) and timeStr (HH:MM). */
export function zonedInstant(dateStr, timeStr, tz = 'America/New_York') {
  const [y, mo, d] = dateStr.split('-').map(Number), [h, mi] = timeStr.split(':').map(Number);
  const target = Date.UTC(y, mo - 1, d, h, mi);
  let t = target;
  for (let i = 0; i < 3; i++) t = target - (wallAsUTC(t, tz) - t);   // t = target minus the zone's offset at t; settles in two steps
  return t;
}

/** @param {{date:string,start:string,end:string,tz?:string}} event  @param {number} now ms @returns {{kind:'upcoming'|'live'|'ended', label:string}} */
export function eventStatus({ date, start, end, tz = 'America/New_York' }, now = Date.now()) {
  const from = zonedInstant(date, start, tz), to = zonedInstant(date, end, tz);
  if (now >= to) return { kind: 'ended', label: 'Ended' };
  if (now >= from) return { kind: 'live', label: 'Happening now' };
  const w = wallParts(now, tz), [y, mo, d] = date.split('-').map(Number);
  const days = Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(w.y, w.mo - 1, w.d)) / 864e5);
  const [h] = start.split(':').map(Number);
  const hour = `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
  return { kind: 'upcoming', label: days <= 0 ? `Today · ${hour}` : days === 1 ? `Tomorrow · ${hour}` : `In ${days} days` };
}
