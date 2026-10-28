// HTML fragments generated at build time from data (all text escaped).
import { escapeHTML as e } from './template.mjs';
import { eventLabels, localAsset } from '../../assets/js/content.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function houseCountText(snapshot) {
  const n = snapshot.houses.length;
  return `${plural(n, 'house')} on the trail`;
}

/** One compact row per house (the no-JavaScript list; the page script rebuilds identical rows with buttons and visited boxes). */
export function houseRowsHTML(houses, root) {
  return houses.map(h => {
    const located = h.location !== 'none';
    return `        <li class="hrow house-card" id="house-${e(h.id)}" data-id="${e(h.id)}" data-n="${h.mapNumber}"><div class="hr-main"><span class="hr-art"><img src="${e(root)}assets/img/markers/${e(h.icon)}.webp" alt="" width="40" height="40" loading="lazy" decoding="async"><span class="hr-n"><span class="sr-only">Stop </span>${h.mapNumber}</span></span><span class="hr-t"><b>${e(h.name)}</b><small>${e(h.address)}${located ? '' : ' · map location coming soon'}</small></span></div></li>`;
  }).join('\n');
}

function picture(root, base, widths, sizes, fallback) {
  const srcset = widths.map(w => `${root}${base}-${w}.webp ${w}w`).join(', ');
  return `<picture><source type="image/webp" srcset="${e(srcset)}" sizes="${e(sizes)}"><img src="${e(root + fallback)}" alt="" width="1536" height="1024" loading="lazy" decoding="async"></picture>`;
}

const HERO = (root, priority) => `<picture><source type="image/webp" srcset="${e(root)}assets/img/optimized/hero-600.webp 600w, ${e(root)}assets/img/optimized/hero-720.webp 720w, ${e(root)}assets/img/optimized/hero-960.webp 960w, ${e(root)}assets/img/optimized/hero-1536.webp 1536w" sizes="(max-width: 760px) 340px, 720px"><img src="${e(root)}assets/img/optimized/hero.jpg" alt="" width="1536" height="1024" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;

function eventMeta(ev) {
  if (!ev.date) return '';
  const labels = eventLabels({ year: ev.year, date: ev.date, timeZone: ev.timeZone || 'America/New_York', hours: { status: ev.start ? 'confirmed' : 'pending', start: ev.start, end: ev.end } });
  return `${labels.fullDate}${ev.start ? ` · ${labels.hours}` : ''}`;
}

/** A live status chip ("In 3 days", "Happening now", "Ended"); the page script keeps the text current, the build gives a fixed fallback. */
function statusChip(ev) {
  if (!ev.date || !ev.start) return '';
  const fallback = new Date(`${ev.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).replace(',', '');
  return `<span class="status-chip" data-status data-date="${e(ev.date)}" data-start="${e(ev.start)}" data-end="${e(ev.end)}" data-tz="${e(ev.timeZone || 'America/New_York')}">${e(fallback)}</span>`;
}

/** Cards from the events registry. live: optional map of eventId -> {houses} counts. */
export function cardsHTML(events, root, counts = {}) {
  const cards = [];
  for (const ev of events) {
    if (ev.status === 'draft') continue;
    const art = ev.kind === 'christmas'
      ? picture(root, 'assets/img/christmas/holiday-trail', [600, 960, 1440], '(max-width: 959px) calc(100vw - 32px), 590px', 'assets/img/christmas/holiday-trail-960.webp')
      : HERO(root, ev.kind === 'halloween');
    const kindLabel = ev.kind === 'christmas' ? 'Christmas' : 'Halloween';
    if (ev.status === 'updating') {
      cards.push(`          <article class="event-card is-updating is-compact" data-event="${e(ev.id)}" aria-labelledby="${e(ev.id)}-title" aria-describedby="${e(ev.id)}-status">${art}<span class="card-badge" id="${e(ev.id)}-status">Updating for this year's event<span class="sr-only"> (not yet available)</span></span><div class="card-body"><p class="card-eyebrow muted">${kindLabel}</p><h2 class="card-title" id="${e(ev.id)}-title">${e(ev.title)}</h2><p class="card-meta">Details for this year’s holiday trail will be posted here.</p></div></article>`);
      continue;
    }
    const ended = ev.status === 'archived';
    const count = counts[ev.id] ? `<p class="card-count">${e(counts[ev.id])}</p>` : '';
    const cta = ended ? 'See the trail' : 'Explore the trail →';
    cards.push(`          <a class="event-card neon is-primary" href="${e(root + ev.slug)}/" data-event="${e(ev.id)}">${art}${ended ? '<span class="card-badge">This year’s trail has ended</span>' : ''}<div class="card-body">${statusChip(ev)}<p class="card-eyebrow">${kindLabel}</p><h2 class="card-title">${e(ev.title)}</h2><p class="card-meta">${e(eventMeta(ev))}</p>${count}<span class="button button-primary card-cta">${cta}</span></div></a>`);
  }
  return cards.join('\n');
}
