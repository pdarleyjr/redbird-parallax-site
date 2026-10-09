import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { eventLabels, localAsset, registrationURL } from '../assets/js/content.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function buildPage(event) {
  const labels = eventLabels(event);
  const config = structuredClone(event);
  const published = event.map?.status === 'published';
  const image = localAsset(event.map?.image);
  const pdf = localAsset(event.map?.pdf);
  let mapActions = '', mapFigure = '', footerMap = '<a href="#map">Trail map</a>';
  if (published) {
    if (!image || !event.map.width || !event.map.height) throw new Error('Published map requires a local image and dimensions.');
    await access(path.join(root, image));
    if (pdf) await access(path.join(root, pdf));
    const previews = event.map.previews || [];
    for (const preview of previews) {
      if (!localAsset(preview.path) || !Number.isInteger(preview.width)) throw new Error('Invalid map preview.');
      await access(path.join(root, preview.path));
    }
    const srcset = previews.map(p => `${p.path} ${p.width}w`).join(', ');
    const preview = previews.at(-1)?.path || image;
    mapActions = `<div id="map-actions" class="map-actions"><a class="button button-primary" href="${escapeHTML(image)}" target="_blank" rel="noopener" data-map-file>View full map <span aria-hidden="true">↗</span><span class="sr-only"> (opens a new tab)</span></a><a class="button button-secondary" href="${escapeHTML(image)}" download="redbird-trail-${event.year}.png" data-map-file>Download map (PNG)</a>${pdf ? `<a class="text-link" href="${escapeHTML(pdf)}" target="_blank" rel="noopener" data-map-file>Open printable PDF <span aria-hidden="true">&nbsp;↗</span><span class="sr-only"> (opens a new tab)</span></a>` : ''}</div>`;
    mapFigure = `<figure class="map-figure"><a href="${escapeHTML(image)}" target="_blank" rel="noopener" aria-label="Open the full-resolution ${event.year} trail map in a new tab"><picture>${srcset ? `<source type="image/webp" srcset="${escapeHTML(srcset)}" sizes="(max-width: 699px) calc(100vw - 48px), 560px">` : ''}<img id="map-preview" src="${escapeHTML(preview)}" alt="Red Bird ${event.year} Halloween trail map with numbered stops and a house directory. Open the full map to read street labels and addresses." width="${event.map.width}" height="${event.map.height}" loading="lazy" decoding="async"></picture></a><figcaption>The organizer’s ${event.year} map. Tap to open at full resolution.</figcaption></figure>`;
    footerMap = `<a href="${escapeHTML(image)}" target="_blank" rel="noopener" data-direct-map data-map-file>Full trail map<span class="sr-only"> (opens a new tab)</span></a>`;
  } else { config.map = { status: 'pending' }; }
  const registration = registrationURL(event.registration);
  if (event.registration?.status === 'confirmed' && !registration) throw new Error('Confirmed registration requires a valid HTTPS URL.');
  if (!registration) config.registration = { status: 'pending', url: null };
  const values = {
    ...event, ...labels, updated: event.updated,
    mapActions, mapFigure, mapEmptyHidden: published ? 'hidden' : '', footerMap,
    registrationAction: registration ? `<p><a class="text-link" href="${escapeHTML(registration)}" target="_blank" rel="noopener">Register your house<span class="sr-only"> (opens a new tab)</span></a></p>` : '',
    eventJSON: JSON.stringify(config).replace(/</g, '\\u003c')
  };
  const markupKeys = new Set(['mapActions','mapFigure','mapEmptyHidden','footerMap','registrationAction','eventJSON']);
  return (await readFile(path.join(root,'scripts/page.html'),'utf8')).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown page value: ${key}`);
    return markupKeys.has(key) ? values[key] : escapeHTML(values[key]);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(await readFile(path.join(root,'data/event-2026.json'),'utf8'));
  const html = await buildPage(event);
  const index = path.join(root,'index.html');
  if (process.argv.includes('--check')) {
    if (html !== await readFile(index,'utf8')) throw new Error('index.html is stale. Run npm run build.');
    console.log('Generated page matches event configuration.');
  } else {
    await writeFile(index,html);
    console.log(`Built ${event.name} ${event.year}.`);
  }
}
