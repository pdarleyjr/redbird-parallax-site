// Trail map flyer page: download (cached for offline), print, and a hint when the live list is newer than the flyer.
import { loadSnapshots, siteRoot } from './data.js';
import { initPwa } from './pwa.js';
import { printPage } from './print/print-action.js';

initPwa();
const $ = selector => document.querySelector(selector);

$('#tm-print').addEventListener('click', () => printPage({ help: $('#tm-print-help'), pdfUrl: $('#tm-pdf').href }));

// Fetch the PDF through the page (so the service worker caches it for offline) and save it; fall back to the plain link.
$('#tm-pdf').addEventListener('click', async event => {
  const link = event.currentTarget;
  event.preventDefault();
  try {
    const response = await fetch(link.href);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement('a');
    a.href = url; a.download = link.getAttribute('download') || 'trail-map.pdf';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch {
    window.location.assign(link.href);
  }
});

async function hintIfNewer() {
  const config = JSON.parse($('#event-config').textContent);
  try {
    const [flyer, { bundled, livePromise }] = await Promise.all([
      fetch(new URL('data/flyer-houses.json', siteRoot)).then(r => r.json()),
      loadSnapshots({ snapshotPath: config.houses.path, apiBase: config.apiBase, eventId: 'halloween-2026', onLive: () => {} })
    ]);
    const live = await livePromise;
    const snapshot = live && live.version > bundled.version ? live : bundled;
    const missing = snapshot.houses.filter(h => !flyer.ids.includes(h.id));
    if (missing.length) {
      const hint = $('#tm-hint');
      hint.textContent = `This flyer was made on ${flyer.madeOn} and does not include ${missing.length === 1 ? '1 newer house' : `${missing.length} newer houses`}. Use “Print latest map” for the current list.`;
      hint.hidden = false;
    }
  } catch { /* the flyer still works without the hint */ }
}
hintIfNewer();
