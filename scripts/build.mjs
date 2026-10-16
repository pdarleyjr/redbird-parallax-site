import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { eventLabels, localAsset, registrationURL } from '../assets/js/content.js';
import { assertSnapshot } from '../shared/snapshot-schema.mjs';
import { render, escapeHTML, jsonForScript } from './lib/template.mjs';
import { cardsHTML, houseCardsHTML, mapListHTML, houseCountText, archiveHTML } from './lib/fragments.mjs';
import { readTokens } from './map/build-style.mjs';
import { buildManifest } from './lib/manifest.mjs';
import { buildServiceWorker } from './lib/sw.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export { escapeHTML };
const templates = path.join(root, 'templates');
const readJSON = async rel => JSON.parse(await readFile(path.join(root, rel), 'utf8'));

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full, base)); else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

const TEXT_EXT = /\.(js|mjs|css|json|svg|html|webmanifest|geojson|txt)$/;
/** Strip CR so the hash is identical on Windows and Linux checkouts. */
export const stableBytes = (file, buf) => (TEXT_EXT.test(file) ? Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n')) : buf);

/** Hash of application code and assets (not data) — used for cache-busting and the service worker version. */
export async function appHash() {
  const hash = createHash('sha256');
  for (const dir of ['assets/css', 'assets/js', 'shared', 'assets/vendor', 'assets/fonts', 'assets/app', 'assets/img/markers', 'assets/img/optimized', 'assets/img/christmas', 'assets/img/trail']) {
    let files = [];
    try { files = await walk(path.join(root, dir)); } catch { continue; }
    for (const file of files) {
      if (file === 'legacy-redirect.js') continue;
      hash.update(`${dir}/${file}\0`).update(stableBytes(file, await readFile(path.join(root, dir, file))));
    }
  }
  return hash.digest('hex');
}

function csp(site) {
  const api = site.api?.publicBase ? ` ${new URL(site.api.publicBase).origin}` : '';
  return `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:; connect-src 'self'${api}; base-uri 'none'; form-action 'none'`;
}

const cssLinks = (root, files, v) => files.map(f => `  <link rel="stylesheet" href="${root}assets/css/${f}.css${v}">`).join('\n');
const footerNav = (root, items) => items.map(([href, label]) => `<a href="${href.startsWith('#') ? href : root + href}">${label}</a>`).join('');

export async function loadInputs() {
  const [site, event, rawSnapshot, tokens] = await Promise.all([
    readJSON('data/site.json'), readJSON('data/events/halloween-2026.json'), readJSON('data/halloween-2026.public.json'), readTokens()
  ]);
  return { site, event, snapshot: assertSnapshot(rawSnapshot), tokens };
}

function pageBase(inputs, page, extra) {
  const { site, tokens } = inputs;
  const version = `?v=${page.hash.slice(0, 8)}`;
  return {
    root: page.root, title: page.title, description: page.description, themeColor: tokens['rb-sky'],
    canonical: new URL(page.path, site.origin).href, ogImage: new URL('assets/img/optimized/hero.jpg', site.origin).href,
    ogImageAlt: 'Red Bird children in Halloween costumes with a cardinal and glowing pumpkins.',
    swFlag: site.features?.serviceWorker ? 'on' : 'off', csp: csp(site), assetVersion: version, cssLinksHTML: cssLinks(page.root, page.css, version),
    footerNavHTML: footerNav(page.root, page.nav), footerNote: page.footerNote, year: String(inputs.event.year), ...extra
  };
}

export async function buildHalloween(inputs, hash, rootPrefix = '../') {
  const { event, snapshot, site } = inputs;
  const labels = eventLabels(event);
  const config = structuredClone(event);
  const published = event.map?.status === 'published';
  if (published) {
    const image = localAsset(event.map.image);
    if (!image || !event.map.width || !event.map.height) throw new Error('Published map requires a local image and dimensions.');
    await access(path.join(root, image));
    if (localAsset(event.map.pdf)) await access(path.join(root, event.map.pdf));
    for (const p of event.map.previews || []) { if (!localAsset(p.path) || !Number.isInteger(p.width)) throw new Error('Invalid map preview.'); await access(path.join(root, p.path)); }
  } else config.map = { status: 'pending' };
  const registration = registrationURL(event.registration);
  if (event.registration?.status === 'confirmed' && !registration) throw new Error('Confirmed registration requires a valid HTTPS URL.');
  if (!registration) config.registration = { status: 'pending', url: null };
  const base = pageBase(inputs, {
    root: rootPrefix, hash, path: 'halloween/', title: `${event.name} ${event.year}`,
    description: `Halloween with your neighbors. Join the Red Bird Trick-or-Treat Trail on ${labels.fullDate}. Find your stops on the interactive map, see the nearest house, or print the trail map.`,
    css: ['tokens', 'base', 'halloween', 'map'],
    nav: [['', 'Holiday Trails'], ['#what-to-expect', 'Event details'], ['#featured-houses', 'Participating houses'], ['halloween/print/', 'Print the map']],
    footerNote: 'Map data © OpenStreetMap contributors · Protomaps. Icons: Microsoft Fluent Emoji (MIT license) and Red Bird artwork. Original organizer map: Miami-Dade County GIS.'
  });
  const html = await render(templates, 'halloween.html', {
    ...base, ...event, ...labels, updated: event.updated, canonical: base.canonical,
    mapListHTML: mapListHTML(snapshot.houses), houseListHTML: houseCardsHTML(snapshot.houses, rootPrefix),
    houseCountText: houseCountText(snapshot), snapshotVersion: String(snapshot.version), archiveHTML: archiveHTML(event, rootPrefix),
    registrationActionHTML: registration ? `<p><a class="text-link" href="${escapeHTML(registration)}" target="_blank" rel="noopener">Register your house<span class="sr-only"> (opens a new tab)</span></a></p>` : '',
    eventJSON: jsonForScript({ ...config, apiBase: site.api?.publicBase || null })
  });
  return html;
}

/** Back-compat helper used by tests: render the Halloween page for a given event config. */
export async function buildPage(event, overrides = {}) {
  const inputs = { ...(await loadInputs()), event, ...overrides };
  return buildHalloween(inputs, await appHash());
}

export async function buildAll() {
  const inputs = await loadInputs();
  const { site, snapshot, event } = inputs;
  const hash = await appHash();
  const outputs = new Map();
  const counts = { [snapshot.eventId]: houseCountText(snapshot) };
  const homeNav = [['halloween/', 'Halloween trail'], ['christmas/', 'Christmas trail'], ['halloween/print/', 'Print the Halloween map']];
  const home = pageBase(inputs, { root: '', hash, path: '', title: 'Red Bird Neighborhood Holiday Trails', description: 'Two neighborhood trails, one Red Bird. Explore the Halloween Trick-or-Treat Trail map, nearby houses and more.', css: ['tokens', 'base', 'home'], nav: homeNav, footerNote: 'A neighborhood project. No ads, no tracking. Icons: Microsoft Fluent Emoji (MIT license).' });
  outputs.set('index.html', await render(templates, 'home.html', { ...home, cardsHTML: cardsHTML(site.events, '', counts), siteJSON: jsonForScript({ events: site.events, apiBase: site.api?.publicBase || null }) }));
  const halloween = await buildHalloween(inputs, hash);
  outputs.set('halloween/index.html', halloween);

  const labels = eventLabels(event);
  const printBase = pageBase(inputs, { root: '../../', hash, path: 'halloween/print/', title: `Print the ${event.name} map`, description: 'A printable map of the Red Bird Trick-or-Treat Trail with a numbered house list.', css: ['tokens', 'base', 'print'], nav: [['', 'Holiday Trails'], ['halloween/', 'Halloween trail']], footerNote: 'Map data © OpenStreetMap contributors · Protomaps.' });
  outputs.set('halloween/print/index.html', await render(templates, 'print.html', { ...printBase, ...labels, eventJSON: jsonForScript({ ...event, apiBase: site.api?.publicBase || null }) }));

  const xmas = pageBase(inputs, { root: '../', hash, path: 'christmas/', title: 'Red Bird Neighborhood Holiday Trail', description: 'Details for this year’s Red Bird holiday trail will be posted here.', css: ['tokens', 'base', 'home'], nav: [['', 'Holiday Trails'], ['halloween/', 'Halloween trail']], footerNote: 'A neighborhood project. No ads, no tracking.' });
  outputs.set('christmas/index.html', await render(templates, 'christmas.html', { ...xmas, siteJSON: jsonForScript({ events: site.events, apiBase: site.api?.publicBase || null }) }));

  const abs = new URL(site.origin).pathname;
  for (const [file, tpl, title] of [['404.html', '404.html', 'Page not found'], ['offline.html', 'offline.html', 'You’re offline']]) {
    const base = pageBase(inputs, { root: abs, hash, path: file, title: `${title} · Red Bird Trails`, description: 'Red Bird Neighborhood Holiday Trails.', css: ['tokens', 'base', 'home'], nav: [['', 'Holiday Trails']], footerNote: '' });
    outputs.set(file, await render(templates, tpl, base));
  }

  const ids = [...halloween.matchAll(/\sid="([a-zA-Z][\w-]*)"/g)].map(m => m[1]).filter(id => !id.startsWith('house-') || id === 'house-list' || id === 'house-search');
  outputs.set('assets/js/legacy-redirect.js', `// GENERATED by scripts/build.mjs: old QR codes and bookmarks to /#section move to /halloween/#section.\n(function(){var ids=${JSON.stringify([...new Set(ids)])},h=location.hash.slice(1);if(h&&(ids.indexOf(h)>-1||/^house-stop-\\d+$/.test(h)))location.replace('halloween/'+location.search+location.hash)})();\n`);
  outputs.set('manifest.webmanifest', JSON.stringify(buildManifest(inputs), null, 2) + '\n');
  outputs.set('sw.js', await buildServiceWorker({ root, outputs, hash, site, snapshot }));
  return outputs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputs = await buildAll();
  const check = process.argv.includes('--check');
  const stale = [];
  for (const [rel, content] of outputs) {
    const file = path.join(root, rel);
    if (check) {
      let current = null;
      try { current = await readFile(file, 'utf8'); } catch { /* missing */ }
      if (current !== content) stale.push(rel);
    } else { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content); }
  }
  if (check) {
    if (stale.length) throw new Error(`Generated files are stale: ${stale.join(', ')}. Run npm run build.`);
    console.log(`All ${outputs.size} generated files match their sources.`);
  } else console.log(`Built ${outputs.size} files.`);
}
