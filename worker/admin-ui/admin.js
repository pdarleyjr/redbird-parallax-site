import { api, notify, guarded } from './lib.js';
import { renderHouses } from './houses.js';
import { renderImport } from './import.js';
import { renderVersions, renderEvents, renderActivity } from './misc.js';

const VIEWS = { houses: renderHouses, import: renderImport, versions: renderVersions, events: renderEvents, activity: renderActivity };
const view = document.querySelector('#view');

async function show(tab) {
  notify('');
  for (const b of document.querySelectorAll('#tabs button')) b.toggleAttribute('aria-current', b.dataset.tab === tab), b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  history.replaceState(null, '', `#${tab}`);
  await guarded(() => VIEWS[tab](view));
}

document.querySelector('#tabs').addEventListener('click', event => { const b = event.target.closest('button[data-tab]'); if (b) show(b.dataset.tab); });
const me = await guarded(() => api('/api/me'));
if (me) {
  document.querySelector('#who').textContent = me.email;
  await show(VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'houses');
}
