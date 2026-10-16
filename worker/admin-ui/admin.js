import { h, api, notify, guarded } from './lib.js';
import { renderHouses } from './houses.js';
import { renderImport } from './import.js';
import { renderVersions, renderEvents, renderActivity } from './misc.js';

const VIEWS = { houses: renderHouses, import: renderImport, versions: renderVersions, events: renderEvents, activity: renderActivity };
const view = document.querySelector('#view');
const tabs = document.querySelector('#tabs');
const who = document.querySelector('#who');

// Sign-in is handled by Cloudflare Access in front of this page. If a call is refused, ask for a reload (which re-runs Access).
function showBlocked(message) {
  tabs.hidden = true; who.replaceChildren();
  view.replaceChildren(h('section', { class: 'login' }, h('h2', {}, 'Sign-in needed'), h('p', { role: 'alert' }, message),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'primary', onClick: () => location.reload() }, 'Reload and sign in'))));
}

async function show(tab) {
  notify('');
  for (const b of tabs.querySelectorAll('button[data-tab]')) b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  history.replaceState(null, '', `#${tab}`);
  await guarded(() => VIEWS[tab](view));
}

async function start() {
  let me;
  try { me = await api('/api/me'); } catch (error) { showBlocked(error.status === 403 ? 'This account is not allowed to use the admin.' : error.message); return; }
  tabs.hidden = false;
  who.replaceChildren(h('span', {}, me.email, ' '), h('a', { href: '/cdn-cgi/access/logout' }, 'Sign out'));
  await show(VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'houses');
}

tabs.addEventListener('click', event => { const b = event.target.closest('button[data-tab]'); if (b) show(b.dataset.tab); });
document.addEventListener('rb:signed-out', () => showBlocked('Your sign-in expired. Reload to sign in again.'));
await start();
