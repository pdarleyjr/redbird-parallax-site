// HTML fragments generated at build time from data (all text escaped).
import { escapeHTML as e } from './template.mjs';
import { eventLabels, localAsset } from '../../assets/js/content.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function houseCountText(snapshot) {
  const n = snapshot.houses.length;
  return `${plural(n, 'house')} on the trail`;
}

export function houseCardsHTML(houses, root) {
  return houses.map(h => {
    const located = h.location !== 'none';
    const art = `<img src="${e(root)}assets/img/markers/${e(h.icon)}.webp" alt="" width="80" height="80" loading="lazy" decoding="async">`;
    return `        <li class="house-card" id="house-${e(h.id)}" data-id="${e(h.id)}" data-n="${h.mapNumber}"><div class="house-main"><div class="house-art">${art}<span class="stop-number" aria-label="Map stop ${h.mapNumber}">${h.mapNumber}</span></div><div><h3>${e(h.name)}</h3><p>${e(h.address)}</p>${located ? '' : '<p class="muted">Map location coming soon</p>'}</div></div><div class="house-actions" hidden>${located ? `<button type="button" data-show>Show on map<span class="sr-only"> for ${e(h.name)}</span></button>` : ''}<label><input type="checkbox" data-visited aria-label="Mark ${e(h.name)} visited"> Visited</label></div></li>`;
  }).join('\n');
}

export function mapListHTML(houses) {
  return houses.map(h => {
    const located = h.location !== 'none';
    return `<li><button type="button" data-id="${e(h.id)}"><span class="n${located ? '' : ' none'}" aria-hidden="true">${h.mapNumber}</span><span class="t"><span class="sr-only">Stop ${h.mapNumber}: </span>${e(h.name)}<small>${located ? e(h.address) : 'Map location coming soon'}</small></span></button></li>`;
  }).join('');
}

function picture(root, base, widths, sizes, fallback) {
  const srcset = widths.map(w => `${root}${base}-${w}.webp ${w}w`).join(', ');
  return `<picture><source type="image/webp" srcset="${e(srcset)}" sizes="${e(sizes)}"><img src="${e(root + fallback)}" alt="" width="1536" height="1024" loading="lazy" decoding="async"></picture>`;
}

const HERO = (root, priority) => `<picture><source type="image/webp" srcset="${e(root)}assets/img/optimized/hero-600.webp 600w, ${e(root)}assets/img/optimized/hero-720.webp 720w, ${e(root)}assets/img/optimized/hero-960.webp 960w, ${e(root)}assets/img/optimized/hero-1536.webp 1536w" sizes="(max-width: 959px) calc(100vw - 32px), 590px"><img src="${e(root)}assets/img/optimized/hero.jpg" alt="" width="1536" height="1024" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;

function eventMeta(ev) {
  if (!ev.date) return '';
  const labels = eventLabels({ year: ev.year, date: ev.date, timeZone: ev.timeZone || 'America/New_York', hours: { status: ev.start ? 'confirmed' : 'pending', start: ev.start, end: ev.end } });
  return `${labels.fullDate}${ev.start ? ` · ${labels.hours}` : ''}`;
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
      cards.push(`          <article class="event-card is-updating" data-event="${e(ev.id)}" aria-labelledby="${e(ev.id)}-title" aria-describedby="${e(ev.id)}-status">${art}<span class="card-badge" id="${e(ev.id)}-status">Updating for this year's event<span class="sr-only"> (not yet available)</span></span><div class="card-body"><p class="card-eyebrow muted">${kindLabel}</p><h2 class="card-title" id="${e(ev.id)}-title">${e(ev.title)}</h2><p class="card-meta">Details for this year’s holiday trail will be posted here.</p></div></article>`);
      continue;
    }
    const ended = ev.status === 'archived';
    const count = counts[ev.id] ? `<p class="card-count">${e(counts[ev.id])}</p>` : '';
    const cta = ended ? 'See the trail' : 'Explore the trail →';
    cards.push(`          <a class="event-card neon" href="${e(root + ev.slug)}/" data-event="${e(ev.id)}">${art}${ended ? '<span class="card-badge">This year’s trail has ended</span>' : ''}<div class="card-body"><p class="card-eyebrow">${kindLabel}</p><h2 class="card-title">${e(ev.title)}</h2><p class="card-meta">${e(eventMeta(ev))}</p>${count}<span class="button button-primary card-cta">${cta}</span></div></a>`);
  }
  return cards.join('\n');
}

export function archiveHTML(event, root) {
  const image = localAsset(event.map?.image), pdf = localAsset(event.map?.pdf);
  if (event.map?.status !== 'published' || !image) return '          <p class="map-note">The original organizer map is not available.</p>';
  const previews = event.map.previews || [];
  const srcset = previews.map(p => `${root}${p.path} ${p.width}w`).join(', ');
  const preview = previews.at(-1)?.path || image;
  return `          <p class="map-note">This printed map shows the first ${event.year} houses only and is superseded by the interactive map above. New houses are listed in the directory below.</p>
          <div class="map-actions"><a class="button button-secondary" href="${e(root + image)}" target="_blank" rel="noopener" data-map-file>View full map <span aria-hidden="true">↗</span><span class="sr-only"> (opens a new tab)</span></a>${pdf ? `<a class="button button-secondary" href="${e(root + pdf)}" target="_blank" rel="noopener" data-map-file>Open printable PDF <span aria-hidden="true">↗</span><span class="sr-only"> (opens a new tab)</span></a>` : ''}</div>
          <figure class="map-figure"><picture>${srcset ? `<source type="image/webp" srcset="${e(srcset)}" sizes="480px">` : ''}<img src="${e(root + preview)}" alt="The organizer’s October 9 trail map with the first 31 numbered stops. Open the full map to read street labels." width="${event.map.width}" height="${event.map.height}" loading="lazy" decoding="async"></picture><figcaption>The organizer’s original ${event.year} map. Out of date: use the interactive map above.</figcaption></figure>`;
}
