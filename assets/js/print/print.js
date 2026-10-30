// Printable map page: pre-rendered base image + SVG overlay computed from the same snapshot as the live map.
import { loadSnapshots, siteRoot } from '../data.js';
import { configureIcons } from '../../../shared/icon-url.mjs';
import { renderSheet, setPaper, loadPrintMeta, drawLegend, paperOrDefault } from './sheet.js';
import { printPage, printBlockedReason, showPrintHelp } from './print-action.js';

const $ = selector => document.querySelector(selector);
const PDF_URL = () => new URL('assets/maps/redbird-trail-map-2026.pdf', siteRoot).href;

async function main() {
  const config = JSON.parse($('#event-config').textContent);
  configureIcons(config.apiBase);
  const message = text => { const el = $('#print-msg'); el.textContent = text; el.hidden = !text; $('#map-block').hidden = !!text; };
  const button = $('#print-button'), ready = $('#print-ready'), select = $('#paper'), include = $('#include-list'), help = $('#print-help');
  const params = new URLSearchParams(location.search);
  const paper = paperOrDefault(params.get('paper'));
  select.value = paper; include.checked = params.get('list') !== '0';
  const { bundled, livePromise } = await loadSnapshots({ snapshotPath: config.houses.path, apiBase: config.apiBase, eventId: 'halloween-2026', onLive: () => {} });
  const live = await livePromise;
  const snapshot = live && live.version > bundled.version ? live : bundled;
  const meta = await loadPrintMeta();
  const els = { block: $('#map-block'), img: $('#print-base'), overlay: $('#print-overlay'), legendList: $('#print-legend-list'), legendWrap: $('#print-legend'), version: $('#print-version') };

  let renderId = 0;
  async function render() {
    const id = ++renderId;
    button.disabled = true; ready.textContent = 'Preparing map…';
    const p = paperOrDefault(select.value);
    setPaper(p);
    message('');
    const result = await renderSheet(els, { snapshot, meta, paper: p, includeList: include.checked });
    if (id !== renderId) return; // a newer paper choice is rendering
    if (!result.ok) {
      message(result.reason === 'extent' ? 'The print map is being updated. Please check back soon.' : 'The print map image could not load. Please try again.');
      ready.textContent = 'Print map unavailable'; return;
    }
    document.body.dataset.markers = String(result.count);
    ready.textContent = 'Map ready ✓'; button.disabled = false;
  }
  try { // tell people when the downloadable flyer is older than this live list
    const flyer = await (await fetch(new URL('data/flyer-houses.json', siteRoot))).json();
    const newer = snapshot.houses.filter(h => !flyer.ids.includes(h.id)).length;
    if (newer) { const note = $('#print-newer'); note.textContent = `This is the latest map. The downloadable trail map flyer (made ${flyer.madeOn}) does not include ${newer === 1 ? '1 newer house' : `${newer} newer houses`}.`; note.hidden = false; }
  } catch { /* optional hint */ }
  select.addEventListener('change', render);
  include.addEventListener('change', () => drawLegend(els.legendList, els.legendWrap, snapshot, include.checked));
  button.addEventListener('click', () => printPage({ help, pdfUrl: PDF_URL() }));
  const blocked = printBlockedReason();
  if (blocked) showPrintHelp(help, blocked, { pdfUrl: PDF_URL() }); // say so up front instead of after a dead tap
  await render();
}

main().catch(error => { console.error(error); const el = $('#print-msg'); if (el) { el.textContent = 'Something went wrong preparing the print map. Please refresh.'; el.hidden = false; } });
