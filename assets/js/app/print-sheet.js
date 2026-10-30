// The Halloween app's print-only sheet. Printing the app (the Print map button, Ctrl/Cmd+P, or Share → Print)
// prints the same light, numbered map as /halloween/print/ instead of a screenshot of the dark app.
import { renderSheet, setPaper, loadPrintMeta } from '../print/sheet.js';
import { printPage } from '../print/print-action.js';
import { siteRoot } from '../data.js';

const $ = selector => document.querySelector(selector);
const PAPER = 'letter-portrait';

export function initAppPrint({ getSnapshot }) {
  const els = { block: $('#ap-block'), img: $('#ap-base'), overlay: $('#ap-overlay'), legendList: $('#ap-legend-list'), legendWrap: $('#ap-legend'), version: $('#ap-version') };
  if (!els.block) return { refresh() {} };
  let pending = null;
  const prepare = () => {
    pending ||= loadPrintMeta().then(meta => { setPaper(PAPER); return renderSheet(els, { snapshot: getSnapshot(), meta, paper: PAPER }); })
      .catch(error => { console.warn('print sheet', error); pending = null; return { ok: false, reason: 'error' }; });
    return pending;
  };
  // Build it once the page is quiet so a browser-menu print already has the map; the base image is precached for offline.
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 4000));
  const warm = () => idle(() => prepare(), { timeout: 10000 });
  if (document.readyState === 'complete') warm(); else addEventListener('load', warm, { once: true });
  addEventListener('beforeprint', () => { prepare(); });

  const button = $('#print-map'), help = $('#app-print-help');
  button?.addEventListener('click', async () => {
    const label = button.textContent;
    button.disabled = true; button.textContent = 'Preparing…';
    const result = await prepare();
    button.disabled = false; button.textContent = label;
    const pdfUrl = new URL('assets/maps/redbird-trail-map-2026.pdf', siteRoot).href;
    const url = new URL('halloween/print/', siteRoot).href;
    if (!result.ok) { location.assign(url); return; } // fall back to the dedicated print page
    printPage({ help, url, pdfUrl });
  });
  help?.addEventListener('click', event => { if (event.target === help) help.hidden = true; });
  return { refresh() { pending = null; if (document.readyState === 'complete') warm(); } };
}
